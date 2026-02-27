#!/usr/bin/env node
/**
 * import-lessons.js — bulk-loads courses and/or lessons (modules) from a CSV.
 *
 * The script auto-detects the import mode from the CSV headers:
 *
 *   COURSES-ONLY mode (see courses-template.csv):
 *     course_code, course_title, course_description, [tags]
 *     → upserts the course catalogue; no lesson data required.
 *
 *   COURSES + LESSONS mode (see lessons-template.csv):
 *     course_code, course_title, course_description,
 *     lesson_number, lesson_title, lesson_content, [tags]
 *     → upserts courses AND their lessons (modules) in one pass.
 *
 * Usage:
 *   node scripts/import-lessons.js <path-to-csv>
 *   npm run lessons:import -- lessons.csv
 *   npm run courses:import -- courses.csv
 *
 * Re-running is safe: existing rows are updated, never duplicated.
 * The whole import runs inside a single transaction — any error rolls back.
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

// ── Column sets ───────────────────────────────────────────────────────────────
const COURSE_COLS = ['course_code', 'course_title', 'course_description'];
const LESSON_COLS = ['lesson_number', 'lesson_title', 'lesson_content'];

async function main() {
  // ── Parse CSV ──────────────────────────────────────────────────────────────
  const raw = fs.readFileSync(csvPath, 'utf8');
  const [headerRow, ...dataRows] = parseCSV(raw);
  const headers = headerRow.map(h => h.trim().toLowerCase());

  // Validate required course columns
  const missingCourse = COURSE_COLS.filter(c => !headers.includes(c));
  if (missingCourse.length) {
    console.error(`Missing required columns: ${missingCourse.join(', ')}`);
    console.error(`Courses-only format requires: ${COURSE_COLS.join(', ')},  [tags]`);
    console.error(`Courses+lessons format requires: ${[...COURSE_COLS, ...LESSON_COLS].join(', ')},  [tags]`);
    process.exit(1);
  }

  // Auto-detect mode: all lesson columns present → full import; none → courses only
  const lessonColsPresent = LESSON_COLS.filter(c => headers.includes(c));
  const missingLesson     = LESSON_COLS.filter(c => !headers.includes(c));

  if (lessonColsPresent.length > 0 && missingLesson.length > 0) {
    console.error(`Incomplete lesson columns. Found: ${lessonColsPresent.join(', ')}`);
    console.error(`Missing: ${missingLesson.join(', ')}`);
    console.error('Either include ALL lesson columns or none (courses-only mode).');
    process.exit(1);
  }

  const includeLessons = lessonColsPresent.length === LESSON_COLS.length;
  const mode           = includeLessons ? 'courses + lessons' : 'courses only';
  console.log(`Detected mode: ${mode}`);

  const col      = name => headers.indexOf(name);
  const minCols  = includeLessons ? COURSE_COLS.length + LESSON_COLS.length : COURSE_COLS.length;

  const rows = dataRows
    .filter(r => r.length >= minCols && r[col('course_code')].trim())
    .map(r => {
      const row = {
        course_code:  r[col('course_code')].trim(),
        course_title: r[col('course_title')].trim(),
        course_desc:  r[col('course_description')].trim(),
        tags:         col('tags') >= 0
                        ? r[col('tags')].split('|').map(t => t.trim()).filter(Boolean)
                        : [],
      };
      if (includeLessons) {
        row.lesson_number  = parseInt(r[col('lesson_number')].trim(), 10);
        row.lesson_title   = r[col('lesson_title')].trim();
        row.lesson_content = r[col('lesson_content')].trim();
      }
      return row;
    });

  if (!rows.length) {
    console.error('No data rows found in the CSV.');
    process.exit(1);
  }

  if (includeLessons) {
    const badRows = rows.filter(r => isNaN(r.lesson_number) || r.lesson_number < 1);
    if (badRows.length) {
      console.error(`${badRows.length} row(s) have an invalid lesson_number (must be a positive integer):`);
      badRows.slice(0, 5).forEach(r =>
        console.error(`  course="${r.course_code}" lesson_number="${r.lesson_number}"`)
      );
      process.exit(1);
    }
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

    // ── Upsert modules / lessons (full mode only) ──────────────────────────
    if (includeLessons) {
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
    }

    await client.query('COMMIT');

    console.log('\nImport complete');
    console.log(`  Courses : ${coursesInserted} inserted, ${coursesUpdated} updated`);
    if (includeLessons) {
      console.log(`  Lessons : ${lessonsInserted} inserted, ${lessonsUpdated} updated`);
    }
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
