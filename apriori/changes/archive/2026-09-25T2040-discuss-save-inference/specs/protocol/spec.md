<!-- apriori-base: sha256:da8cc4bb1d4783aaf931082275576444fba8271c785914078b97db36886cca74 -->
# Delta — protocol (discuss-save-inference)

## ADDED Requirements

### Requirement: a discuss save records a decision only as far as the human stated it
Refining the faithful-record rule (discuss-save-fidelity), the discuss stance (runbook §4 "Discuss first", the P6 prompt and the `/apriori-discuss` shell) SHALL state in both editions that: a decision is recorded only as far as the human stated it — what follows from it by the agent's own reasoning (an implied answer to another open question, a modelling or spec-structure consequence) is the agent's inference, written as `assumption` or left in `## Open`, never as their decision; a question the human did not answer stays open — silence is not a decision, even when the agent argued that two questions are one; and, with approval to save already held, the write happens only once the conclusion is settled, not during the discussion. Evidence: layer-2 batch 1 (2026-09-25, 10 real-client runs): run 006 recorded the agent's "one example row, no new scenario id" modelling inference as an owner decision; run 007 derived the empty-string semantics from "any string, no validation" and closed OPEN-1 the owner never answered; runs 001/007 wrote observed facts and open items before the owner had decided.

#### Scenario: DS-16 the shell states the three refinements and stays thin
- WHEN `templates/discuss.md` is read
- THEN it says `decision` only as far as they said it; the record as a whole is bounded by what the discussion raised (not by what the human said); no assumption, advice or inference of yours promoted to their decision or to fact; unanswered stays open — silence is not a decision; write only once the conclusion is settled (the inference examples live in the runbook) — while staying under the thin-shell bound, not copying the runbook paragraph, with golden and generation table following

#### Scenario: DS-17 both runbook editions carry the refinements in §4 and mirror them in P6
- WHEN `RUNBOOK.md` and `RUNBOOK_cn.md` are read
- THEN §4 "Discuss first" carries, each pinned on its own: only as far as the human stated it; the inference examples (implied answer, modelling or spec-structure consequence) go to `assumption` / `## Open`, never their decision; silence is not a decision even when two questions were argued to be one; write only once settled even with approval held; and the P6 block mirrors: your inference is not my decision; a question I did not answer stays open; write only once the conclusion is settled
