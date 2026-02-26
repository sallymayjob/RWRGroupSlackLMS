# Slack LMS Schema (Notion + Delivery Architecture)

This schema package captures your latest workspace and curriculum structure:

- **Workspace URL**: `https://www.notion.so/Slack-LMS-RWR-Group-30558a9ec642819785c7d39dbce75ef1`
- **Root Page ID**: `30558a9ec642819785c7d39dbce75ef1`

- **Architecture**: Notion = content authoring, PostgreSQL = learner state, Slack = delivery.
- **Program shape**: **12 months × 4 weeks × 6 lessons** = **288 lessons**.
- **Curriculum hierarchy**: **Course → Months → Lessons**.

## Workspace Structure

- Curriculum (Courses, Months, Lessons)
- Dashboard
- Curriculum (pages/sections)
- Tools
- System
- Old Empty Scaffolds (safe to delete)

## Files

- `data/notion_curriculum_schema.csv` — Notion database-level schema for Courses, Months, Lessons.
- `data/notion_lessons_ulc_spec.csv` — Universal Lesson Canvas (ULC) constraints for lesson authoring.

## Universal Lesson Canvas (ULC)

Each lesson should follow this order:

1. **Hook** — 2 sentences, curiosity/challenge.
2. **Core Content** — max 300 words, practitioner-level.
3. **Insight** — 1 sentence, max 50 words.
4. **Takeaway** — 1 sentence, max 15 words.
5. **Mission** — verb-first task, under 5 minutes, existing tools.
6. **Verification** — one question, mission completion required.
7. **Submit Block** — `/submit <lesson_code>` + reaction alternative.

## n8n Mapping Notes

- Use `LessonID` as immutable upsert key for Lessons.
- Ensure `Submit Command` value exactly matches progress tracker parser (`/submit <lesson_code>`).
- Enforce ULC constraints in a Code node before writing to Notion (word/sentence limits).
- Keep sync order: **Notion → LM data table (PostgreSQL) → Google Sheets dashboard**.
