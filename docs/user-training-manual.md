# RWRGroup Slack LMS — User Training Manual

## 1) Purpose
This manual helps team members use the RWRGroup Learning Management System (LMS) directly from Slack.

The LMS lets you:
- enroll in courses,
- read lessons,
- submit work,
- track progress,
- earn certificates,
- ask for help and recommendations.

---

## 2) Prerequisites
Before you begin, make sure:
- you are in a Slack workspace where the LMS app is installed,
- you can use slash commands in your channel or DM,
- your account has been onboarded (or run `/onboard`).

---

## 3) Quick Start (5 steps)
1. Run `/onboard` to initialize your learning profile.
2. Run `/courses` to view available courses.
3. Run `/enroll <course_code>` to join a course.
4. Run `/learn` to receive your lesson.
5. Complete the task and run `/submit <your_answer>`.

---

## 4) Core Commands

### Enrollment & setup
- `/onboard`  
  Creates/updates your learner profile and enrolls you in onboarding flow (if configured).

- `/courses`  
  Lists available courses and course codes.

- `/enroll <course_code>`  
  Enrolls you into a course.

- `/unenroll <course_code>`  
  Removes your enrollment from a course.

### Learning flow
- `/learn`  
  Returns your current lesson/module.

- `/submit <answer_or_work>`  
  Submits your response for evaluation and progression.

- `/progress`  
  Shows completion status, course/module progress, and key milestones.

- `/cert`  
  Checks and issues certificate status when completion criteria are met.

### Reporting & support
- `/report`  
  Provides a summarized learning report (team/admin context may vary by setup).

- `/gaps`  
  Identifies weak areas or skill gaps to focus next.

- `/help`  
  Displays command guidance and support prompts.

### Admin/ops command
- `/backup`  
  Triggers backup workflow (typically restricted or monitored).

---

## 5) Typical Learner Journey
1. **Discover**: `/courses`
2. **Join**: `/enroll SAFE101`
3. **Study**: `/learn`
4. **Submit**: `/submit ...`
5. **Track**: `/progress`
6. **Complete**: `/cert`

Repeat until all assigned courses are complete.

---

## 6) Best Practices
- Use LMS commands in a DM with the bot when possible to reduce channel noise.
- Keep `/submit` answers clear and complete.
- Check `/progress` after each submission.
- Use `/gaps` weekly to target weak areas.
- If you’re unsure what to do next, use `/help`.

---

## 7) Troubleshooting

### I get no response from a command
- Wait a few seconds and retry once.
- Confirm command spelling (e.g., `/progress`, not `/progess`).
- Try in a DM with the LMS app.

### I cannot enroll
- Verify the exact course code from `/courses`.
- Ensure you are already onboarded (`/onboard`).

### My progress did not update
- Re-run `/progress` after a short delay.
- Confirm your `/submit` contained actual answer content.

### Certificate not available yet
- Make sure all required modules are complete.
- Run `/progress` first, then `/cert`.

### Slash command not found
- LMS app may not be installed in your workspace/channel.
- Contact your Slack workspace admin.

---

## 8) FAQ
**Q: Can I take multiple courses at once?**  
A: Yes, if your workspace policy allows it.

**Q: Can I restart a course?**  
A: Usually by unenrolling and re-enrolling (`/unenroll`, then `/enroll`).

**Q: Who can run `/backup`?**  
A: Typically admins/ops; access depends on workspace policy.

---

## 9) Support Escalation
If issues persist, share with support:
- command used,
- timestamp,
- channel/DM context,
- screenshot or exact error text.

This helps admins trace workflow and fix issues faster.
