# QA Validation: Performance + Regression + Penetration-Style Checks

## Performance Runs

| Users | Workers | Requests | Success Rate | P95 (ms) | P99 (ms) |
|---:|---:|---:|---:|---:|---:|
| 5 | 5 | 192 | 90.62% | 395.74 | 422.08 |
| 25 | 25 | 960 | 90.21% | 396.58 | 426.79 |
| 100 | 100 | 3840 | 91.04% | 398.55 | 425.52 |

## Regression Checks

- [PASS] users=5 `success_rate_regression` -> now=0.9062, baseline=0.9062, threshold=0.8862
- [PASS] users=5 `p95_latency_regression` -> now=395.74, baseline=395.74, threshold=410.74
- [PASS] users=25 `success_rate_regression` -> now=0.9021, baseline=0.9021, threshold=0.8821
- [PASS] users=25 `p95_latency_regression` -> now=396.58, baseline=396.58, threshold=411.58
- [PASS] users=100 `success_rate_regression` -> now=0.9104, baseline=0.9104, threshold=0.8904
- [PASS] users=100 `p95_latency_regression` -> now=398.55, baseline=398.55, threshold=413.55

## Penetration-Style Checks

- [PASS] `slack_signature_validation_node` -> workflow contains signature validation gate nodes
- [PASS] `unsupported_command_blocking` -> webhook response includes unsupported command rejection
- [PASS] `n8n_port_bound_loopback` -> docker compose does not expose n8n to all interfaces
- [PASS] `pinned_n8n_image` -> docker compose avoids floating latest tag
