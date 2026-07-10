#!/usr/bin/env python3
"""pytest → apriori-friendly TAP.

pytest-tap emits `ok 1 tests/x.py::test_PY_01_name` — no ` - ` separator, and Python
identifiers can't contain hyphens, so scenario IDs are written PY_01 in test names.
This small adapter restores both: `ok 1 - PY-01 name`. Any language can play this
game — apriori only ever couples to TAP lines shaped `ok N - <ID> ...`.
"""
import re
import subprocess
import sys

proc = subprocess.run(
    [sys.executable, "-m", "pytest", "--tap-stream", "-q"],
    capture_output=True, text=True,
)
for line in proc.stdout.splitlines():
    m = re.match(r"^(ok|not ok) (\d+) (.*)$", line)
    if m:
        status, num, name = m.groups()
        idm = re.search(r"test_([A-Z]+)_(\d+)", name)
        tag = f"{idm.group(1)}-{idm.group(2)} " if idm else ""
        print(f"{status} {num} - {tag}{name}")
    else:
        print(line)
sys.exit(proc.returncode)
