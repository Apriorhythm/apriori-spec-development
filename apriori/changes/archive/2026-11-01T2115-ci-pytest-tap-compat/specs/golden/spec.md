<!-- apriori-base: sha256:a605f197d4012ba2978143d5de8cc65038533dbdaeae60f937d88c1dc4f8bf69 -->

# Delta — golden (ci-pytest-tap-compat)

## ADDED Requirements

### Requirement: the Python example installs a pytest that pytest-tap supports
The CI workflow's `python-example` job and the example's README SHALL install pytest below 9 together with pytest-tap (`pip install "pytest<9" pytest-tap`), and the README SHALL say why: pytest 9.2 breaks pytest-tap 3.5 when the plugin loads, so the example's test command exits 3 with no TAP and `verify` refuses the run.

#### Scenario: WN-02 the Python example installs a pytest that pytest-tap supports, in CI and in its README
- WHEN `.github/workflows/ci.yml`'s `python-example` job and `examples/python-pytest/README.md` are read
- THEN the job's install step is `pip install "pytest<9" pytest-tap`, the README carries the same line, and the README names pytest 9 as the reason for the pin

## Notes

Found by the 6.1.0 release CI (PR #2, 2026-11-01): pytest 9.2.0 had just been released; with it, pytest-tap 3.5 fails at load (`ValueError: option dest 'tap_stream' already used by ['--tap']`). Reproduced locally in a fresh venv; with pytest 8.4.2 the example is GREEN (PY-01..03). An external release, not a change in apriori; the pin is lifted when pytest-tap supports pytest 9.
