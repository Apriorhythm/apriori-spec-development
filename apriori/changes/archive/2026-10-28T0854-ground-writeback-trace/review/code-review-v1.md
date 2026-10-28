<!-- provenance: provider=anthropic model=claude-opus-5-5 session=subagent-round-1 date=2026-10-28 — written by the reviewer itself (R2: heterogeneous session, not the producer) -->

# code-review v1 — ground-writeback-trace (R2, independent)

Scope reviewed: `git diff v6-dev...HEAD` (e8f9342..800e2fc, 9 files), the contract
`apriori/changes/ground-writeback-trace/specs/protocol/spec.md` (PR-76), `flow-state.md`
(`## Open` is empty), and `apriori gate --change ground-writeback-trace --json` (only C8 blocks;
it is waiting for this round). I read the touched RUNBOOK sections in full context: §4 Ground,
§4 Specify, P1 and P2.

## Substantive issues

### GW-1 — the new Ground rule calls a fate the change itself will design an `assumption` and asks for it as `observed:`. That contradicts P2's definition of the three kinds and leaves no place for a `decision`.

**Description.** The new §4 Ground bullet (RUNBOOK.md:290) and its P1 twin (RUNBOOK.md:366) say
to record "as an `observed:` line what happens to the parts of the stored value **the new code**
cannot represent", and that "until the write-back has been read, that fate is an `assumption`,
with the lifecycle above — verified, or carried to `## Open`". The spec's ADDED Requirement and
PR-76 THEN use the same wording, and so does CHANGELOG.

Ground runs before any code is written, so "the new code" does not exist yet. The rule works in
one case only: the change reuses an existing read → adapter → write-back path. That is what
happened in the trigger: the editor adapter already existed and could be read. In that case the
fate is a fact about current code. `observed:` is correct, and `assumption` until it is read is
consistent with the lifecycle.

When the change builds or changes the write-back itself (a new editor, an extended serializer, a
replaced adapter), the fate of the parts that cannot be represented is not a fact. It is a
behavior the contract has to choose. The neighbouring rules already sort that case:

- P2 (RUNBOOK.md:376): "A choice the sources leave to you is `decision: producer — <choice>`; a
  user-visible behavior no source settles is the owner's question — an ## Open item, not your
  choice; **only an unproven fact is an assumption**."
- §4 Ground "Three kinds only": `assumption` is "a fact nobody has proven".
- The new §4 Specify / P2 clause itself says the runtime-update moment *states* this fate. That
  makes the fate a contract matter.

As written, the Ground rule overrides all three for this case. It labels a not-yet-designed
behavior an `assumption`. Its only exits are "verified" (impossible, because there is no
write-back to read yet) or "carried to `## Open`". So:

- (a) a fate a source already settles, e.g. "unknown conditions are preserved", has no legal
  home as a `decision` under this bullet;
- (b) a producer who reads the rule literally may write an `observed:` line about code that does
  not exist yet. That is exactly the "promotes an assumption into an observed fact" the runbook
  forbids elsewhere;
- (c) Ground cannot exit cleanly. The Exit requires no standing assumption, so every such change
  gets an `## Open` item at Ground whose real owner is the Specify runtime-update moment.

**Risk.** The runbook is the product, and here it gives the producer contradictory
classification rules on exactly the class of changes PR-76 targets. Depending on the reading, the
producer fabricates an observed line, or parks a design question as a fact-assumption and closes
it later without the owner/decision routing P2 requires. Either way, the rule PR-76 adds to stop
the B4 data loss can be satisfied on paper while the actual write-back path the change ships is
never checked against it at Ground.

**Suggested fix.** This is a wording fix in the same places, with no new mechanism. Scope the
`observed:`/`assumption` clause to the **existing** path: "what the current read → edit →
write-back path does to the parts of the stored value the changed representation cannot hold —
until that write-back has been read, it is an `assumption` …". Then add one clause: "where this
change builds or replaces the write-back, that fate is a behavior of the contract — the
runtime-update moment of Specify states it, as a `decision` when a source or the owner settles
it, otherwise an `## Open` item for the owner — not an assumption." Mirror the change in P1,
spec.md (Requirement + PR-76 THEN), CHANGELOG and the test's regexes. "the new code" can stay in
the Specify/P2 runtime-update clause, where it is correct, because at Specify time the contract
does describe the new code's behavior.

## Risk surfaces examined

- **Consistency with the assumption lifecycle (§4 Ground "Three kinds only") and the Ground
  Exit.** Consistent for the existing-path case; inconsistent for a write-back the change builds
  (GW-1).
