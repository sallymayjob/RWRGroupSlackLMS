# LMS CSV Analytics Dashboard Guide

## 1) Purpose
This guide defines a **standard LMS analytics dashboard** built from CSV exports. It is designed for non-technical operators in Google Sheets or Excel and includes:
- dashboard layout,
- required CSV datasets,
- KPI formulas,
- automation and refresh workflow.

---

## 2) Recommended Dashboard Design (Common LMS Pattern)
Use a 5-section layout:

1. **Executive KPI Row**
   - Total Learners
   - Active Learners (7d)
   - Completion Rate
   - Avg Quiz Score
   - Certificates Issued

2. **Engagement Trend**
   - Daily/weekly active learners
   - Lessons completed over time

3. **Course Performance Table**
   - Course name/code
   - Enrolments
   - Completions
   - Completion %
   - Avg Score

4. **Learner Funnel**
   - Onboarded → Enrolled → Started → Completed → Certified

5. **Risk / Intervention Panel**
   - Inactive learners (no activity in N days)
   - Gap/low-score learners
   - Nudge response rate

---

## 3) CSV Inputs
Create one sheet per CSV.

### 3.1 Required CSV files
- `users.csv`
  - `id`, `slack_user_id`, `display_name`, `created_at`
- `courses.csv`
  - `id`, `code`, `title`, `created_at`
- `enrolments.csv`
  - `id`, `user_id`, `course_id`, `enrolled_at`, `completed_at`
- `progress.csv`
  - `id`, `user_id`, `module_id`, `completed_at`
- `modules.csv`
  - `id`, `course_id`, `position`, `title`
- `quiz_attempts.csv`
  - `id`, `user_id`, `module_id`, `result`, `score`, `submitted_at`
- `certificates.csv`
  - `id`, `user_id`, `course_id`, `issued_at`
- `notifications.csv`
  - `id`, `user_id`, `notification_type`, `sent_at`
- `nudge_reactions.csv`
  - `id`, `user_id`, `lesson_id`, `reaction_type`, `reacted_at`
- `assignment_submissions.csv`
  - `id`, `user_id`, `lesson_id`, `course_title`, `submitted_at`, `drive_filename`

### 3.2 Optional CSV files
- `audit_log.csv` for event-level observability.
- `course_tags.csv` for category filtering.

---

## 4) Data Prep Layer
Create helper sheets:
- `dim_course`: join course ID → code/title.
- `dim_module`: join module ID → course ID.
- `fact_learning`: flattened joins for enrolment/progress/cert status by learner-course.

### 4.1 Key prep transformations
- Convert all timestamps to date (`DATEVALUE` / `TO_DATE`).
- Normalize learner key to `user_id`.
- Add derived flags:
  - `is_enrolled`
  - `is_completed`
  - `is_certified`
  - `is_active_7d`

---

## 5) KPI Definitions + Formulas
> Examples below are Google Sheets formulas; Excel equivalents are direct analogs.

Assume named ranges:
- `Users!A:Z`, `Enrolments!A:Z`, `Progress!A:Z`, etc.

## 5.1 Total Learners
```gs
=COUNTA(UNIQUE(Users!A2:A))
```

## 5.2 Active Learners (7d)
Active = learner with progress completion in the last 7 days.
```gs
=COUNTA(UNIQUE(FILTER(Progress!B2:B, Progress!D2:D >= TODAY()-7)))
```

## 5.3 Total Enrolments
```gs
=COUNTA(Enrolments!A2:A)
```

## 5.4 Completed Enrolments
```gs
=COUNTA(FILTER(Enrolments!A2:A, Enrolments!E2:E <> ""))
```

## 5.5 Completion Rate
```gs
=IFERROR( Completed_Enrolments / Total_Enrolments , 0)
```
(Format as %)

## 5.6 Certificates Issued
```gs
=COUNTA(Certificates!A2:A)
```

## 5.7 Avg Quiz Score (latest attempt per learner-module recommended)
Simple average:
```gs
=IFERROR(AVERAGE(QuizAttempts!E2:E),0)
```

Advanced (latest attempt only):
- Build helper table keyed by `user_id|module_id` with max `submitted_at`, then average joined scores.

## 5.8 Nudge Sent (7d)
```gs
=COUNTA(FILTER(Notifications!A2:A, Notifications!D2:D >= TODAY()-7, Notifications!C2:C="nudge"))
```

## 5.9 Nudge Reaction Rate (7d)
```gs
=IFERROR(
  COUNTA(FILTER(NudgeReactions!A2:A, NudgeReactions!E2:E >= TODAY()-7)) /
  COUNTA(FILTER(Notifications!A2:A, Notifications!D2:D >= TODAY()-7, Notifications!C2:C="nudge")),
0)
```

