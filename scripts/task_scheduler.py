"""
Collaborative Task Management System
Algorithmic Task Scheduler — task_scheduler.py

Demonstrates OOP & algorithmic thinking applied to task scheduling:
  • Priority Score formula  : urgency * weight + complexity penalty
  • Greedy scheduling algo  : assigns tasks to time-slots by score
  • Output                  : reports/schedule.json + prints schedule table

Algorithm Time Complexity: O(n log n) — dominated by the sort step.
Space Complexity: O(n)

Usage:
  python task_scheduler.py
  python task_scheduler.py --slots 5
"""

import json
import os
import sys
import argparse
from dataclasses import dataclass, field
from datetime import datetime, timedelta

# Fix Windows UTF-8 console output
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

REPORTS_DIR = os.path.join(os.path.dirname(__file__), "..", "reports")


# ─── Data Model ──────────────────────────────────────────────────────────────
@dataclass
class ScheduleTask:
    """Represents a task with scheduling metadata."""
    id: int
    title: str
    status: str
    urgency: int        # 1 (low) → 5 (critical)
    complexity: int     # 1 (trivial) → 5 (very complex)
    priority_score: float = field(init=False)

    def __post_init__(self):
        # Priority formula: high urgency boosted, penalised by complexity
        # Scores tasks that are urgent but not overly complex highest
        self.priority_score = (self.urgency * 2.5) - (self.complexity * 0.5)


# ─── Scheduler ───────────────────────────────────────────────────────────────
class TaskScheduler:
    """
    Greedy scheduler: sorts tasks by priority_score (descending) and
    assigns each to the next available time slot.
    """

    DEMO_TASKS = [
        ScheduleTask(id=1, title="Fix critical login bug",          status="todo",        urgency=5, complexity=2),
        ScheduleTask(id=2, title="Deploy to production",            status="todo",        urgency=4, complexity=4),
        ScheduleTask(id=3, title="Write unit tests",                status="todo",        urgency=3, complexity=3),
        ScheduleTask(id=4, title="Update API documentation",        status="in-progress", urgency=2, complexity=1),
        ScheduleTask(id=5, title="Optimise DB queries",             status="todo",        urgency=4, complexity=3),
        ScheduleTask(id=6, title="Add email notification feature",  status="todo",        urgency=2, complexity=4),
        ScheduleTask(id=7, title="Code review PR #42",              status="todo",        urgency=3, complexity=2),
    ]

    def __init__(self, tasks: list[ScheduleTask] | None = None, num_slots: int = 4):
        self.tasks = [t for t in (tasks or self.DEMO_TASKS) if t.status != "done"]
        self.num_slots = num_slots
        self.schedule: list[dict] = []

    def sort_by_priority(self) -> list[ScheduleTask]:
        """O(n log n) — sort descending by priority_score."""
        return sorted(self.tasks, key=lambda t: t.priority_score, reverse=True)

    def build_schedule(self) -> list[dict]:
        """
        Greedily assign tasks to time slots.
        Each slot is a 2-hour block starting from now (rounded to next hour).
        """
        sorted_tasks = self.sort_by_priority()
        os.makedirs(REPORTS_DIR, exist_ok=True)

        # Round current time to next full hour
        now = datetime.now().replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
        slot_duration = timedelta(hours=2)

        self.schedule = []
        for i, task in enumerate(sorted_tasks[:self.num_slots]):
            slot_start = now + (i * slot_duration)
            slot_end   = slot_start + slot_duration
            self.schedule.append({
                "slot":           i + 1,
                "start_time":     slot_start.strftime("%H:%M"),
                "end_time":       slot_end.strftime("%H:%M"),
                "task_id":        task.id,
                "task_title":     task.title,
                "urgency":        task.urgency,
                "complexity":     task.complexity,
                "priority_score": round(task.priority_score, 2),
            })

        unscheduled = sorted_tasks[self.num_slots:]
        return self.schedule

    def print_schedule(self):
        """Pretty-print the schedule table to stdout."""
        print("\n" + "=" * 70)
        print("  TASKFLOW — ALGORITHMIC SCHEDULE  (greedy, O(n log n) sort)")
        print(f"  Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
        print("=" * 70)
        print(f"  {'Slot':<5} {'Time':<14} {'Task':<38} {'Score':>5}")
        print("-" * 70)
        for entry in self.schedule:
            print(
                f"  {entry['slot']:<5} "
                f"{entry['start_time']}–{entry['end_time']}  "
                f"{entry['task_title']:<38} "
                f"{entry['priority_score']:>5.1f}"
            )
        print("=" * 70 + "\n")

    def export_json(self) -> str:
        """Save schedule to JSON for the frontend API."""
        payload = {
            "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "algorithm": "Greedy Priority Scheduling — O(n log n)",
            "slots": self.num_slots,
            "schedule": self.schedule,
        }
        path = os.path.join(REPORTS_DIR, "schedule.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)
        print(f"[OK] Schedule saved → {path}")
        # Emit for Node.js child_process stdout capture
        print("SCHEDULE_JSON:" + json.dumps(payload))
        return path

    def run(self):
        print("\n[PYTHON] TaskFlow Scheduler starting...\n")
        self.build_schedule()
        self.print_schedule()
        self.export_json()
        print("[OK] Scheduling complete!\n")


# ─── CLI Entry Point ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run task scheduling algorithm")
    parser.add_argument("--slots", type=int, default=4, help="Number of time slots to fill")
    args = parser.parse_args()

    scheduler = TaskScheduler(num_slots=args.slots)
    scheduler.run()
