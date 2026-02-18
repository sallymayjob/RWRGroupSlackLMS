# Stress Test Results (5 Personas)

This stress test simulates 5 learner personas over a 5-day cycle with a Friday burst load to approximate quiz-day behavior in the Slack LMS supervisor flow.

## Test Runs

### Run A (`seed=42`, `workers=10`)

- Requests: 192
- Success Rate: 94.27%
- Avg/P95/P99 Latency: 311.57 / 396.18 / 422.56 ms
- Validation Failures: 5
- Integration Failures: notion=1, lm_table=5, sheets=2

### Run B (`seed=99`, `workers=20`)

- Requests: 192
- Success Rate: 93.75%
- Avg/P95/P99 Latency: 309.42 / 398.81 / 431.06 ms
- Validation Failures: 4
- Integration Failures: notion=1, lm_table=4, sheets=3

## Persona Breakdown (Run A)

| Persona | Requests | Success Rate | Avg Latency (ms) | P95 (ms) | Validation Failures |
|---|---:|---:|---:|---:|---:|
| Fast Finisher | 48 | 95.83% | 308.19 | 405.9 | 1 |
| Steady Learner | 36 | 97.22% | 318.41 | 385.49 | 0 |
| Needs Support | 42 | 95.24% | 315.99 | 395.85 | 0 |
| Feedback Heavy | 36 | 94.44% | 309.24 | 401.25 | 1 |
| At-Risk Catchup | 30 | 86.67% | 305.37 | 362.16 | 3 |

## Interpretation

- The synthetic pipeline remains sub-500ms at P99 under this test shape.
- Failure pressure is mostly from downstream write errors (LM table / Sheets), not routing latency.
- The At-Risk persona shows higher validation failures, indicating the need for stronger `/submit` UX guidance and retry prompts.
- Recommended next step: connect this harness to real webhook endpoint and collect true n8n execution durations per node.