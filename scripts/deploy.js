#!/usr/bin/env node
const { execSync } = require('child_process');
execSync('docker compose pull', { stdio: 'inherit' });
execSync('docker compose up -d --build', { stdio: 'inherit' });
