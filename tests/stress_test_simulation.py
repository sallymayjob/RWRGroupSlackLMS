#!/usr/bin/env python3
"""Synthetic stress test for Slack LMS supervisor routing and sync pipeline.

This simulates 5 concurrent learner personas sending Slack commands over a 5-day week,
including Friday quiz burst and feedback spikes.
"""

from __future__ import annotations

import argparse
import json
import random
import statistics
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List


@dataclass
class Persona:
    name: str
    commands_per_day: int
    feedback_rate: float
    support_rate: float
    submit_accuracy: float


PERSONAS: List[Persona] = [
    Persona("Fast Finisher", 8, 0.03, 0.04, 0.97),
    Persona("Steady Learner", 6, 0.06, 0.08, 0.92),
    Persona("Needs Support", 7, 0.10, 0.22, 0.85),
    Persona("Feedback Heavy", 6, 0.25, 0.07, 0.90),
    Persona("At-Risk Catchup", 5, 0.12, 0.18, 0.72),
]

# Synthetic latency profile per stage (seconds)
LATENCY_PROFILE = {
    "parse": (0.005, 0.020),
    "route": (0.002, 0.010),
    "agent": (0.060, 0.220),
    "notion_write": (0.020, 0.090),
    "lm_table_write": (0.015, 0.070),
    "sheets_write": (0.020, 0.085),
}

# Random failure rates per integration write
FAILURE_RATES = {
    "notion_write": 0.010,
    "lm_table_write": 0.015,
    "sheets_write": 0.020,
}


def stage_time(stage: str) -> float:
    low, high = LATENCY_PROFILE[stage]
    return random.uniform(low, high)


def maybe_fail(stage: str) -> bool:
    return random.random() < FAILURE_RATES[stage]


def pick_command(persona: Persona, day: int) -> str:
    # Heavier /quiz usage Friday (day=5)
    pool = ["/submit", "/complete", "/tutor", "/enroll"]
    weights = [0.44, 0.18, 0.18, 0.07]

    if random.random() < persona.feedback_rate:
        return "/feedback"
    if random.random() < persona.support_rate:
        return "/tutor"
    if day == 5 and random.random() < 0.25:
        return "/quiz"

    return random.choices(pool, weights=weights, k=1)[0]


def command_to_agent(command: str) -> int:
    return {
        "/submit": 4,
        "/complete": 4,
        "/feedback": 5,
        "/enroll": 8,
        "/quiz": 2,
        "/tutor": 3,
    }.get(command, 6)


def process_event(persona: Persona, day: int, event_id: int) -> Dict:
    t0 = time.perf_counter()

    command = pick_command(persona, day)
    agent_id = command_to_agent(command)

    # synthetic path
    time.sleep(stage_time("parse"))
    time.sleep(stage_time("route"))
    time.sleep(stage_time("agent"))

    write_failures = []
    for stage in ("notion_write", "lm_table_write", "sheets_write"):
        time.sleep(stage_time(stage))
        if maybe_fail(stage):
            write_failures.append(stage)

    # business-rule failures: invalid submissions for lower accuracy personas
    validation_failed = False
    if command == "/submit" and random.random() > persona.submit_accuracy:
        validation_failed = True

    elapsed_ms = (time.perf_counter() - t0) * 1000

    return {
        "event_id": event_id,
        "persona": persona.name,
        "day": day,
        "command": command,
        "agent_id": agent_id,
        "latency_ms": elapsed_ms,
        "write_failures": write_failures,
        "validation_failed": validation_failed,
        "success": not write_failures and not validation_failed,
    }


def percentile(values: List[float], p: float) -> float:
    if not values:
        return 0.0
    values_sorted = sorted(values)
    k = (len(values_sorted) - 1) * p
    f = int(k)
    c = min(f + 1, len(values_sorted) - 1)
    if f == c:
        return values_sorted[f]
    return values_sorted[f] + (values_sorted[c] - values_sorted[f]) * (k - f)


def run_simulation(seed: int, max_workers: int, output_path: Path) -> Dict:
    random.seed(seed)

    futures = []
    results: List[Dict] = []
    event_id = 1

    with ThreadPoolExecutor(max_workers=max_workers) as ex:
        for day in range(1, 6):
            for persona in PERSONAS:
                # Friday quiz burst multiplier
                mult = 2 if day == 5 else 1
                total = persona.commands_per_day * mult
                for _ in range(total):
                    futures.append(ex.submit(process_event, persona, day, event_id))
                    event_id += 1

        for f in as_completed(futures):
            results.append(f.result())

    latencies = [r["latency_ms"] for r in results]
    success_count = sum(1 for r in results if r["success"])
    validation_failures = sum(1 for r in results if r["validation_failed"])

    integration_failures = {
        "notion_write": 0,
        "lm_table_write": 0,
        "sheets_write": 0,
    }
    for r in results:
        for stage in r["write_failures"]:
            integration_failures[stage] += 1

    by_persona: Dict[str, Dict] = {}
    for p in PERSONAS:
        subset = [r for r in results if r["persona"] == p.name]
        lats = [r["latency_ms"] for r in subset]
        by_persona[p.name] = {
            "requests": len(subset),
            "success_rate": round(sum(1 for x in subset if x["success"]) / max(len(subset), 1), 4),
            "avg_latency_ms": round(statistics.mean(lats), 2) if lats else 0.0,
            "p95_latency_ms": round(percentile(lats, 0.95), 2) if lats else 0.0,
            "validation_failures": sum(1 for x in subset if x["validation_failed"]),
        }

    summary = {
        "config": {
            "seed": seed,
            "max_workers": max_workers,
            "personas": [p.name for p in PERSONAS],
            "days": 5,
        },
        "totals": {
            "requests": len(results),
            "successes": success_count,
            "failures": len(results) - success_count,
            "success_rate": round(success_count / max(len(results), 1), 4),
            "validation_failures": validation_failures,
        },
        "latency": {
            "avg_ms": round(statistics.mean(latencies), 2) if latencies else 0.0,
            "p50_ms": round(percentile(latencies, 0.50), 2) if latencies else 0.0,
            "p95_ms": round(percentile(latencies, 0.95), 2) if latencies else 0.0,
            "p99_ms": round(percentile(latencies, 0.99), 2) if latencies else 0.0,
            "max_ms": round(max(latencies), 2) if latencies else 0.0,
        },
        "integration_failures": integration_failures,
        "by_persona": by_persona,
        "generated_at_epoch": time.time(),
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(summary, indent=2))
    return summary


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--workers", type=int, default=10)
    parser.add_argument("--output", default="reports/stress_test_results.json")
    args = parser.parse_args()

    summary = run_simulation(args.seed, args.workers, Path(args.output))

    print("=== Stress Test Summary ===")
    print(f"Requests: {summary['totals']['requests']}")
    print(f"Success Rate: {summary['totals']['success_rate']*100:.2f}%")
    print(f"Avg Latency: {summary['latency']['avg_ms']} ms")
    print(f"P95 Latency: {summary['latency']['p95_ms']} ms")
    print(f"P99 Latency: {summary['latency']['p99_ms']} ms")
    print("Integration Failures:", summary["integration_failures"])


if __name__ == "__main__":
    main()
