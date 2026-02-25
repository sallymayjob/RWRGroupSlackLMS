# n8n Workflow Modernization Matrix

Assessment basis: node `type` and `typeVersion` values in each exported workflow JSON.

| Workflow | Node Count | Key Node Versions | LangChain Agent | Modernization Status | Notes |
|---|---:|---|---|---|---|
| `agent-02-quiz-master.json` | 12 | agent v2 (1); code v2 (1); httpRequest v4.2 (4); if v2.3 (3); postgres v2.5 (2); workflowTrigger v1 (1) | Yes | Modern core nodes | No Function/Function Item nodes found |
| `agent-03-tutor.json` | 6 | agent v2 (1); httpRequest v4.2 (2); if v2.3 (1); postgres v2.5 (1); workflowTrigger v1 (1) | Yes | Modern core nodes | No Function/Function Item nodes found |
| `agent-04-progress-tracker.json` | 6 | agent v2 (1); httpRequest v4.2 (2); if v2.3 (1); postgres v2.5 (1); workflowTrigger v1 (1) | Yes | Modern core nodes | No Function/Function Item nodes found |
| `agent-05-course-catalog.json` | 4 | code v2 (1); httpRequest v4.2 (1); postgres v2.5 (1); workflowTrigger v1 (1) | No | Modern core nodes | No Function/Function Item nodes found |
| `agent-06-help.json` | 2 | httpRequest v4.2 (1); workflowTrigger v1 (1) | No | Modern core nodes | No Function/Function Item nodes found |
| `agent-07-certification.json` | 9 | agent v2 (1); httpRequest v4.2 (3); if v2.3 (2); postgres v2.5 (2); workflowTrigger v1 (1) | Yes | Modern core nodes | No Function/Function Item nodes found |
| `agent-08-enrollment-manager.json` | 11 | code v2 (1); httpRequest v4.2 (4); if v2.3 (3); postgres v2.5 (2); workflowTrigger v1 (1) | No | Modern core nodes | No Function/Function Item nodes found |
| `agent-09-gap-analyst.json` | 5 | agent v2 (1); httpRequest v4.2 (1); postgres v2.5 (2); workflowTrigger v1 (1) | Yes | Modern core nodes | No Function/Function Item nodes found |
| `agent-10-unenroll.json` | 9 | code v2 (1); httpRequest v4.2 (3); if v2.3 (2); postgres v2.5 (2); workflowTrigger v1 (1) | No | Modern core nodes | No Function/Function Item nodes found |
| `agent-11-proactive-nudge.json` | 4 | httpRequest v4.2 (1); postgres v2.5 (2); scheduleTrigger v1.2 (1) | No | Modern core nodes | No Function/Function Item nodes found |
| `agent-12-reporting-agent.json` | 4 | agent v2 (1); httpRequest v4.2 (1); postgres v2.5 (1); workflowTrigger v1 (1) | Yes | Modern core nodes | No Function/Function Item nodes found |
| `agent-13-onboarding-agent.json` | 6 | agent v2 (1); httpRequest v4.2 (1); postgres v2.5 (3); workflowTrigger v1 (1) | Yes | Modern core nodes | No Function/Function Item nodes found |
| `agent-14-backup-to-sheets.json` | 18 | code v2 (2); googleSheets v4.5 (7); httpRequest v4.2 (1); if v2.3 (1); postgres v2.5 (4); respondToWebhook v1.1 (1); scheduleTrigger v1.2 (1); webhook v1 (1) | No | Modern core nodes | No Function/Function Item nodes found |
| `supervisor-router.json` | 20 | code v2 (2); executeWorkflow v1.3 (11); if v2.3 (2); manualTrigger v1 (1); respondToWebhook v1.1 (1); switch v3.4 (1); webhook v1 (1) | No | Modern core nodes | No Function/Function Item nodes found |

## Global findings

- No `n8n-nodes-base.function` or `n8n-nodes-base.functionItem` nodes were detected in any workflow export.
- Common versions in use are modern families: `httpRequest` v4.2, `postgres` v2.5, `if` v2.3, `switch` v3.4, `code` v2, and `googleSheets` v4.5.
- Webhook/trigger nodes (`webhook` v1, `respondToWebhook` v1.1, `workflowTrigger` v1, `scheduleTrigger` v1.2) are current normal tracks for those node classes in many n8n deployments.
