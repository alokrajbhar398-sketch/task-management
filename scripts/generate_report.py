"""
Collaborative Task Management System
Python Reporting Utility — generate_report.py

Connects to the MySQL database, reads all tasks, and produces:
  1. reports/task_report.csv  — raw task data export
  2. reports/summary.txt      — human-readable productivity summary

Usage:
  python generate_report.py
  python generate_report.py --user_id 3   (filter for one user)

OOP Design: TaskReporter class encapsulates all DB + file I/O logic.
"""

import os
import csv
import json
import sys
import argparse
from datetime import datetime

# ─── Fix Windows UTF-8 console encoding ──────────────────────────────────────
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

# ─── Try importing optional MySQL driver ─────────────────────────────────────
try:
    import mysql.connector
    DB_AVAILABLE = True
except ImportError:
    DB_AVAILABLE = False

# ─── Environment config (mirrors backend/.env) ───────────────────────────────
DB_CONFIG = {
    "host":     os.environ.get("DB_HOST",     "localhost"),
    "user":     os.environ.get("DB_USER",     "root"),
    "password": os.environ.get("DB_PASSWORD", ""),
    "database": os.environ.get("DB_NAME",     "task_management_db"),
}

REPORTS_DIR = os.path.join(os.path.dirname(__file__), "..", "reports")


