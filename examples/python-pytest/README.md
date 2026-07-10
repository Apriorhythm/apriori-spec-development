# Python + pytest example

The smallest possible apriori-bound Python project: one module (`slug.py`), one spec
(`apriori/specs/slug/spec.md`, scenarios PY-01..03), one test file whose test names carry
the scenario IDs (`test_PY_01_...` — Python identifiers can't contain hyphens, so the
adapter below restores them).

```shell
pip install pytest pytest-tap
apriori verify --specs apriori/specs --test-cmd "python run_tap.py"
```

Expect `RESULT: GREEN — spec is the test suite`.

`run_tap.py` is the whole integration: pytest-tap's dialect (`ok 1 tests/x.py::test_PY_01_name`)
lacks the ` - ` separator apriori's TAP parser couples to, and encodes IDs with underscores —
the adapter normalizes both. This is the pattern for ANY language: emit TAP lines shaped
`ok N - <ID> ...` and every apriori gate works unchanged. This example runs in CI on every push.
