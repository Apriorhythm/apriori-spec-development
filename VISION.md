<p align="center">
  Languages:
  <a href="./VISION.md">English</a> ·
  <a href="./VISION_cn.md">中文</a>
</p>

# VISION — the North Star

> **Non-blocking guidance.** This file adds no gate and no exit condition; nothing in the workflow reads it as a requirement. The only obligation it creates: a change that *conflicts* with it records why, in that change's design notes. It exists so that the V2 line's improvements accumulate in one direction instead of scattering.

## 1. The Endgame

Scenarios become **executable**: the spec *is* the test suite. Every scenario is an assertion that runs; the prose handbook of a system is *generated from* its assertions, not maintained beside them. At that point the STEP2↔STEP5 consistency problem — "spec'd but not implemented, implemented but never spec'd" — disappears by construction, and the LLM's role in verification shrinks to judging what assertions cannot express: intent, taste, product fit.

## 2. Trigger Conditions

This handbook does **not** attempt the endgame today. It becomes the next major version's (V3) requirement when either holds:

- OpenSpec (or its successor in this workflow) supports executable scenarios natively, or
- an equivalent tool emerges and clears the same bar: scenario IDs, delta specs, archive-merge semantics.

Until then, any "executable spec" work is declared out of scope for the V2 line.

## 3. Paving Decisions

Choices already made on the V2 line whose deeper purpose is the endgame — keep them aligned:

| Decision | How it paves |
|---|---|
| Scenario IDs, and test names carrying them (§4.8, §8.1) | The ID is the future join key between an assertion and its run |
| The issue ledger with machine-readable statuses (§7.0) | Review outcomes become data an executable pipeline can consume |
| Verification matrix: executable instruments first where they exist (§4.8, §1.5) | The endgame is this principle taken to its limit |
| KB Contract sections stamped with `source-commit` (§6) | Contracts are the assertions-in-waiting; the stamp is their staleness oracle |
| P11/P12: extraction traced to an intent card, never to the prototype alone | Generated specs must inherit an intent anchor — same rule when a tool generates them |
