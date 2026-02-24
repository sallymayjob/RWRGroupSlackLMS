/**
 * Logic for the "Build Summary" Code node in Agent 14 (backup workflow).
 *
 * n8n context objects accepted:
 *   $  — function that looks up a node by name: $('NodeName').all() → [{ json }]
 *
 * Usage inside the n8n Code node:
 *   const { run } = require('./build-backup-summary');
 *   return run({ $ });
 *
 * Or inline (current n8n setup) — paste the body of run() directly.
 */

function run({ $ }) {
  const rows = $("Query DB Snapshot").all().map((i) => i.json);
  const counts = {};
  rows.forEach((r) => {
    counts[r.table_name] = r.row_count;
  });
  const ts = new Date().toUTCString();
  return [
    {
      json: {
        text:
          `*LMS Google Sheets Backup Complete* — ${ts}\n` +
          `• Progress records: ${counts.progress ?? 0}\n` +
          `• Enrollments: ${counts.enrolments ?? 0}\n` +
          `• Certificates: ${counts.certificates ?? 0}\n` +
          `• Total users: ${counts.users ?? 0} | Courses: ${counts.courses ?? 0} | Modules: ${counts.modules ?? 0}`,
      },
    },
  ];
}

module.exports = { run };