class TaskReporter:
    """Encapsulates report generation logic following OOP principles."""

    def __init__(self, user_id: int | None = None):
        self.user_id = user_id
        self.tasks: list[dict] = []
        os.makedirs(REPORTS_DIR, exist_ok=True)

    # ── Data Layer ──────────────────────────────────────────────────────────
    def fetch_tasks(self) -> bool:
        """Fetch tasks from MySQL. Returns True on success."""
        if not DB_AVAILABLE:
            print("[WARN] mysql-connector-python not installed. Using demo data.")
            self._load_demo_data()
            return True

        try:
            conn = mysql.connector.connect(**DB_CONFIG)
            cursor = conn.cursor(dictionary=True)

            if self.user_id:
                cursor.execute(
                    """
                    SELECT t.id, t.title, t.description, t.status,
                           t.created_at, u.name AS assigned_to
                    FROM tasks t
                    JOIN users u ON t.user_id = u.id
                    WHERE t.user_id = %s
                    ORDER BY t.created_at DESC
                    """,
                    (self.user_id,),
                )
            else:
                cursor.execute(
                    """
                    SELECT t.id, t.title, t.description, t.status,
                           t.created_at, u.name AS assigned_to
                    FROM tasks t
                    JOIN users u ON t.user_id = u.id
                    ORDER BY t.created_at DESC
                    """
                )

            self.tasks = cursor.fetchall()
            # Make datetime objects JSON-serialisable
            for task in self.tasks:
                if isinstance(task.get("created_at"), datetime):
                    task["created_at"] = task["created_at"].strftime("%Y-%m-%d %H:%M:%S")

            cursor.close()
            conn.close()
            return True

        except Exception as exc:
            print(f"[ERROR] DB connection failed: {exc}")
            print("[INFO]  Falling back to demo data.")
            self._load_demo_data()
            return True

    def _load_demo_data(self):
        """Provide realistic demo tasks when MySQL is unavailable."""
        self.tasks = [
            {"id": 1, "title": "Design login screen",      "description": "Create Figma mockups",           "status": "done",        "created_at": "2023-10-01 09:00:00", "assigned_to": "Alok Kumar Rajbhar"},
            {"id": 2, "title": "Set up MySQL schema",       "description": "Normalized DB with FK constraints","status": "done",       "created_at": "2023-10-05 10:30:00", "assigned_to": "Alok Kumar Rajbhar"},
            {"id": 3, "title": "Build REST API endpoints",  "description": "Auth + Task CRUD routes",         "status": "done",        "created_at": "2023-10-10 11:00:00", "assigned_to": "Alok Kumar Rajbhar"},
            {"id": 4, "title": "React + TypeScript frontend","description": "Dashboard with Kanban board",    "status": "in-progress", "created_at": "2023-11-01 09:00:00", "assigned_to": "Alok Kumar Rajbhar"},
            {"id": 5, "title": "Python reporting scripts",  "description": "CSV export + scheduling algo",   "status": "in-progress", "created_at": "2023-11-15 14:00:00", "assigned_to": "Alok Kumar Rajbhar"},
            {"id": 6, "title": "Write unit tests",          "description": "Cover all API endpoints",        "status": "todo",        "created_at": "2023-12-01 09:00:00", "assigned_to": "Alok Kumar Rajbhar"},
            {"id": 7, "title": "Deploy to production",      "description": "Docker + cloud hosting",         "status": "todo",        "created_at": "2023-12-10 09:00:00", "assigned_to": "Alok Kumar Rajbhar"},
        ]

    # ── Report Generation ───────────────────────────────────────────────────
    def export_csv(self) -> str:
        """Write tasks to a CSV file. Returns the file path."""
        path = os.path.join(REPORTS_DIR, "task_report.csv")
        fieldnames = ["id", "title", "description", "status", "created_at", "assigned_to"]

        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(self.tasks)

        print(f"[OK] CSV report saved → {path}")
        return path

    def export_summary(self) -> str:
        """Write a human-readable summary text file. Returns the file path."""
        total   = len(self.tasks)
        done    = sum(1 for t in self.tasks if t["status"] == "done")
        in_prog = sum(1 for t in self.tasks if t["status"] == "in-progress")
        todo    = sum(1 for t in self.tasks if t["status"] == "todo")
        pct     = round((done / total * 100) if total else 0, 1)

        lines = [
            "=" * 60,
            "  TASK MANAGEMENT SYSTEM — PRODUCTIVITY REPORT",
            f"  Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            "=" * 60,
            "",
            f"  Total Tasks   : {total}",
            f"  Completed     : {done}   ({pct}%)",
            f"  In Progress   : {in_prog}",
            f"  To Do         : {todo}",
            "",
            "-" * 60,
            "  TASK BREAKDOWN",
            "-" * 60,
        ]

        # Group by status for readability
        for status_label, key in [("✅ DONE", "done"), ("⚙️  IN PROGRESS", "in-progress"), ("📋 TO DO", "todo")]:
            group = [t for t in self.tasks if t["status"] == key]
            if group:
                lines.append(f"\n  {status_label}:")
                for t in group:
                    lines.append(f"    [{t['id']:>3}] {t['title']}")
                    if t.get("assigned_to"):
                        lines.append(f"          → {t['assigned_to']}")

        lines += ["", "=" * 60]

        path = os.path.join(REPORTS_DIR, "summary.txt")
        with open(path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))

        print(f"[OK] Summary report saved → {path}")
        return path

    def export_json(self) -> str:
        """Export a JSON snapshot for the frontend API to consume."""
        total   = len(self.tasks)
        done    = sum(1 for t in self.tasks if t["status"] == "done")
        in_prog = sum(1 for t in self.tasks if t["status"] == "in-progress")
        todo    = sum(1 for t in self.tasks if t["status"] == "todo")

        payload = {
            "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "summary": {
                "total": total,
                "done": done,
                "in_progress": in_prog,
                "todo": todo,
                "completion_pct": round((done / total * 100) if total else 0, 1),
            },
            "tasks": self.tasks,
        }

        path = os.path.join(REPORTS_DIR, "report.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, default=str)

        print(f"[OK] JSON snapshot saved → {path}")
        # Also print to stdout so the Node.js child_process can read it
        print("REPORT_JSON:" + json.dumps(payload))
        return path

    def run(self):
        """Orchestrate the full report pipeline."""
        print(f"\n[PYTHON] TaskFlow Reporter starting...\n")
        self.fetch_tasks()
        self.export_csv()
        self.export_summary()
        self.export_json()
        print("\n[OK] All reports generated successfully!\n")


# ─── CLI Entry Point ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate TaskFlow reports")
    parser.add_argument("--user_id", type=int, default=None, help="Filter report to a specific user ID")
    args = parser.parse_args()

    reporter = TaskReporter(user_id=args.user_id)
    reporter.run()
