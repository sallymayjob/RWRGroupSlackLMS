# Contributing to RWRGroup Agentic LMS

Thank you for contributing. This guide covers everything you need to get changes into `master` cleanly and consistently.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Branch Strategy](#2-branch-strategy)
3. [Commit Messages](#3-commit-messages)
4. [Code Style](#4-code-style)
5. [Testing](#5-testing)
6. [Pull Request Process](#6-pull-request-process)
7. [n8n Workflow Changes](#7-n8n-workflow-changes)
8. [Environment Variables](#8-environment-variables)
9. [Security](#9-security)

---

## 1. Getting Started

```bash
git clone <repo-url> && cd RWRGroupSlackLMS
npm install
cp .env.example .env         # fill in your local credentials
docker compose up postgres redis -d
psql "$DATABASE_URL" -f db/schema.sql
npm run dev
```

Run `make help` for a full list of available commands.

---

## 2. Branch Strategy

| Branch | Purpose |
|--------|---------|
| `master` | Production-ready code — protected; no direct pushes |
| `feature/<short-description>` | New features (e.g. `feature/add-quiz-retry`) |
| `fix/<short-description>` | Bug fixes (e.g. `fix/enroll-duplicate-check`) |
| `chore/<short-description>` | Maintenance — deps, config, docs (e.g. `chore/update-n8n-image`) |
| `claude/<session-id>` | AI-assisted work — automatically managed |

**Always branch from `master`:**

```bash
git checkout master && git pull origin master
git checkout -b feature/my-feature
```

Never commit directly to `master`.

---

## 3. Commit Messages

Use the imperative mood, present tense. Keep the subject line ≤ 72 characters.

```
<type>: <short summary>

[Optional body — wrap at 72 chars]
[Reference issues: Fixes #42]
```

**Types:**

| Type | When to use |
|------|-------------|
| `feat` | New feature or behaviour |
| `fix` | Bug fix |
| `chore` | Build, deps, tooling, config |
| `docs` | Documentation only |
| `test` | Adding or updating tests |
| `refactor` | Code change with no behaviour change |
| `perf` | Performance improvement |

**Examples:**

```
feat: add /unenroll slash command

fix: prevent duplicate enrolment records on concurrent /enroll calls

Fixes #17

docs: add n8n workflow import order to DEPLOYMENT.md

chore: upgrade n8n image to 1.107.4
```

---

## 4. Code Style

Formatting and linting are enforced automatically.

```bash
make lint        # ESLint — check for errors
make lint-fix    # ESLint — auto-fix where possible
make format      # Prettier — reformat files
```

Key conventions:
- No `console.log` debug statements — use the app logger or remove before committing
- No commented-out code — delete it or open an issue
- No hard-coded secrets, tokens, or URLs
- Keep handlers thin — no business logic in `src/`; all logic lives in n8n workflows
- Validate Slack request signatures before processing any payload (already handled by Bolt)

CI will fail the `lint` step on any ESLint error.

---

## 5. Testing

```bash
make test         # full Jest suite
make test-watch   # watch mode during development
```

Requirements:
- Write or update tests for every change in `src/`
- Place tests in `tests/` mirroring the `src/` structure
- All tests must pass locally before opening a PR
- CI runs the full suite on every push and PR

Performance tests live in `tests/perf/` and are excluded from the default `npm test` run; run them manually when relevant.

---

## 6. Pull Request Process

1. **Keep PRs small and focused** — one logical change per PR makes review faster.
2. Push your branch and open a PR against `master`.
3. Fill in the PR template (title, summary, test plan, checklist).
4. CI must pass (lint + tests) before requesting review.
5. At least **one human approval** is required before merge.
6. Squash-merge is preferred to keep `master` history clean.
7. Delete the branch after merge.

**PR title format** — same as commit message subject:
```
feat: add /unenroll slash command
fix: prevent duplicate enrolment on concurrent /enroll
```

---

## 7. n8n Workflow Changes

Workflow definitions are version-controlled in `n8n/workflows/`. When you change a workflow:

1. Make your changes in the n8n UI.
2. Export the workflow: **⋮ → Download**.
3. Replace the corresponding file in `n8n/workflows/`.
4. Commit the updated JSON alongside any related code changes.
5. Note in the PR description which workflow changed and what the effect is.

This ensures the repo always reflects the live workflow state.

---

## 8. Environment Variables

- Never commit `.env` — it is in `.gitignore`.
- If you add a **required** variable, do all three:
  1. Add it to `src/index.js` → `REQUIRED_ENV` array (app exits clearly if missing).
  2. Add it to `.env.example` with a placeholder value and a comment.
  3. Document it in the `README.md` environment variable table and in `DEPLOYMENT.md`.
- If you add an **optional** variable, add it to `.env.example` (commented out) with a description.

---

## 9. Security

- Report vulnerabilities privately via the process in [SECURITY.md](./SECURITY.md) — do not open public issues.
- Never log Slack tokens, signing secrets, or user PII.
- All Slack payloads are signature-verified by Bolt before reaching handlers — do not bypass this.
- Follow least-privilege: request only the OAuth scopes that are actually needed (see `slack_manifest.json`).
- SQL queries must use parameterised statements — never interpolate user input into query strings.
