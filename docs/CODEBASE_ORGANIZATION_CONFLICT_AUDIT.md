# Codebase Organization & Conflict Audit

Date: 2026-02-26  
Scope: Entire repository layout, documentation set, and runtime code alignment.

---

## 1) Executive Result

The repository is functionally usable, but organization is currently split across **two parallel documentation/storylines**:

1. **Node app + n8n agent workflows** (matches current runtime code).
2. **n8n-first + Notion/LM-table architecture** (appears legacy/alternate strategy).

This creates merge/conflict risk where a maintainer can follow the wrong docs and deploy an incompatible stack.

---

## 2) Canonical Runtime Truth (what code actually does)

These files are the most reliable source of truth for the running product:

- `src/index.js` (Node app entrypoint, env validation, Slack Bolt setup)
- `src/handlers/*.js` (accepted slash commands/events/interactions)
- `src/services/n8n.js` (actual webhook routes and retry/timeout behavior)
- `docker-compose.yml` (actual services shipped by this repo)
- `db/schema.sql` (schema used by current app deployment docs)
- `n8n/workflows/*.json` (current workflow set referenced by README and DEPLOYMENT)

**Recommendation:** Treat these as “Tier-1 Source of Truth” and align docs to them.

---

## 3) Conflict Matrix (Docs vs Code)

## 3.1 Slash command conflicts

### Conflict A: `/quiz` documented, but code handles `/submit`
- **Code reality:** `src/handlers/commands.js` registers `/submit` (not `/quiz`).
- **Conflicting docs:** `docs/DEPLOYMENT.md`, `docs/ENVIRONMENT_SETUP.md`, `docs/SLACK_MANIFEST_INTEGRATION.md` list `/quiz` as primary.

**Merge action:**
- Keep `/submit` as canonical command.
- Mark `/quiz` as legacy alias only if implemented in n8n webhook parser (otherwise remove).

### Conflict B: Legacy command claims without app-level support
- Docs claim compatibility for `/complete`, `/feedback`, `/tutor`.
- App code does not register those commands directly.

**Merge action:**
- If truly supported only inside n8n raw command parsing, document as “n8n-level compatibility aliases” with warning.
- Otherwise remove these claims from docs.

---

## 3.2 Workflow directory conflicts

### Conflict C: Two workflow trees
- `n8n/workflows/*.json`
- `workflows/*.workflow.json` and related files

README/DEPLOYMENT mainly point to `n8n/workflows`, while several docs still instruct importing `workflows/*.workflow.json`.

**Merge action:**
1. Declare `n8n/workflows/` as canonical active workflows.
2. Move legacy `workflows/` files into `archive/workflows-legacy/` (or remove after verification).
3. Update all docs to a single import path.

---

## 3.3 Schema source conflicts

### Conflict D: Multiple “source of truth” schema statements
- `db/schema.sql` is used by primary deployment docs and quickstart.
- `data/lms_database_schema.sql` is described in some docs as operational baseline.

**Merge action:**
1. Pick one canonical schema source (`db/schema.sql` recommended for app runtime simplicity).
2. If `data/lms_database_schema.sql` is for analytics/extended model, rename and document as secondary reference.
3. Add migration versioning (`migrations/`) to remove ambiguity.

---

## 3.4 Deployment doc conflicts

### Conflict E: Root `DEPLOYMENT.md` vs `docs/DEPLOYMENT.md`
- Root `DEPLOYMENT.md` is aligned with current Node app + `n8n/workflows`.
- `docs/DEPLOYMENT.md` describes broader n8n queue mode + Notion-heavy architecture and different command set.

**Merge action:**
- Keep root `DEPLOYMENT.md` as canonical deployment guide.
- Convert `docs/DEPLOYMENT.md` into `docs/DEPLOYMENT_LEGACY_OR_ALT.md` or archive.
- Add banner in legacy doc: “Not canonical for current production stack.”

---

## 3.5 Manifest and integration conflicts

### Conflict F: Manifest/integration docs reference outdated command mapping
- `docs/SLACK_MANIFEST_INTEGRATION.md` maps `/quiz` and route relationships inconsistent with runtime command list.

**Merge action:**
- Regenerate this doc from current `src/handlers/commands.js` and `slack_manifest.json`.
- Add check script in CI to detect divergence.

---

## 4) What can be merged immediately

These files can be merged/consolidated with low risk:

1. **Deployment docs**
   - Merge useful hardening notes from `docs/DEPLOYMENT.md` into root `DEPLOYMENT.md`.
   - Deprecate duplicate deployment doc.

2. **Environment/setup docs**
   - Merge `docs/ENVIRONMENT_SETUP.md` into root `DEPLOYMENT.md` section or `docs/ENVIRONMENT_SETUP.md` rewritten to match actual env vars in `.env.example` and `src/index.js`.

3. **Manifest docs**
   - Merge `docs/SLACK_MANIFEST_INTEGRATION.md` into one canonical Slack setup section (README + DEPLOYMENT).

4. **Review docs proliferation**
   - Consolidate `docs/PRODUCTION_REVIEW.md`, `docs/CODE_REVIEW.md`, `docs/SECURITY_REVIEW.md`, and `docs/FULL_PRODUCTION_READINESS_REVIEW.md` into a versioned `docs/audits/` folder with one index file.

---

## 5) Proposed Target Repository Structure

```text
/docs
  /architecture
  /operations
    DEPLOYMENT.md                 # canonical
    RUNBOOK.md
    SECURITY.md
  /audits
    2026-02-production-readiness.md
    2026-02-security-review.md
  /legacy
    DEPLOYMENT_LEGACY_OR_ALT.md
    ENVIRONMENT_SETUP_LEGACY.md

/n8n/workflows                      # canonical active workflows
/archive/workflows-legacy           # old workflow JSONs only

/db
  schema.sql                        # canonical schema
  /migrations                       # versioned migrations

/src                                # runtime code
/tests                              # automated checks
```

---

## 6) Concrete Merge/Deprecation Backlog

Priority order:

1. **P0:** Publish canonical source-of-truth map in README.
2. **P0:** Deprecate/rename `docs/DEPLOYMENT.md` to avoid accidental use.
3. **P0:** Normalize command documentation to exactly match `src/handlers/commands.js`.
4. **P1:** Decide workflow canonical path and archive duplicate directory.
5. **P1:** Decide schema canonical source and document secondary schema role.
6. **P1:** Add CI drift checks (command list, env vars, workflow path references).
7. **P2:** Move old exports/reports/binaries into `archive/` or external artifact store.

---

## 7) Suggested CI Guardrails to Prevent Future Drift

1. **Command list parity test**
   - Parse command names from `src/handlers/commands.js`.
   - Assert README + deployment command tables match exactly.

2. **Env var parity test**
   - Compare required env vars in `src/index.js` against `.env.example` and deployment docs.

3. **Workflow path parity test**
   - Assert docs only reference the canonical workflow directory.

4. **Legacy doc banner lint**
   - Fail CI if legacy docs are missing “not canonical” warning header.

---

## 8) Final Recommendation

You should run a **documentation consolidation sprint** before additional feature work:
- one canonical deploy path,
- one canonical command map,
- one canonical workflow directory,
- one canonical schema source.

This will reduce onboarding time, production misconfiguration, and support incidents caused by doc/code drift.
