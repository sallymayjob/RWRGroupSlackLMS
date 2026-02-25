# Stress Test: 5 to 100 Simultaneous Users

Synthetic deterministic stress tests were executed with `--users` from 5 to 100 and matching worker concurrency (`--workers = users`).

| Users | Workers | Requests | Success Rate | Avg Latency (ms) | P95 (ms) | P99 (ms) | Validation Failures | Notion Fails | LM Table Fails | Sheets Fails |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5 | 5 | 192 | 90.62% | 307.63 | 395.74 | 422.08 | 7 | 2 | 4 | 5 |
| 10 | 10 | 384 | 89.84% | 306.43 | 397.5 | 422.51 | 19 | 2 | 10 | 10 |
| 25 | 25 | 960 | 90.21% | 310.05 | 396.58 | 426.79 | 45 | 10 | 15 | 24 |
| 50 | 50 | 1920 | 92.14% | 307.87 | 401.83 | 425.04 | 73 | 23 | 22 | 40 |
| 75 | 75 | 2880 | 92.29% | 308.06 | 399.44 | 424.98 | 106 | 30 | 42 | 52 |
| 100 | 100 | 3840 | 91.04% | 309.0 | 398.55 | 425.52 | 161 | 32 | 73 | 95 |

## Observations

- Lowest P95 latency in this run set: **395.74 ms** at **5 users**.
- At **100 users**, latency remained around **avg 309.0 ms / P95 398.55 ms / P99 425.52 ms**.
- Downstream failure counts scale with volume, especially LM table and Sheets writes, indicating retry/backoff tuning should focus there.
