# CURRICULUM ALIGNMENT AUDIT — RWR GROUP SLACK LMS

## TASK
Check the entire Notion Lessons database against the RWR Group Training
Content Mapped 12-Month Employee Pathway CSV. Use the Topic or Hook field
from each Notion lesson as the basis for matching.

## DATA SOURCES
- Notion Lessons database: collection://565f1776-df27-461b-99e3-b70b2ee11dd2
- CSV: RWR_Group_Training_Content_Mapped___12_Month_Employee_Pathway__Map.csv
  (available in project files at /mnt/project/)

## STEPS
1. Read the CSV from project files and extract all 12 months of weekly themes.
2. Query the Notion Lessons database and pull the Topic and Hook fields for
   all available lessons, grouped by Month and Week.
3. Compare month by month. For each month, check whether the Notion Topic/Hook
   content matches the corresponding CSV weekly theme — use semantic matching,
   not exact string matching.
4. Flag any of these conditions:
   - MATCH: Notion and CSV are aligned in topic and intent
   - PARTIAL: Same theme but different emphasis or scope
   - MISMATCH: Notion covers a different topic than CSV at the same position
   - EMPTY: Notion lesson exists but has no Topic or Hook populated
   - MISSING: Lesson expected by CSV has no Notion record at all

## OUTPUT FORMAT
Produce a structured audit report with:

1. Month-Level Scoreboard (M01–M12)
   - Notion month title vs CSV month title
   - Alignment verdict: MATCH / PARTIAL / MISMATCH
   - Notes on any intentional curriculum evolution vs genuine gaps

2. Week-Level Verification Sample
   - For each month, verify at least W01 and W02 against actual lesson Hook text
   - Quote the Hook used for comparison

3. Critical Findings
   - Any topic displacement between months (e.g. content moved from one month
     to another vs the CSV)
   - Any CSV content that appears absent from Notion entirely

4. Production Status Summary
   - Per month: how many lessons are Ready / Draft / Empty
   - Total Ready vs total expected (288)

5. Recommended Actions
   - HIGH: Must fix before launch
   - MEDIUM: Fix before content completion
   - LOW: Nice to have

## CONSTRAINTS
- Use Topic OR Hook — whichever is populated — as the matching basis
- Treat deliberate curriculum evolution (e.g. topics moved to a more logical
  month) as NOTED, not as an error
- Produce a .docx audit report and save to /mnt/user-data/outputs/
