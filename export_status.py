#!/usr/bin/env python3
"""James Executive Status reporter — aggregate metrics only, no PII."""

import json
import os
import socket
import sqlite3
import subprocess
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone

SERVICE_ID = "leadgen-platform"
DB_PATH = os.path.join(os.path.dirname(__file__), "data", "leads.db")
ENV_FILE = os.path.join(os.path.dirname(__file__), ".env.connector")


def load_env():
    env = {}
    try:
        with open(ENV_FILE) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, val = line.partition("=")
                env[key.strip()] = val.strip()
    except OSError as exc:
        raise SystemExit(f"Cannot read {ENV_FILE}: {exc}") from exc
    for required in ("JAMES_WEBHOOK_URL", "JAMES_PUSH_TOKEN"):
        if required not in env:
            raise SystemExit(f"Missing {required} in {ENV_FILE}")
    return env


def collect_db_metrics():
    """Return aggregate metrics from the database; raises on any error."""
    uri = f"file:{DB_PATH}?mode=ro"
    con = sqlite3.connect(uri, uri=True)
    try:
        cur = con.cursor()

        cur.execute("SELECT COUNT(*) FROM leads")
        total_leads = cur.fetchone()[0]

        cur.execute("SELECT status, COUNT(*) FROM leads GROUP BY status")
        leads_by_status = dict(cur.fetchall())

        cur.execute("SELECT COUNT(*) FROM pending_posts WHERE status='pending'")
        pending_posts_count = cur.fetchone()[0]

        cur.execute(
            "SELECT status, direction, COUNT(*) FROM communications GROUP BY status, direction"
        )
        comms_by_status_direction = [
            {"status": r[0], "direction": r[1], "count": r[2]}
            for r in cur.fetchall()
        ]

        cur.execute("SELECT stage, COUNT(*) FROM opportunities GROUP BY stage")
        opps_by_stage = dict(cur.fetchall())

        db_mtime = os.path.getmtime(DB_PATH)
        db_last_modified = datetime.fromtimestamp(db_mtime, tz=timezone.utc).isoformat()

        return {
            "total_leads": total_leads,
            "leads_by_status": leads_by_status,
            "pending_posts_count": pending_posts_count,
            "communications_by_status_direction": comms_by_status_direction,
            "opportunities_by_stage": opps_by_stage,
            "db_last_modified": db_last_modified,
        }
    finally:
        con.close()


def broker_status():
    try:
        result = subprocess.run(
            ["docker", "inspect", "--format={{.State.Status}}", "lead-broker"],
            capture_output=True, text=True, timeout=10
        )
        return result.stdout.strip() if result.returncode == 0 else "not_found"
    except Exception:
        return "error"


def tcp_reachable(host, port, timeout=3):
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def determine_health(db_ok, broker, port_ok):
    if not db_ok:
        return "critical"
    if broker != "running" or not port_ok:
        return "degraded"
    return "healthy"


def build_payload(db_metrics, broker, port_ok, health):
    return {
        "service_id": SERVICE_ID,
        "updated_at": datetime.now(tz=timezone.utc).isoformat(),
        "status": health,
        "metrics": {
            **db_metrics,
            "lead_broker_status": broker,
            "port_3002_reachable": port_ok,
        },
    }


def post_payload(payload, webhook_url, token):
    body = json.dumps(payload).encode()
    req = urllib.request.Request(
        webhook_url,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status
    except urllib.error.HTTPError as exc:
        raise SystemExit(f"Webhook HTTP error: {exc.code}") from exc
    except urllib.error.URLError as exc:
        raise SystemExit(f"Webhook connection error: {exc.reason}") from exc


def print_summary(health, db_metrics, broker, port_ok):
    print(f"health:              {health}")
    print(f"total_leads:         {db_metrics['total_leads']}")
    print(f"leads_by_status:     {db_metrics['leads_by_status']}")
    print(f"pending_posts:       {db_metrics['pending_posts_count']}")
    print(f"opps_by_stage:       {db_metrics['opportunities_by_stage']}")
    comms = db_metrics["communications_by_status_direction"]
    print(f"communications ({len(comms)} groups by status+direction)")
    print(f"db_last_modified:    {db_metrics['db_last_modified']}")
    print(f"lead_broker_status:  {broker}")
    print(f"port_3002_reachable: {port_ok}")


def main():
    dry_run = "--dry-run" in sys.argv

    env = load_env()

    db_ok = True
    db_metrics = {}
    try:
        db_metrics = collect_db_metrics()
    except Exception as exc:
        db_ok = False
        print(f"[ERROR] Database unavailable: {exc}", file=sys.stderr)

    broker = broker_status()
    port_ok = tcp_reachable("127.0.0.1", 3002)

    health = determine_health(db_ok, broker, port_ok)

    if db_ok:
        payload = build_payload(db_metrics, broker, port_ok, health)
    else:
        payload = {
            "service_id": SERVICE_ID,
            "updated_at": datetime.now(tz=timezone.utc).isoformat(),
            "status": health,
            "metrics": {
                "lead_broker_status": broker,
                "port_3002_reachable": port_ok,
            },
        }

    print_summary(health, db_metrics if db_ok else {}, broker, port_ok)

    if dry_run:
        print("\n[dry-run] Payload built — nothing sent.")
        return

    status_code = post_payload(payload, env["JAMES_WEBHOOK_URL"], env["JAMES_PUSH_TOKEN"])
    print(f"\nPushed — HTTP {status_code}")


if __name__ == "__main__":
    main()
