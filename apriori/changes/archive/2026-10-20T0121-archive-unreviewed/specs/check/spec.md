<!-- apriori-base: sha256:9b1d7a0cfc7dbd12164658031b8b95c5c2045f9868a8016fe915fa852418d907 -->

# Delta — check (archive-unreviewed)

## ADDED Requirements

### Requirement: check names the archives the owner closed with the archive-unreviewed closeout
`apriori check` SHALL print one note naming every archived bundle whose manifest carries a `review` key (the owner's closeout, archive-unreviewed), each with the review state its manifest recorded: `closed by the owner's closeout (archive-unreviewed): <n> archived bundle(s) — <dir> (<state>), …` — so a closeout whose review converged is never reported as unconverged. It is information, never a failure, and a bundle archived on the normal path SHALL add nothing to it.

#### Scenario: CK-24 check names every closeout archive with its recorded review state
- WHEN a change with no review is closed with `--unreviewed` and `check` runs; a build-phase change whose review converged is closed with `--unreviewed` and `check` runs; and a change is archived on the normal path and `check` runs
- THEN the first passes and prints the note with a count of 1 and `<dir> (none)`; the second prints `<dir> (converged)` and no `without a converged` text; the third prints no such note
