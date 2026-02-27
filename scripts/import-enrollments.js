#!/usr/bin/env node
/**
 * import-enrollments.js — bulk-enrols Slack users into courses from a CSV.
 *
 * For each row the script:
 *   1. Upserts the user record (creates the user if they don't exist yet;
 *      updates email / display_name if supplied and different).
 *   2. Looks up the course by course_code.
 *   3. Resolves the first lesson (lowest position module) of that course.
 *   4. Inserts the enrolment, setting current_module_id to lesson 1.
 *      Already-enrolled users are skipped (never double-enrolled).
 *
 * Required CSV columns:
 *   slack_user_id  — Slack member ID, e.g. U012AB3CD
 *   slack_team_id  — Slack workspace ID, e.g. T012AB3CD
 *   course_code    — matches courses.code, e.g. SAFETY101
 *
 * Optional CSV columns:
 *   email          — populated into the user record
 *   display_name   — populated into the user record
 *
 * Usage:
 *   node scripts/import-enrollments.js <path-to-csv>
 *   npm run enroll:import -- enrollments.csv
 *
 * Re-running is safe: existing enrolments are skipped, not duplicated.
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
  console.error('Usage: node scripts/import-enrollments.js <path-to-csv>');
  console.error('       npm run enroll:import -- enrollments.csv');
  process.exit(1);
}

const csvPath = path.resolve(csvArg);
if (!fs.existsSync(csvPath)) {
  console.error(`File not found: ${csvPath}`);
  process.exit(1);
}

// ── Minimal RFC-4180 CSV parser ───────────────────────────────────────────────
function parseCSV(raw) {
  const rows  = [];
  const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

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
const REQUIRED_COLS = ['slack_user_id', 'slack_team_id', 'course_code'];

async function main() {
  // ── Parse CSV ──────────────────────────────────────────────────────────────
  const raw = fs.readFileSync(csvPath, 'utf8');
  const [headerRow, ...dataRows] = parseCSV(raw);
  const headers = headerRow.map(h => h.trim().toLowerCase());

  const missing = REQUIRED_COLS.filter(c => !headers.includes(c));
  if (missing.length) {
    console.error(`Missing required columns: ${missing.join(', ')}`);
    console.error(`Required: ${REQUIRED_COLS.join(', ')},  optional: email, display_name`);
    process.exit(1);
  }

  const col = name => headers.indexOf(name);

  const rows = dataRows
    .filter(r => r.length >= REQUIRED_COLS.length && r[col('slack_user_id')].trim())
    .map(r => ({
      slack_user_id: r[col('slack_user_id')].trim(),
      slack_team_id: r[col('slack_team_id')].trim(),
      course_code:   r[col('course_code')].trim(),
      email:         col('email') >= 0        ? r[col('email')].trim()        || null : null,
      display_name:  col('display_name') >= 0 ? r[col('display_name')].trim() || null : null,
    }));

  if (!rows.length) {
    console.error('No data rows found in the CSV.');
    process.exit(1);
  }

  // Validate Slack ID format (loose check — starts with U or W, 9-11 chars)
  const badUsers = rows.filter(r => !/^[UW][A-Z0-9]{6,15}$/.test(r.slack_user_id));
  if (badUsers.length) {
    console.error(`${badUsers.length} row(s) have an unrecognised slack_user_id format:`);
    badUsers.slice(0, 5).forEach(r => console.error(`  "${r.slack_user_id}"`));
    console.error('Expected format: U012AB3CD');
    process.exit(1);
  }

  const badTeams = rows.filter(r => !/^[TE][A-Z0-9]{6,15}$/.test(r.slack_team_id));
  if (badTeams.length) {
    console.error(`${badTeams.length} row(s) have an unrecognised slack_team_id format:`);
    badTeams.slice(0, 5).forEach(r => console.error(`  "${r.slack_team_id}"`));
    console.error('Expected format: T012AB3CD');
    process.exit(1);
  }

  // ── Connect ────────────────────────────────────────────────────────────────
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Copy .env.example to .env and fill in credentials.');
    process.exit(1);
  }

  const pool   = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  let usersCreated  = 0, usersUpdated  = 0;
  let enrolled      = 0, skipped       = 0, errors = 0;

  // Cache course lookups to avoid repeated DB hits for the same code
  const courseCache = {};

  try {
    await client.query('BEGIN');

    for (const row of rows) {
      // ── 1. Upsert user ───────────────────────────────────────────────────
      const userRes = await client.query(
        `INSERT INTO users (slack_user_id, slack_team_id, email, display_name)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (slack_user_id) DO UPDATE
           SET slack_team_id = EXCLUDED.slack_team_id,
               email         = COALESCE(EXCLUDED.email,        users.email),
               display_name  = COALESCE(EXCLUDED.display_name, users.display_name),
               updated_at    = NOW()
         RETURNING id, (xmax = 0) AS inserted`,
        [row.slack_user_id, row.slack_team_id, row.email, row.display_name],
      );
      const { id: userId, inserted: userInserted } = userRes.rows[0];
      if (userInserted) usersCreated++; else usersUpdated++;

      // ── 2. Resolve course ────────────────────────────────────────────────
      if (!courseCache[row.course_code]) {
        const courseRes = await client.query(
          `SELECT c.id AS course_id,
                  (SELECT id FROM modules WHERE course_id = c.id ORDER BY position ASC LIMIT 1)
                    AS first_module_id
           FROM courses c WHERE c.code = $1`,
          [row.course_code],
        );
        if (!courseRes.rows.length) {
          console.error(`  WARNING: course "${row.course_code}" not found — skipping user ${row.slack_user_id}`);
          errors++;
          continue;
        }
        courseCache[row.course_code] = courseRes.rows[0];
      }
      const { course_id, first_module_id } = courseCache[row.course_code];

      // ── 3. Insert enrolment (skip if already enrolled) ───────────────────
      const enrolRes = await client.query(
        `INSERT INTO enrolments (user_id, course_id, current_module_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, course_id) DO NOTHING
         RETURNING id`,
        [userId, course_id, first_module_id],
      );

      if (enrolRes.rows.length) enrolled++; else skipped++;
    }

    await client.query('COMMIT');

    console.log('\nEnrolment import complete');
    console.log(`  Users     : ${usersCreated} created, ${usersUpdated} updated`);
    console.log(`  Enrolments: ${enrolled} enrolled, ${skipped} already enrolled (skipped)`);
    if (errors) console.log(`  Warnings  : ${errors} row(s) skipped — course not found`);
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
