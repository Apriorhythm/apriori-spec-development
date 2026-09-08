# AC8 fixture — 1012769, reconstructed as the hotfix bundle it should have had

**This is NOT an original artefact.** No `.md` ever existed for 1012769 — the defect
archive held two screenshots and one investigation SQL, and nothing else. Everything here
is reconstructed from the 总复盘 account (§墙二 and the defect table) to answer one
question mechanically: *would the lane have carried this record, and at what grade?*

The reconstruction is deliberately faithful to what was actually known at the time, not to
what we know now. Where the account is silent, the field is left as the lane would have
demanded it be filled — and that demand is itself part of the finding.

## The account, in one paragraph

A machine swap rebuilt the operations machine in the new backend and migrated its
mainboard. `BR-007` ("a mainboard-fallback conflict is not attributed") had been written
without anyone — author or reviewer — knowing that operation chain existed. The result was
a false conflict and three lost orders (¥133, measured in UAT). The fix deleted the
`MACHINE_CONFLICT` branch from the code. The spec store still said the old thing.

## What the lane would have said

The reconstructed bundle (`hotfix-state.md` + `specs/` below) declares a spec delta that
**rewrites the selection criteria of `BR-007`** — a block no human has whitelisted.

    grade: (R3, n/a) — an unannotated delta block changes the living contract (fail-up)
                       — rejected for the hotfix lane — open a formal change

**That is the correct answer, and it is the point.** 1012769 is the single highest
criteria-content ticket of all fourteen; the lane exists so that small records get written,
not so that criteria rewrites skip review. What the lane changes for this ticket is not the
route — it is that the *refusal happens in ten seconds, mechanically, with the formal route
named*, instead of the record simply never being written.

## The part the lane WOULD have carried

Split the ticket the way it actually decomposed and the lane carries the half that was
lost entirely:

- `no-code` + one decision — the business fact learned after release (a machine swap
  rebuilds the machine and migrates the mainboard, so a fallback conflict CAN be genuine).
  Grade `(R0, n/a)`, one point-check reading the decision against the conclusion, appended
  to `truth/<module>.md` as a ratified decision. **This is the "上线后学到的业务事实" the
  账 says nothing currently catches.**
- The criteria rewrite itself stays a formal change, as it always should have been.

Reconstructed from: `~/apriori-feedback/棕地落地总复盘-给规范作者的改进依据.md` §墙二,
and the defect table row for 1012769.
