#!/usr/bin/env python3
"""Jarvis Client Hunting CLI (Python entry).

Delegates to the TS pipeline so brand locks + Hermes routing stay single-sourced.

Usage:
  python scripts/run_client_hunting.py --brand fmk_agency
  python scripts/run_client_hunting.py --brand bulletseye --brief "Meta audit outreach"
  python scripts/run_client_hunting.py --brand fmk_wig --limit 4
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BRANDS = ("fmk_agency", "bulletseye", "fmk_wig")


def main() -> int:
    parser = argparse.ArgumentParser(description="FAOS Jarvis client hunting funnel")
    parser.add_argument("--brand", choices=BRANDS, required=False, help="Target brand")
    parser.add_argument("--brief", default="", help="Optional acquisition brief")
    parser.add_argument("--limit", type=int, default=5, help="Prospect count (1-12)")
    parser.add_argument("--list", action="store_true", help="List brand config")
    args = parser.parse_args()

    npx = shutil.which("npx")
    if not npx:
        print("npx not found — install Node 22+ to run the hunting pipeline", file=sys.stderr)
        return 1

    cmd = [npx, "tsx", str(ROOT / "scripts" / "run-client-hunting.ts")]
    if args.list:
        cmd.append("--list")
    if args.brand:
        cmd.extend(["--brand", args.brand])
    if args.brief:
        cmd.extend(["--brief", args.brief])
    if args.limit:
        cmd.extend(["--limit", str(args.limit)])

    env = dict(**{k: v for k, v in __import__("os").environ.items()})
    # Prefer local .env.local via scripts/load-env-local.ts (loaded by TS entry)
    proc = subprocess.run(cmd, cwd=str(ROOT), env=env)
    return int(proc.returncode)


if __name__ == "__main__":
    raise SystemExit(main())
