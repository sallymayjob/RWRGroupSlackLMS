# Security Policy

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Report vulnerabilities privately to the RWR Group engineering team:

- **Email:** security@rwrgroup.com
- **Response SLA:** Initial acknowledgement within 2 business days; severity assessment within 5 business days.
- **Process:** You will receive updates as the issue is investigated and remediated. We will credit researchers who responsibly disclose issues unless they prefer to remain anonymous.

---

## Security Review Findings

This section tracks findings from internal security reviews and their remediation status.

---

### High Risk

#### 1. Missing Slack Request Signature Validation
| | |
|---|---|
| **Risk** | Anyone could POST forged requests to the n8n supervisor webhook, triggering enrolment and progress actions without a real Slack user. |
| **Fix** | Added `Validate Slack Signature` (Code node) + `Signature Valid?` gate to `n8n/workflows/supervisor-router.json`. The Code node computes `HMAC-SHA256(v0:<timestamp>:<rawBody>)` using `SLACK_SIGNING_SECRET`, performs a constant-time comparison (`timingSafeEqual`) against the `x-slack-signature` header, and rejects requests with timestamps older than 5 minutes to prevent replay attacks. Invalid requests receive HTTP 401 and are not processed further. |
| **Status** | ✅ Remediated |

#### 2. Publicly Exposed n8n Service Port
| | |
|---|---|
| **Risk** | n8n UI and webhook endpoints reachable on all host interfaces without reverse-proxy controls, allowing direct external access. |
| **Fix** | Added the `n8n` service to `docker-compose.yml` and bound its port to the loopback interface only: `127.0.0.1:5678:5678`. |
| **Status** | ✅ Remediated |

---

### Medium Risk

#### 1. Floating Container Image Tags (`latest`)
| | |
|---|---|
| **Risk** | Non-reproducible deployments; unreviewed upstream updates could introduce security regressions without notice. |
| **Fix** | Pinned the n8n image to a concrete, reviewed version: `n8nio/n8n:1.107.4` in `docker-compose.yml`. |
| **Status** | ✅ Remediated |

#### 2. Secure Cookie Control Not Enforced
| | |
|---|---|
| **Risk** | Session cookie protections (`Secure`, `HttpOnly`, `SameSite`) may be omitted due to environment drift, exposing session tokens over unencrypted connections. |
| **Fix** | Explicitly set `N8N_SECURE_COOKIE=true` in the `n8n` service environment block in `docker-compose.yml`. |
| **Status** | ✅ Remediated |

---

### Remaining Recommendations

These items have not yet been remediated and should be tracked as follow-up work:

- **Webhook rate limiting** — Add rate limiting at the reverse-proxy level for `/webhook/*` paths to reduce brute-force and abuse risk.
- **Command access control** — Restrict high-impact commands (e.g., `/enroll`, `/report`, `/gaps`) by validating the calling Slack user ID against a roles allowlist before dispatching to agents.
- **Audit alerting** — Add monitoring alerts for repeated invalid signature attempts and unusual enrolment activity (e.g., rapid bulk enrolments from a single user).
- **Secret hygiene** — Ensure `.env` files are never committed to the repository. Rotate all secrets immediately if a leak is suspected. Verify `.env` is listed in `.gitignore`.