## 5.10 Assignment Submission Rate (7d)
```gs
=IFERROR(
  COUNTA(FILTER(AssignmentSubmissions!A2:A, AssignmentSubmissions!F2:F >= TODAY()-7)) /
  COUNTA(UNIQUE(FILTER(Enrolments!B2:B, Enrolments!D2:D >= TODAY()-7))),
0)
```

---

## 6) Course Performance Table (Recommended Columns)
For each course:
- `course_code`
- `course_title`
- `enrolments`
- `completions`
- `completion_%`
- `certificates`
- `avg_score`
- `active_learners_7d`

Use Pivot Table:
- Rows: `course_title`
- Values: distinct learners, completions, avg score
- Calculated field: `completion_% = completions / enrolments`

---

## 7) Funnel Metrics
Define stages and formulas:

1. **Onboarded**
```gs
=COUNTA(UNIQUE(Users!A2:A))
```

2. **Enrolled**
```gs
=COUNTA(UNIQUE(Enrolments!B2:B))
```

3. **Started** (at least one progress row)
```gs
=COUNTA(UNIQUE(Progress!B2:B))
```

4. **Completed** (any completed enrolment)
```gs
=COUNTA(UNIQUE(FILTER(Enrolments!B2:B, Enrolments!E2:E<>"")))
```

5. **Certified**
```gs
=COUNTA(UNIQUE(Certificates!B2:B))
```

---

## 8) Risk Panel Logic

## 8.1 Inactive Learners (No progress in 14 days)
```gs
=FILTER(Users!A2:C,
  ISNA(MATCH(Users!A2:A,
    UNIQUE(FILTER(Progress!B2:B, Progress!D2:D >= TODAY()-14)),0)))
```

## 8.2 Low Performance Learners
Threshold example: average score < 60
```gs
=QUERY(QuizAttempts!B2:E,
 "select B, avg(E) where E is not null group by B having avg(E) < 60",
 0)
```

## 8.3 No-Reaction Nudged Learners (24h)
Build by joining `notifications` vs `nudge_reactions` on user and window.

---

## 9) Dashboard Visualization Standards
Use standard LMS-friendly visuals:
- KPI cards (big number + delta)
- Line chart (weekly active learners)
- Stacked bar (course completion by status)
- Funnel chart (onboarded→certified)
- Heatmap (course x week completions)

Design rules:
- green = success/completion,
- amber = at risk,
- red = critical,
- keep max 8 visuals per page.

---

## 10) Automation Plan

## 10.1 Data Refresh Automation
Option A: n8n scheduled export
- Trigger: daily 06:00
- Query PostgreSQL tables
- Write CSV to cloud storage (Drive/S3)
- Refresh spreadsheet data sources

Option B: Google Apps Script pull
- Script fetches latest CSV links nightly
- Replaces raw data sheets
- Recomputes helper and dashboard sheets

## 10.2 Recommended n8n Automation Steps
1. Schedule trigger (daily)
2. Postgres queries per table
3. Convert to CSV
4. Upload/update files in Drive folder
5. Notify Slack channel with refresh summary

## 10.3 Data Quality Checks (Automated)
Run after refresh:
- row-count diff vs prior day (alert on >20% change)
- null checks on key IDs (`user_id`, `course_id`)
- duplicate key checks (`enrolments` unique user-course)
- stale data check (max timestamp < today-1)

---

## 11) Deployment Plan for Dashboard (User End)
1. Create dashboard workbook template with all tabs.
2. Configure CSV source paths.
3. Load historical backfill (e.g., 90 days).
4. Validate KPIs with known baseline counts.
5. Enable scheduled refresh automation.
6. Share read-only dashboard to stakeholders.
7. Run a 1-week hypercare monitoring window.

### 11.1 UAT Checklist
- KPI totals match DB spot checks.
- Funnel counts are monotonic (non-increasing stages).
- Course table completion % in valid range [0,100].
- Reaction rate and submission rate not >100%.
- Slack refresh notifications arrive daily.

### 11.2 Rollback
- Keep previous dashboard copy version.
- Keep previous day CSV snapshot.
- If refresh fails, restore prior snapshot and notify users.

---

## 12) Governance & Ownership
- **Data Owner**: LMS Ops
- **Dashboard Owner**: Analytics/Enablement
- **Automation Owner**: Platform Engineering
- **SLA**: daily refresh by 07:00 local time
- **Incident Path**: Slack #lms-ops + ticket with refresh job ID

---

## 13) Example Refresh Notification Template
```text
LMS Dashboard Refresh ✅
Date: {{run_date}}
Users: {{user_count}}
Enrolments: {{enrolment_count}}
Completions: {{completion_count}}
Nudge Reactions (24h): {{reaction_count}}
Assignment Submissions (24h): {{submission_count}}
Status: {{status}}
```
