# Stress Test Results (5 Personas)
This stress test simulates 5 learner personas over a 5-day cycle with a Friday burst load to approximate quiz-day behavior in the Slack LMS supervisor flow.
The harness now uses deterministic per-event randomization so results are repeatable for the same `seed` and input configuration.
## Test Runs
### Run A (`seed=42`, `workers=10`)
- Requests: 192
- Success Rate: 90.62%
- Avg/P95/P99 Latency: 307.63 / 395.74 / 422.08 ms
- Validation Failures: 7
- Integration Failures: notion=2, lm_table=4, sheets=5
- Command Mix: /complete=27, /enroll=10, /feedback=18, /quiz=11, /submit=70, /tutor=56
### Run B (`seed=99`, `workers=20`)
- Requests: 192
- Success Rate: 93.75%
- Avg/P95/P99 Latency: 307.23 / 392.64 / 424.63 ms
- Validation Failures: 6
- Integration Failures: notion=2, lm_table=1, sheets=3
- Command Mix: /complete=26, /enroll=13, /feedback=17, /quiz=17, /submit=69, /tutor=50
### Run C (`seed=7`, `workers=25`)
- Requests: 192
- Success Rate: 95.31%
- Avg/P95/P99 Latency: 311.29 / 393.74 / 437.8 ms
- Validation Failures: 5
- Integration Failures: notion=2, lm_table=1, sheets=1
- Command Mix: /complete=22, /enroll=12, /feedback=18, /quiz=17, /submit=66, /tutor=57
## Persona Breakdown (Run A)
| Persona | Requests | Success Rate | Avg Latency (ms) | P95 (ms) | Validation Failures |
|---|---:|---:|---:|---:|---:|
| Fast Finisher | 48 | 95.83% | 304.39 | 400.0 | 1 |
| Steady Learner | 36 | 91.67% | 300.89 | 388.67 | 1 |
| Needs Support | 42 | 90.48% | 309.83 | 396.86 | 1 |
| Feedback Heavy | 36 | 91.67% | 324.97 | 400.58 | 1 |
| At-Risk Catchup | 30 | 80.00% | 296.99 | 367.58 | 3 |

## Code Review Fixes Applied
- Fixed non-deterministic randomness under concurrency by using per-event seeded RNG instances.
- Switched latency computation to deterministic synthetic totals (instead of wall-clock timing noise).
- Added command distribution metrics (`command_counts`) to improve route-volume analysis.
- Added CLI guard for invalid worker counts (`--workers >= 1`).

## Interpretation
- P99 remains under ~440ms in this synthetic model across reviewed seeds.
- Most failures still come from downstream writes and submit validation errors rather than routing.
- At-Risk persona still has the highest validation failure pressure, so `/submit` guidance and retries remain a priority.
