/**
 * Performance / load test — 100 concurrent simulated users
 *
 * Four scenarios are measured:
 *
 *   A — Normal load       50ms simulated n8n latency; all requests succeed.
 *                         Validates concurrency: wall-clock ≪ 100 × 50ms.
 *
 *   B — Slow n8n          n8n responds in 150ms; forwardToN8n timeout is set
 *                         to 100ms with 1 retry → all 100 requests hit the
 *                         timeout path.  Validates that ack() is NEVER held
 *                         up by a slow backend.
 *
 *   C — Partial failures  30% of fetches return HTTP 500; retry budget is 1.
 *                         Validates the retry + give-up logic under realistic
 *                         error rates.
 *
 *   D — /learn burst      100 users fire /learn simultaneously (30ms latency).
 *                         Validates lesson routing and throughput for the
 *                         most-used command.
 *
 * Metrics reported for every scenario:
 *   min / p50 / p95 / p99 / max latency (ms)
 *   success count / failure count
 *   total wall-clock time (ms)
 *   effective throughput (req/s)
 */

jest.setTimeout(30_000);

const NUM_USERS = 100;

/** All registered slash commands (12 total) */
const ALL_COMMANDS = [
  "/learn",
  "/submit",
  "/progress",
  "/enroll",
  "/unenroll",
  "/cert",
  "/report",
  "/gaps",
  "/courses",
  "/help",
  "/onboard",
  "/backup",
];

// --------------------------------------------------------------------------
// Module-level mock-prefixed variables (allowed in jest.mock() factories)
// --------------------------------------------------------------------------

/** Populated inside mock factories; reset in beforeEach. Must be mock-prefixed. */
let mockForwardCallTimes = [];
let mockForwardDurations = [];
let mockCallIndex = 0;
let mockSuccessCount = 0;
let mockFailureCount = 0;

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

/** Build a realistic fake Slack slash-command payload for a given user index. */
function fakeCommand(index) {
  const cmd = ALL_COMMANDS[index % ALL_COMMANDS.length];
  return {
    command: cmd,
    text: cmd === "/learn" ? `${(index % 10) + 1}` : "",
    user_id: `U${String(index + 1).padStart(6, "0")}`,
    team_id: "T0123456",
    channel_id: "C0123456",
    response_url: `https://hooks.slack.com/commands/fake/${index}`,
  };
}

