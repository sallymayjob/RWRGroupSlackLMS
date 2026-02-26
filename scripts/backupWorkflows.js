#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const src = path.join(process.cwd(), 'workflows', 'n8n-export');
const dst = path.join(process.cwd(), 'workflows', 'backup', `snapshot-${Date.now()}`);
fs.mkdirSync(dst, { recursive: true });
for (const f of fs.readdirSync(src)) {
  if (f.endsWith('.json')) fs.copyFileSync(path.join(src, f), path.join(dst, f));
}
console.log(`Workflow backup created at ${dst}`);
