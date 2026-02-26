const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const sourceFile = path.join(repoRoot, 'src', 'index.js');
const docsToCheck = ['README.md', 'DEPLOYMENT.md'];

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function parseRequiredEnvFromSource(content) {
  const match = content.match(/const\s+REQUIRED_ENV\s*=\s*\[(.*?)\];/s);
  if (!match) fail('Could not find REQUIRED_ENV array in src/index.js');

  const vars = [...match[1].matchAll(/['"]([A-Z0-9_]+)['"]/g)].map((m) => m[1]);
  if (vars.length === 0) fail('REQUIRED_ENV array exists but no env vars were parsed.');
  return vars;
}

function parseRequiredEnvFromDoc(content, docPath) {
  const match = content.match(
    /<!--\s*REQUIRED_ENV_VARS_START\s*-->([\s\S]*?)<!--\s*REQUIRED_ENV_VARS_END\s*-->/,
  );

  if (!match) {
    fail(
      `${docPath} is missing REQUIRED_ENV_VARS_START/END markers used by scripts/check-env-docs.js`,
    );
  }

  const vars = [...match[1].matchAll(/`([A-Z0-9_]+)`/g)].map((m) => m[1]);
  if (vars.length === 0) {
    fail(`${docPath} marker block is present but no backticked env vars were found.`);
  }

  return vars;
}

function sameMembers(a, b) {
  const as = [...new Set(a)].sort();
  const bs = [...new Set(b)].sort();
  return JSON.stringify(as) === JSON.stringify(bs);
}

const source = fs.readFileSync(sourceFile, 'utf8');
const requiredInCode = parseRequiredEnvFromSource(source);

for (const docPath of docsToCheck) {
  const doc = fs.readFileSync(path.join(repoRoot, docPath), 'utf8');
  const requiredInDoc = parseRequiredEnvFromDoc(doc, docPath);

  if (!sameMembers(requiredInCode, requiredInDoc)) {
    console.error(`\nCode-required vars: ${[...new Set(requiredInCode)].sort().join(', ')}`);
    console.error(`${docPath} vars: ${[...new Set(requiredInDoc)].sort().join(', ')}\n`);
    fail(`${docPath} required env documentation does not match src/index.js REQUIRED_ENV.`);
  }
}

console.log('✅ Required env documentation matches src/index.js for README.md and DEPLOYMENT.md');