- **Consistency with P2's "only an unproven fact is an assumption" and with the decision /
  owner-`## Open` routing.** Contradicted in the GW-1 case.
- **"Describe behavior, not implementation" (§4 Specify).** The new Specify/P2 clause asks the
  spec to state what happens to stored data. That is observable behavior and names no internal
  function, handler or payload field, so it does not conflict. Wording nit under A-2.
- **"Record only what later actions depend on" (§4 Ground / P1).** The bullet asks to *trace* the
  path but *record* only the fate line. No conflict, and no obligation to log every hop.
- **Scope against PR-76's "no gate, field, diagram, search action or new document".** Verified
  in the diff. No lib/ or bin/ change, no flow-state field, no new file besides the change's own
  bundle and test, no gate check. The trace is a targeted read of one structure's path, not a
  repo sweep, so it does not contradict P1's "rather than sweeping the repo". No self-added
  promise beyond the contract.
- **SPLIT.** Not needed. One result (one rule echoed in five places) and one evidence chain (one
  text test).
- **EN/CN parity.**
  - `docs/cli.md` / `docs/cli_cn.md` §8.1: the inclusion parenthetical and the runtime-update
    parenthetical agree.
  - `docs/concepts.md` / `docs/concepts_cn.md`: the walkthrough sentence (463) and the P2 design
    note (567/563) agree in content.
  - The RUNBOOK is English-only by rule (check.js refuses `RUNBOOK_cn.md`), so it needs no CN
    edition.
- **Test faithfulness (`test/ground-writeback-trace.test.js`).**
  - The RUNBOOK half asserts the scenario fully. It checks the bullet's location in §4 Ground,
    the trace wording, the four fates, the assumption clause, P1's location and wording, both
    shared-state rules with the runtime-update clause, and that PR-75 text is preserved.
  - The docs half asserts less than the THEN; see A-1.
  - Red baseline: v6-dev's RUNBOOK has 0 occurrences of the bullet heading, so the first
    `assert.ok(ground)` fails there.
  - `line(EN, '* Any external shared state')` and `line(EN, '- **Minimal means minimal.**')`
    each match exactly one line.
- **Runs.**
  - `node --test test/ground-writeback-trace.test.js`: 1/1 pass.
  - `node scripts/run-tests.mjs`: 919/919 pass.
  - `apriori check`: PASS.
  - `apriori gate --json`: BLOCKED only on C8, which is this review. C9 shows no open items.
- **Security surfaces** (unvalidated input, authz, secrets, injection): none touched. The diff
  is prose plus a read-only file test.
- **Not examined.**
  - Whether the rule actually changes producer behavior on the B4 case. That is an empirical
    question for an evaluation run and cannot be settled by reading.
  - The frozen `validation/**/apriori/runbook.md` lab copies, which are not shipped and
    correctly left untouched.
  - The source document the flow-state cites under `/root/asd-lab/...`, which is outside my
    boundary.

## Advisories (do not count toward the verdict)

- **A-1 — the docs half of the test asserts less than PR-76's THEN.**
  - The concepts check counts `whose meaning the change extends` (EN) and `扩展了语义` (CN) at
    least twice. It does not assert that the walkthrough carries the Ground trace or that the
    P2 note carries the runtime-update clause.
  - The cli checks assert only the inclusion parenthetical, not the new "Update at runtime (…)"
    clause.
  - The "no new mechanism" negative check scans only the four RUNBOOK snippets, not docs or
    CHANGELOG, and uses a fixed phrase list.

  The texts are correct today; the test would just not catch a later regression of those
  clauses. Suggest anchoring one assertion on each docs runtime-update clause.
- **A-2 — wording in the Specify/P2 runtime-update clause.** "The parts of the stored value the
  new code cannot represent" defines the condition by the code's capability. A spec author will
  have to turn that into something observable, such as "conditions the editor cannot show or
  edit". A gloss like "(what the changed page/API cannot show or edit)" would align it more
  visibly with "Describe behavior, not implementation". Not a contradiction.
- **A-3 — two other statements of the three-moments rule are not echoed.** `docs/concepts.md:427`
  / `docs/concepts_cn.md:427` (the walkthrough intro) and the `docs/legacy(.md/_cn.md)` table row
  both state the rule. The contract's "where they state the three-moments rule" arguably reaches
  427. Optional, since the operative statements are echoed.
- **A-4 — "kept, merged, dropped or refused" reads as a closed list.** A fate like "rewritten
  into a lossy equivalent" fits only under "dropped". Fine as examples; consider "e.g.".

VERDICT: gaps found
