"""Atomic JSON-file transactions for ERP cross-module writes.

Mirrors SQL/Mongoose session semantics for the file-backed store:
load → mutate in memory → atomic save, or discard on any failure.
"""

from __future__ import annotations

import copy
import json
import os
import tempfile
import threading
from pathlib import Path
from typing import Any, Callable, Dict, TypeVar

T = TypeVar("T")

_LOCK = threading.RLock()


def load_db(path: Path, default_db: Dict[str, Any]) -> Dict[str, Any]:
    """Read DB under lock without writing."""
    with _LOCK:
        if path.exists():
            with path.open("r", encoding="utf-8") as f:
                data = json.load(f)
        else:
            data = copy.deepcopy(default_db)
        for key, default in default_db.items():
            data.setdefault(key, copy.deepcopy(default))
        return data


def atomic_save(path: Path, data: Dict[str, Any]) -> None:
    """Write JSON via temp file + os.replace for crash-safe persistence."""
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(
        prefix=f".{path.name}.",
        suffix=".tmp",
        dir=str(path.parent),
    )
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as tmp:
            json.dump(data, tmp, indent=2)
            tmp.flush()
            os.fsync(tmp.fileno())
        os.replace(tmp_name, path)
    except Exception:
        try:
            os.unlink(tmp_name)
        except OSError:
            pass
        raise


def run_transaction(
    path: Path,
    default_db: Dict[str, Any],
    mutator: Callable[[Dict[str, Any]], T],
) -> T:
    """Execute mutator against a deep-copied DB; persist only on success."""
    with _LOCK:
        if path.exists():
            with path.open("r", encoding="utf-8") as f:
                data = json.load(f)
        else:
            data = copy.deepcopy(default_db)

        for key, default in default_db.items():
            data.setdefault(key, copy.deepcopy(default))

        working = copy.deepcopy(data)
        try:
            result = mutator(working)
            atomic_save(path, working)
            return result
        except Exception:
            # Never persist partial mutations — working copy discarded.
            raise
