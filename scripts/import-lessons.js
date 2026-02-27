#!/usr/bin/env node
/**
 * import-lessons.js — bulk-loads courses and lessons (modules) from a CSV.
 *
 * Usage:
 *   node scripts/import-lessons.js <path-to-csv>
 *   npm run lessons:import -- lessons.csv
 *
 * CSV columns (see lessons-template.csv for a ready-to-fill example):
 *   course_code        — short unique identifier used in /enroll  (e.g. SAFETY101)
 *   course_title       — human-readable course name
 *   course_description — one-paragraph course summary
 *   lesson_number      — positive integer; order within the course (1, 2, 3 …)
 *   lesson_title       — lesson heading sent to learners via Slack
 *   lesson_content     — full lesson body text sent to learners via Slack
 *   tags               — OPTIONAL: pipe-separated labels  (e.g. compliance|onboarding)
 *
 * Re-running is safe: rows with the same (course_code, lesson_number) are
 * updated in place; nothing is duplicated.  The whole import runs inside a
 * single transaction — any error rolls everything back.
 */

'use strict';

require('dotenv').config();

const fs   = require('fs');
const path = require('path');
const { Pool } = require('pg');

// ── CLI argument ──────────────────────────────────────────────────────────────
const [, , csvArg] = process.argv;
if (!csvArg) {
  console.error('Usage: node scripts/import-lessons.js <path-to-csv>');
  console.error('       npm run lessons:import -- lessons.csv');
  process.exit(1);
}

const csvPath = path.resolve(csvArg);
if (!fs.existsSync(csvPath)) {
  console.error(`File not found: ${csvPath}`);
  process.exit(1);
}

// ── Minimal RFC-4180 CSV parser (no extra dependencies) ──────────────────────
function parseCSV(raw) {
  const rows   = [];
  const lines  = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  for (const line of lines) {
    if (!line.trim()) continue;

    const fields   = [];
    let   field    = '';
    let   inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        fields.push(field);
        field = '';
      } else {
        field += ch;
      }
    }
    fields.push(field);
    rows.push(fields);
  }
  return rows;
}

// ── Main ──────────────────────────────────────────────────────────────────────
const REQUIRED_COLS = [
  'course_code', 'course_title', 'course_description',
  'lesson_number', 'lesson_title', 'lesson_content',
];

async function main() {
  // ── Parse CSV ──────────────────────────────────────────────────────────────
  const raw              = fs.readFileSync(csvPath, 'utf8');
  const [headerRow, ...dataRows] = parseCSV(raw);
  const headers          = headerRow.map(h => h.trim().toLowerCase());

  const missing = REQUIRED_COLS.filter(c => !headers.includes(c));
  if (missing.length) {
    console.error(`Missing required columns: ${missing.join(', ')}`);
    console.error(`Required: ${REQUIRED_COLS.join(', ')},  optional: tags`);
    process.exit(1);
  }

  const col = name => headers.indexOf(name);

  const rows = dataRows
    .filter(r => r.length >= REQUIRED_COLS.length && r[col('course_code')].trim())
    .map(r => ({
      course_code:    r[col('course_code')].trim(),
      course_title:   r[col('course_title')].trim(),
      course_desc:    r[col('course_description')].trim(),
      lesson_number:  parseInt(r[col('lesson_number')].trim(), 10),
      lesson_title:   r[col('lesson_title')].trim(),
      lesson_content: r[col('lesson_content')].trim(),
      tags:           col('tags') >= 0
                        ? r[col('tags')].split('|').map(t => t.trim()).filter(Boolean)
                        : [],
    }));

  if (!rows.length) {
    console.error('No data rows found in the CSV.');
    process.exit(1);
  }

  const badRows = rows.filter(r => isNaN(r.lesson_number) || r.lesson_number < 1);
  if (badRows.length) {
    console.error(`${badRows.length} row(s) have an invalid lesson_number (must be a positive integer):`);
    badRows.slice(0, 5).forEach(r =>
      console.error(`  course="${r.course_code}" lesson_number="${r.lesson_number}"`)
    );
    process.exit(1);
  }

  // ── Connect ────────────────────────────────────────────────────────────────
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Copy .env.example to .env and fill in credentials.');
    process.exit(1);
  }

  const pool   = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  let coursesInserted = 0, coursesUpdated = 0;
  let lessonsInserted = 0, lessonsUpdated = 0;

  try {
    await client.query('BEGIN');

    // ── Upsert courses (de-duplicated by course_code) ──────────────────────
    const uniqueCourses = [...new Map(rows.map(r => [r.course_code, r])).values()];

    for (const row of uniqueCourses) {
      const res = await client.query(
        `INSERT INTO courses (code, title, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (code) DO UPDATE
           SET title       = EXCLUDED.title,
               description = EXCLUDED.description
         RETURNING (xmax = 0) AS inserted`,
        [row.course_code, row.course_title, row.course_desc],
      );
      if (res.rows[0].inserted) coursesInserted++; else coursesUpdated++;
    }

    // ── Upsert tags ────────────────────────────────────────────────────────
    for (const row of uniqueCourses) {
      if (!row.tags.length) continue;
      const { rows: [{ id: courseId }] } = await client.query(
        'SELECT id FROM courses WHERE code = $1', [row.course_code],
      );
      for (const tag of row.tags) {
        await client.query(
          `INSERT INTO course_tags (course_id, tag)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [courseId, tag],
        );
      }
    }

    // ── Upsert modules / lessons ───────────────────────────────────────────
    for (const row of rows) {
      const { rows: [{ id: courseId }] } = await client.query(
        'SELECT id FROM courses WHERE code = $1', [row.course_code],
      );
      const res = await client.query(
        `INSERT INTO modules (course_id, position, title, content)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (course_id, position) DO UPDATE
           SET title   = EXCLUDED.title,
               content = EXCLUDED.content
         RETURNING (xmax = 0) AS inserted`,
        [courseId, row.lesson_number, row.lesson_title, row.lesson_content],
      );
      if (res.rows[0].inserted) lessonsInserted++; else lessonsUpdated++;
    }

    await client.query('COMMIT');

    console.log('\nImport complete');
    console.log(`  Courses : ${coursesInserted} inserted, ${coursesUpdated} updated`);
    console.log(`  Lessons : ${lessonsInserted} inserted, ${lessonsUpdated} updated`);
    console.log(`  Rows processed: ${rows.length}`);
    console.log('');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\nImport failed — transaction rolled back.');
    console.error(err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
