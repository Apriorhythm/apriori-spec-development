<!-- provenance: provider=codex model=gpt-6-astra session=01a0d877-7f73-7b81-a5a3-1ea6388ca7fa date=2026-09-25 -->
# code-review — discuss-save-fidelity (round 2)

- DSF-01 — resolved: `test/discuss.test.js:203`, `:219`, `:229`, and `:245` now independently assert the safeguards in each edition’s §4 and P6. The previously unprotected exclusions of unstated reasons, conditions, and risk acceptances have explicit assertions. P6’s additions, assumption status, recommendation boundary, open questions, and substantive idempotence no longer sit inside unchecked wildcard spans. Static inspection confirms that deleting the clauses identified in round 1 would fail their corresponding assertions. No further fix required.

- ADV-03 — addressed: `templates/discuss.md:23`, `RUNBOOK.md:413`, and `RUNBOOK_cn.md:404` now consistently express substantive idempotence. Both P6 mirrors explicitly exclude unstated conditions as well as reasons. These changes preserve the binding §4 rule and the existing save-versus-development authorization boundary.

- ADV-05 — Size measurement correction: `templates/discuss.md:1` measures **2,599 characters** using DS-02’s JavaScript `s.length`, rather than the reported 2,598. It still satisfies `< 2600`. The golden matches exactly, and `lib/managed.js:23` contains the matching digest as the newest discuss generation. No required fix; optional shortening would leave more headroom.

No new substantive findings. Reviewed the current diff, updated DS-14/DS-15 specification, bilingual wording, assertions, golden equality, and generation digest. The shell remains a pointer and explicitly preserves the runbook’s binding authority. Tests provide textual regression protection; real-client behavioral acceptance remains the external layer-2 responsibility. The reported suite, verify, and self-check results were not independently rerun.

VERDICT: no spec-vs-code gaps