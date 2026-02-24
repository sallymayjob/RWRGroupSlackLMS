# CLAUDE.md — RWRGroupSlackLMS

This file provides context and conventions for AI assistants (e.g., Claude Code) working on this repository.

---

## Project Overview

**RWRGroupSlackLMS** is a Learning Management System (LMS) integrated with Slack for the RWR Group organization. The project enables training delivery, progress tracking, and learning workflows surfaced directly through the Slack platform.

> **Status:** Early initialization stage. No source code has been committed yet. This file establishes conventions to follow as the project is built out.

---

## Repository Structure

```
RWRGroupSlackLMS/
├── CLAUDE.md          # This file — AI assistant guidance
├── SECURITY.md        # Security policy
└── .gitkeep           # Placeholder (remove once real files are added)
```

As the project grows, the expected structure is:

```
RWRGroupSlackLMS/
├── src/               # Application source code
├── tests/             # Unit and integration tests
├── docs/              # Project documentation
├── .env.example       # Environment variable template (never commit .env)
├── package.json       # Node.js dependencies and scripts (if Node-based)
├── CLAUDE.md
├── SECURITY.md
└── README.md
```

---

## Development Workflow

### Branch Strategy

- **`master`** — stable production-ready code; do not push directly
- **Feature branches** — use `feature/<short-description>` naming
- **Claude branches** — AI-generated work uses `claude/<session-id>` naming (current convention)

Always develop on a feature branch and open a pull request to `master`.

### Commits

- Write clear, imperative commit messages: `Add Slack event handler for course enrollment`
- Keep commits focused and atomic — one logical change per commit
- Reference issue numbers when applicable: `Fix token refresh bug (#42)`

### Pull Requests

- Include a description of what changed and why
- All tests must pass before merging
- At least one human review is required before merge to `master`

---

## Environment Variables

Environment variables **must never be committed** to the repository. Use a `.env` file locally and maintain a `.env.example` template with placeholder values.

Expected variables (to be filled in as the project is defined):

```env
# Slack Integration
SLACK_BOT_TOKEN=
SLACK_SIGNING_SECRET=
SLACK_APP_TOKEN=

# Application
NODE_ENV=development
PORT=3000

# Database (if applicable)
DATABASE_URL=
```

---

## Testing

- Write tests for all new features and bug fixes
- Place tests in the `tests/` directory, mirroring the `src/` structure
- All tests must pass before committing or opening a PR

When a test framework is configured, run tests with:
```bash
npm test        # or the equivalent for the chosen stack
```

---

## Code Conventions

### General

- Prefer clarity over cleverness — write code that is easy to read and understand
- Use consistent formatting; configure a linter/formatter (e.g., ESLint + Prettier for JS/TS) and commit the config
- Avoid committing commented-out code; delete it or open an issue instead
- Remove `console.log` debug statements before committing

### Security

- Never hard-code credentials, tokens, or secrets
- Validate and sanitize all input from Slack events and slash commands
- Follow the guidelines in [SECURITY.md](./SECURITY.md) for reporting vulnerabilities
- Use least-privilege principles for Slack bot scopes

### Slack Integration

- Handle Slack's 3-second response window for slash commands (use `response_url` for deferred replies)
- Always verify the Slack request signature before processing any incoming event
- Use Slack Block Kit for rich message formatting

---

## Key Files to Know

| File | Purpose |
|------|---------|
| `SECURITY.md` | Vulnerability reporting policy |
| `.env.example` | Environment variable template (to be created) |
| `src/` | Application source (to be created) |

---

## Getting Started (Placeholder)

This section will be updated once the project scaffolding is in place. For now:

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in credentials
3. Install dependencies (e.g., `npm install`)
4. Run the development server (e.g., `npm run dev`)

---

## Notes for AI Assistants

- This repository is **in early stage** — no framework or language has been locked in yet. Check for `package.json`, `requirements.txt`, or similar files to determine the stack before making assumptions.
- When adding new features, always check existing files for patterns to follow before introducing new conventions.
- Do not commit `.env` files, credentials, or secrets.
- When in doubt about project direction, surface questions rather than making large architectural decisions autonomously.
- Update this file when significant architectural decisions are made or the project structure changes materially.
