"""Scenario IDs live at the START of each test name — that is the whole binding contract."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from slug import slugify


def test_PY_01_lowercases_and_hyphenates():
    assert slugify("Hello World") == "hello-world"


def test_PY_02_collapses_runs_and_trims_edges():
    assert slugify("  --Big__Deal!! ") == "big-deal"


def test_PY_03_empty_and_symbol_only_input():
    assert slugify("***") == ""
