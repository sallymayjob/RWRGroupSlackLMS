#!/usr/bin/env node
const { execSync } = require('child_process');
execSync('psql "$DATABASE_URL" -f db/schema.sql', { stdio: 'inherit', shell: '/bin/bash' });
