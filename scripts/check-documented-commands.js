#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const sourcePath = path.join(repoRoot, 'src/handlers/commands.js');

const docsToCheck = [
  'README.md',
  'docs/SLACK_MANIFEST_INTEGRATION.md',
  'docs/ENVIRONMENT_SETUP.md',
  'docs/DEPLOYMENT.md',
];

const legacyCompatibilityAliases = new Set(['/quiz', '/complete', '/feedback', '/tutor']);

function extractCommands(text) {
  const commands = new Set();
  const regex = /(^|\s|[(`])\/([a-z]+)(?=$|\s|[).,`])/gm;
  let match;

  while ((match = regex.exec(text)) !== null) {
    commands.add(`/${match[2]}`);
  }

  return commands;
}

function getSourceCommands() {
  const source = fs.readFileSync(sourcePath, 'utf8');
  const commandLiterals = source.match(/"\/[a-z]+"/g) || [];
  return new Set(commandLiterals.map((literal) => literal.slice(1, -1)));
}

function validateDoc(docPath, sourceCommands) {
  const fullPath = path.join(repoRoot, docPath);
  const text = fs.readFileSync(fullPath, 'utf8');
  const commandsInDoc = extractCommands(text);

  const missingCanonical = [...sourceCommands].filter((cmd) => !commandsInDoc.has(cmd));
  const extras = [...commandsInDoc].filter(
    (cmd) => !sourceCommands.has(cmd) && !legacyCompatibilityAliases.has(cmd),
  );

  return { docPath, missingCanonical, extras };
}

function main() {
  const sourceCommands = getSourceCommands();
  const errors = [];

  for (const docPath of docsToCheck) {
    const result = validateDoc(docPath, sourceCommands);

    if (result.missingCanonical.length || result.extras.length) {
      errors.push(result);
    }
  }

  if (errors.length) {
    console.error('Documented command validation failed.');
    for (const error of errors) {
      console.error(`\n- ${error.docPath}`);
      if (error.missingCanonical.length) {
        console.error(`  Missing canonical commands: ${error.missingCanonical.join(', ')}`);
      }
      if (error.extras.length) {
        console.error(`  Unsupported documented commands: ${error.extras.join(', ')}`);
      }
    }
    process.exit(1);
  }

  console.log('Command documentation matches src/handlers/commands.js (with legacy alias allowance).');
}

main();