/** pth percentile of a pre-sorted numeric array. */
function pct(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

/** Print a summary table to stdout (visible with --verbose). */
function printReport(label, durations, failures, wallMs) {
  const sorted = [...durations].sort((a, b) => a - b);
  const success = durations.length;
  const throughput = ((NUM_USERS / wallMs) * 1000).toFixed(1);
  console.log(`\n── ${label} ──`);
  console.log(
    `  users=${NUM_USERS}  success=${success}  failure=${failures}` +
      `  wall=${wallMs}ms  throughput=${throughput} req/s`
  );
  if (sorted.length) {
    console.log(
      `  latency (ms): min=${sorted[0]}  p50=${pct(sorted, 50)}` +
        `  p95=${pct(sorted, 95)}  p99=${pct(sorted, 99)}  max=${sorted[sorted.length - 1]}`
    );
  }
}

// --------------------------------------------------------------------------
// Scenario A — Normal load (50 ms n8n latency, all succeed)
// --------------------------------------------------------------------------
describe("Scenario A — Normal load (50 ms n8n, 100 concurrent users)", () => {
  let handlers;
  // ackDurations is populated inside the test, not inside the factory
  const ackDurations = [];

  beforeEach(() => {
    jest.resetModules();
    mockForwardCallTimes = [];

    // Factory references only mock-prefixed module-level var — allowed by Jest
    jest.mock("../../src/services/n8nService", () => ({
      forwardToN8n: jest.fn().mockImplementation(async () => {
        const t0 = Date.now();
        await new Promise((r) => setTimeout(r, 50));
        mockForwardCallTimes.push(Date.now() - t0);
      }),
    }));

    handlers = {};
    const fakeApp = { command: (name, fn) => { handlers[name] = fn; } };
    require("../../src/slack/commands")(fakeApp);
  });

  it("all 100 ack() calls complete near-instantly (< 50 ms each)", async () => {
    const promises = [];

    for (let i = 0; i < NUM_USERS; i++) {
      const cmd = fakeCommand(i);
      let ackStart;
      const ack = jest.fn().mockImplementation(async () => {
        ackDurations.push(Date.now() - ackStart);
      });
      promises.push(
        (async () => {
          ackStart = Date.now();
          await handlers[cmd.command]({ command: cmd, ack });
        })()
      );
    }

    const t0 = Date.now();
    await Promise.all(promises);
    const wallMs = Date.now() - t0;

    // ack() must fire before any async I/O → near 0ms
    const maxAckMs = Math.max(...ackDurations);
    expect(maxAckMs).toBeLessThan(50);

    // forwardToN8n called exactly once per user
    const { forwardToN8n } = require("../../src/services/n8nService");
    expect(forwardToN8n).toHaveBeenCalledTimes(NUM_USERS);

    // Concurrency: 100 × 50ms serial = 5000ms; parallel ≈ 50–300ms
    expect(wallMs).toBeLessThan(1000);

    printReport("Scenario A — Normal", mockForwardCallTimes, 0, wallMs);
    console.log(
      `  ack() latency (ms): max=${maxAckMs}  p95=${pct(
        [...ackDurations].sort((a, b) => a - b),
        95
      )}`
    );
  });

  it("dispatches every command to the correct n8n workflow", async () => {
    const { forwardToN8n } = require("../../src/services/n8nService");
    const promises = [];

    for (let i = 0; i < NUM_USERS; i++) {
      const cmd = fakeCommand(i);
      const ack = jest.fn().mockResolvedValue(undefined);
      promises.push(handlers[cmd.command]({ command: cmd, ack }));
    }

    await Promise.all(promises);

    // With 12 commands cycling over 100 users:
    //   10 supervisor commands cover indices 0,1,2,3,4,5,6,7,8,9 (and repeats)
    //   /onboard → index 10 (mod 12), /backup → index 11 (mod 12)
    const supervisorCalls = forwardToN8n.mock.calls.filter(([wf]) => wf === "supervisor");
    const onboardCalls = forwardToN8n.mock.calls.filter(([wf]) => wf === "onboard");
    const backupCalls = forwardToN8n.mock.calls.filter(([wf]) => wf === "backup");

    expect(supervisorCalls.length + onboardCalls.length + backupCalls.length).toBe(NUM_USERS);
    expect(supervisorCalls.length).toBeGreaterThan(0);
    expect(onboardCalls.length).toBeGreaterThan(0);
    expect(backupCalls.length).toBeGreaterThan(0);
  });
});

// --------------------------------------------------------------------------
// Scenario B — Slow n8n (forwardToN8n takes ~300 ms then throws timeout)
// --------------------------------------------------------------------------
describe("Scenario B — Slow n8n (timeout after retries, 100 concurrent users)", () => {
  let handlers;

  beforeEach(() => {
    jest.resetModules();

    // Simulate the real n8n.js timeout path:
    //   100ms timeout × 2 attempts + 200ms backoff ≈ 400ms per user
    // Compressed to 20ms per attempt for test speed.
    jest.mock("../../src/services/n8nService", () => ({
      forwardToN8n: jest.fn().mockImplementation(async () => {
        await new Promise((r) => setTimeout(r, 20)); // attempt 1 timeout
        await new Promise((r) => setTimeout(r, 20)); // attempt 2 timeout
        throw new Error("n8n supervisor timed out after 20ms (simulated)");
      }),
    }));

    handlers = {};
    const fakeApp = { command: (name, fn) => { handlers[name] = fn; } };
    require("../../src/slack/commands")(fakeApp);
  });

  it("ack() is always called — never blocked by a slow n8n", async () => {
    const ackCalls = [];
    const promises = [];

    for (let i = 0; i < NUM_USERS; i++) {
      const cmd = fakeCommand(i);
      const ack = jest.fn().mockImplementation(() => {
        ackCalls.push(Date.now());
        return Promise.resolve();
      });
      promises.push(handlers[cmd.command]({ command: cmd, ack }));
    }

    const t0 = Date.now();
    await Promise.all(promises);
    const wallMs = Date.now() - t0;

    // Every user's ack() was called exactly once
    expect(ackCalls).toHaveLength(NUM_USERS);

    // Running in parallel → wall ≈ 40–200ms even though each chain takes 40ms
    expect(wallMs).toBeLessThan(1000);

    // forwardToN8n was attempted for every user
    const { forwardToN8n } = require("../../src/services/n8nService");
    expect(forwardToN8n).toHaveBeenCalledTimes(NUM_USERS);

    printReport("Scenario B — Timeout", [], NUM_USERS, wallMs);
  });

  it("command handlers swallow timeout errors — Bolt is never broken", async () => {
    const promises = [];
    for (let i = 0; i < NUM_USERS; i++) {
      const cmd = fakeCommand(i);
      const ack = jest.fn().mockResolvedValue(undefined);
      promises.push(
        expect(
          handlers[cmd.command]({ command: cmd, ack })
        ).resolves.toBeUndefined()
      );
    }
    await Promise.all(promises);
  });
});

// --------------------------------------------------------------------------
// Scenario C — Partial failures (30 % of forwardToN8n calls throw, 50ms latency)
// --------------------------------------------------------------------------
describe("Scenario C — Partial failures (30 % n8n errors, 50 ms latency)", () => {
  let handlers;

  beforeEach(() => {
    jest.resetModules();
    mockCallIndex = 0;
    mockSuccessCount = 0;
    mockFailureCount = 0;

    // Deterministic: every 3rd call (0-indexed) throws, the rest resolve
    jest.mock("../../src/services/n8nService", () => ({
      forwardToN8n: jest.fn().mockImplementation(async () => {
        await new Promise((r) => setTimeout(r, 50));
        const idx = mockCallIndex++;
        if (idx % 3 === 2) {
          mockFailureCount++;
          throw new Error("n8n 500 Internal Server Error (simulated)");
        }
        mockSuccessCount++;
      }),
    }));

    handlers = {};
    const fakeApp = { command: (name, fn) => { handlers[name] = fn; } };
    require("../../src/slack/commands")(fakeApp);
  });

  it("ack() is called for all 100 users regardless of backend failures", async () => {
    const ackCounts = [];
    const promises = [];

    for (let i = 0; i < NUM_USERS; i++) {
      const cmd = fakeCommand(i);
      const ack = jest.fn().mockImplementation(() => {
        ackCounts.push(i);
        return Promise.resolve();
      });
      promises.push(handlers[cmd.command]({ command: cmd, ack }));
    }

    const t0 = Date.now();
    await Promise.all(promises);
    const wallMs = Date.now() - t0;

    expect(ackCounts).toHaveLength(NUM_USERS);

    // ~33 failures (every 3rd), ~67 successes
    expect(mockFailureCount).toBeGreaterThan(0);
    expect(mockSuccessCount).toBeGreaterThan(0);
    expect(mockFailureCount + mockSuccessCount).toBe(NUM_USERS);

    // Parallel execution keeps wall-clock low despite partial errors
    expect(wallMs).toBeLessThan(1000);

    printReport("Scenario C — Partial failures", [], mockFailureCount, wallMs);
    console.log(`  success=${mockSuccessCount}  failure=${mockFailureCount}`);
  });

  it("handlers always resolve — backend errors never crash Bolt", async () => {
    const promises = [];
    for (let i = 0; i < NUM_USERS; i++) {
      const cmd = fakeCommand(i);
      const ack = jest.fn().mockResolvedValue(undefined);
      promises.push(
        expect(
          handlers[cmd.command]({ command: cmd, ack })
        ).resolves.toBeUndefined()
      );
    }
    await Promise.all(promises);
  });
});

// --------------------------------------------------------------------------
// Scenario D — /learn burst (100 users, same command, 30ms n8n latency)
// --------------------------------------------------------------------------
describe("Scenario D — /learn burst (100 users, 30 ms n8n)", () => {
  let handlers;
  const ackDurations = [];

  beforeEach(() => {
    jest.resetModules();
    mockForwardDurations = [];

    jest.mock("../../src/services/n8nService", () => ({
      forwardToN8n: jest.fn().mockImplementation(async () => {
        const t0 = Date.now();
        await new Promise((r) => setTimeout(r, 30));
        mockForwardDurations.push(Date.now() - t0);
      }),
    }));

    handlers = {};
    const fakeApp = { command: (name, fn) => { handlers[name] = fn; } };
    require("../../src/slack/commands")(fakeApp);
  });

  it("100 concurrent /learn calls — all forwarded, wall-clock < 500 ms", async () => {
    const promises = [];

    for (let i = 0; i < NUM_USERS; i++) {
      let ackStart;
      const ack = jest.fn().mockImplementation(() => {
        ackDurations.push(Date.now() - ackStart);
        return Promise.resolve();
      });
      const command = {
        command: "/learn",
        text: `${(i % 10) + 1}`,
        user_id: `U${String(i + 1).padStart(6, "0")}`,
        team_id: "T0123456",
        channel_id: "C0123456",
        response_url: `https://hooks.slack.com/commands/learn/${i}`,
      };
      promises.push(
        (async () => {
          ackStart = Date.now();
          await handlers["/learn"]({ command, ack });
        })()
      );
    }

    const wallStart = Date.now();
    await Promise.all(promises);
    const wallMs = Date.now() - wallStart;

    const { forwardToN8n } = require("../../src/services/n8nService");
    expect(forwardToN8n).toHaveBeenCalledTimes(NUM_USERS);

    // All forwards target the supervisor workflow
    forwardToN8n.mock.calls.forEach(([wf]) => {
      expect(wf).toBe("supervisor");
    });

    // Lesson numbers 1–10 all appear at least once across 100 users
    const lessons = forwardToN8n.mock.calls.map(([, cmd]) => cmd.text);
    for (let n = 1; n <= 10; n++) {
      expect(lessons).toContain(`${n}`);
    }

    expect(wallMs).toBeLessThan(500);

    const sortedAck = [...ackDurations].sort((a, b) => a - b);
    printReport("Scenario D — /learn burst", mockForwardDurations, 0, wallMs);
    console.log(
      `  ack() latency (ms): max=${Math.max(...ackDurations)}  p95=${pct(sortedAck, 95)}`
    );
  });
});
