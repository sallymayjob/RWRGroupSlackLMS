/**
 * Tests for the "Build Summary" Code node (Agent 14 — backup workflow).
 *
 * The test harness mimics the n8n Code node execution context:
 *   $  — function that looks up another node by name:
 *         $('NodeName').all() → [{ json: <rowData> }, ...]
 */
const { run } = require("../../n8n/code/build-backup-summary");

// ── Test helper ───────────────────────────────────────────────────────────────

/**
 * Build the n8n $() lookup function.
 * @param {Record<string, object[]>} nodeData  Map of node name → array of row objects
 */
function makeNodeLookup(nodeData) {
  return function $(nodeName) {
    const rows = nodeData[nodeName] ?? [];
    return { all: () => rows.map((json) => ({ json })) };
  };
}

/**
 * Build a typical "Query DB Snapshot" result set.
 * @param {object} overrides  Any table counts to override from the defaults.
 */
function snapshotRows(overrides = {}) {
  const counts = {
    users: 10,
    courses: 3,
    modules: 15,
    enrolments: 25,
    progress: 80,
    certificates: 5,
    ...overrides,
  };
  const snapshot_at = "2026-02-24 02:00:00";
  return Object.entries(counts).map(([table_name, row_count]) => ({
    table_name,
    row_count,
    snapshot_at,
  }));
}

// ── Output shape ──────────────────────────────────────────────────────────────

describe("Build Backup Summary — output shape", () => {
  it("returns exactly one item", () => {
    const $ = makeNodeLookup({ "Query DB Snapshot": snapshotRows() });
    expect(run({ $ })).toHaveLength(1);
  });

  it("returns an item with a string text field", () => {
    const $ = makeNodeLookup({ "Query DB Snapshot": snapshotRows() });
    const [{ json }] = run({ $ });
    expect(typeof json.text).toBe("string");
    expect(json.text.length).toBeGreaterThan(0);
  });
});

// ── Count values ──────────────────────────────────────────────────────────────

describe("Build Backup Summary — count values", () => {
  it("embeds progress record count", () => {
    const $ = makeNodeLookup({ "Query DB Snapshot": snapshotRows({ progress: 42 }) });
    const [{ json }] = run({ $ });
    expect(json.text).toContain("Progress records: 42");
  });

  it("embeds enrollment count", () => {
    const $ = makeNodeLookup({ "Query DB Snapshot": snapshotRows({ enrolments: 7 }) });
    const [{ json }] = run({ $ });
    expect(json.text).toContain("Enrollments: 7");
  });

  it("embeds certificate count", () => {
    const $ = makeNodeLookup({ "Query DB Snapshot": snapshotRows({ certificates: 3 }) });
    const [{ json }] = run({ $ });
    expect(json.text).toContain("Certificates: 3");
  });

  it("embeds user count", () => {
    const $ = makeNodeLookup({ "Query DB Snapshot": snapshotRows({ users: 50 }) });
    const [{ json }] = run({ $ });
    expect(json.text).toContain("Total users: 50");
  });

  it("embeds course count", () => {
    const $ = makeNodeLookup({ "Query DB Snapshot": snapshotRows({ courses: 8 }) });
    const [{ json }] = run({ $ });
    expect(json.text).toContain("Courses: 8");
  });

  it("embeds module count", () => {
    const $ = makeNodeLookup({ "Query DB Snapshot": snapshotRows({ modules: 40 }) });
    const [{ json }] = run({ $ });
    expect(json.text).toContain("Modules: 40");
  });
});

// ── Zero / missing values ─────────────────────────────────────────────────────

describe("Build Backup Summary — zero / missing values", () => {
  it("defaults all counts to 0 when the snapshot query returns no rows", () => {
    const $ = makeNodeLookup({ "Query DB Snapshot": [] });
    const [{ json }] = run({ $ });
    expect(json.text).toContain("Progress records: 0");
    expect(json.text).toContain("Enrollments: 0");
    expect(json.text).toContain("Certificates: 0");
    expect(json.text).toContain("Total users: 0");
    expect(json.text).toContain("Courses: 0");
    expect(json.text).toContain("Modules: 0");
  });

  it("defaults a missing table to 0 without affecting other counts", () => {
    // Omit 'certificates' from the snapshot rows
    const rows = snapshotRows().filter((r) => r.table_name !== "certificates");
    const $ = makeNodeLookup({ "Query DB Snapshot": rows });
    const [{ json }] = run({ $ });
    expect(json.text).toContain("Certificates: 0");
    // Other counts should still be correct
    expect(json.text).toContain("Progress records: 80");
  });
});

// ── Formatting ────────────────────────────────────────────────────────────────

describe("Build Backup Summary — formatting", () => {
  it("includes a Slack bold heading", () => {
    const $ = makeNodeLookup({ "Query DB Snapshot": snapshotRows() });
    const [{ json }] = run({ $ });
    expect(json.text).toMatch(/\*LMS Google Sheets Backup Complete\*/);
  });

  it("includes a UTC timestamp ending in GMT", () => {
    const $ = makeNodeLookup({ "Query DB Snapshot": snapshotRows() });
    const [{ json }] = run({ $ });
    expect(json.text).toMatch(/GMT/);
  });

  it("uses bullet points for each metric line", () => {
    const $ = makeNodeLookup({ "Query DB Snapshot": snapshotRows() });
    const [{ json }] = run({ $ });
    const bulletCount = (json.text.match(/•/g) || []).length;
    expect(bulletCount).toBe(4); // progress, enrollments, certificates, totals line
  });
});
