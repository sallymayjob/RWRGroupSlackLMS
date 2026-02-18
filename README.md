# RWR Group Slack LMS (n8n Automation)

This project is an **n8n-based Slack Learning Management System (LMS)** using **Gemini** as the primary AI model.

It orchestrates a supervisor workflow that routes Slack commands/events to specialized sub-workflows (agents), then synchronizes:
- **Notion DB** (canonical source)
- **LM Data Table** (operational store)
- **Google Sheets** (dashboard/reporting)

## n8n Project Structure

- `workflows/slack_supervisor.workflow.json` → Main trigger + parser + switch/router
- `workflows/agent_subworkflow_template.workflow.json` → Reusable sub-workflow template for each agent
- `workflows/payload_examples.json` → Example Slack payload and normalized command JSON
- `docs/ENVIRONMENT_SETUP.md` → Environment + credentials + go-live steps
- `docs/DEPLOYMENT.md` → Full production deployment details
- `docs/SECURITY_REVIEW.md` → Security vulnerabilities identified and remediation status
- `docs/SCHEMA.md` → Notion curriculum schema + Universal Lesson Canvas constraints
- `docs/DATABASE_SCHEMA.md` → operational SQL schema overview
- `docs/CODE_REVIEW.md` → code review findings and remediations
- `docs/SLACK_MANIFEST_INTEGRATION.md` → command/event URL mapping for the provided Slack manifest
- `docs/slack_app_manifest.json` → Slack app manifest currently used for command/event wiring
- `docker-compose.yml` → Self-hosted baseline stack (n8n + postgres + redis)

## Agent Map (n8n Routing)

| Agent ID | n8n Sub-Workflow Name | Responsibility |
|---|---|---|
| 1 | `agent_01_content_architect` | Content updates + sync triggers |
| 2 | `agent_02_quiz_master` | Weekly 30-min deep-dive quiz + assessment |
| 3 | `agent_03_tutor` | Relearn/expand guidance |
| 4 | `agent_04_progress_tracker` | `/submit <lesson_code>` + `/complete` tracking |
| 5 | `agent_05_feedback_analyst` | Lesson feedback analysis + admin report |
| 6 | `agent_06_support` | General support answers |
| 7 | `agent_07_certification` | Weekly completion certification + manager notice |
| 8 | `agent_08_enrollment_manager` | Enrollment verification and add workflow |
| 9 | `agent_09_gap_analyst` | Stuck learner detection + nudges |
| 10 | `agent_10_compliance_reviewer` | SOP-5 compliance checks |
| 11 | `agent_11_notification` | Learner/manager reminders |
| 12 | `agent_12_reporting` | Google Sheets dashboard updates |
| 13 | `agent_13_onboarding` | New-user pathway assignment |
| 14 | `agent_14_learning_asset_formatter` | NotebookLM export format assistant |

## Quick Start

1. Copy `.env.example` → `.env` and fill credentials.
2. Import workflow JSONs into n8n.
3. Duplicate template into all 14 agent workflows.
4. Wire Execute Workflow references in supervisor.
5. Configure Slack command URLs to `/webhook/supervisor` (and `/webhook/onboard` for onboarding).
6. Activate workflows and run payload smoke tests.

## Slack Command Contract

Supervisor webhook (`/webhook/supervisor`) commands from your manifest:
- `/learn`
- `/quiz`
- `/progress`
- `/enroll`
- `/cert`
- `/report`
- `/gaps`

Dedicated onboarding webhook:
- `/onboard` -> `/webhook/onboard`

Legacy commands remain supported for backward compatibility: `/submit`, `/complete`, `/feedback`, `/tutor`.

## Weekly Cadence

- Mon–Fri: micro-learning dispatch
- Fri: deep-dive quiz (30 min) + assessment
- Post-quiz: tutor-led relearn/expand
- End-of-cycle: certification + reporting

## Data Sync Order (Required)

1. Write/confirm in Notion
2. Write LM Data Table
3. Update Google Sheets dashboard

Use idempotency key: `source:entity_id:version`.

## Stress Testing (5 Personas)

A synthetic stress test harness is included to evaluate routing and sync behavior for five learner personas.
The harness is deterministic by seed (safe for before/after code-review comparisons).

Run:

```bash
python tests/stress_test_simulation.py --seed 42 --workers 10 --users 10 --output reports/stress_test_results.json
```

See summarized findings in:
- `reports/STRESS_TEST_REPORT.md`
- `reports/stress_test_results.json`
- `reports/STRESS_TEST_USERS_5_TO_100.md`
- `reports/stress_test_users_5_to_100_summary.json`



## Notion Workspace (Provided)

Configured workspace root:
- `https://www.notion.so/Slack-LMS-RWR-Group-30558a9ec642819785c7d39dbce75ef1`

Set IDs in `.env`:
- `NOTION_ROOT_PAGE_ID=30558a9ec642819785c7d39dbce75ef1`
- `NOTION_COURSES_DB_ID`
- `NOTION_MONTHS_DB_ID`
- `NOTION_LESSONS_DB_ID`

## Schema

Use `docs/SCHEMA.md` plus CSV schema files in `data/` to implement the Notion Curriculum model (Courses → Months → Lessons) and ULC authoring constraints.

Operational SQL schema: `data/lms_database_schema.sql` (overview in `docs/DATABASE_SCHEMA.md`).


## Security

See `docs/SECURITY_REVIEW.md` for vulnerability findings, fixes, and remaining hardening recommendations.


## QA Validation (Performance, Regression, Penetration-Style)

Run:

```bash
python tests/qa_performance_regression_pentest.py
```

Outputs:
- `reports/qa_validation_summary.json`
- `reports/QA_VALIDATION_REPORT.md`
