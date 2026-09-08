change: change-bundle
tier: large          # layout-wide restructuring across CLI + protocol docs; dual-layout compatibility surface
track: harden
track-rationale: owner-ordered bundle layout; 4.0.0 single layout, one-time self-migration (owner: 直接切 4.0.0 版本算了)
lineage: branch change/change-bundle off v3 @59289ce (owner: 记得开新分支); FINAL HOME = new branch v4 (owner: 写完后应该是一个新的分支 v4) — v3 freezes as the V3 line terminus (59289ce pushed as its tail at release time); never merge to main/v1/v2
current-step: DONE
round: STEP0 converged at r3; CB-1..9/ADV-1 verified
reviewer-session: 019f4b30-68f9-7222-9b64-17f52a333b4c
next-action: n/a — archived 2026-07-12T0352; release 4.0.0 from branch v4 follows
artifact-root: .                          # optional; root for process artifacts (runbook §3) — default project root
gates:
  - 2026-07-12T02:37 note: change scaffolded by `apriori new`
  - 2026-07-12 authorization (owner, verbatim): "可以,我决定做B" + versioning decision "能不能不要改为 4.0.0,而是直接继续 3 的版本号" — resolved as 3.5.0 via permanent dual-layout support; SUPERSEDED by the 4.0.0 single-layout decision: this change SELF-MIGRATES mid-flight (O7). Additional owner decisions: no layout-promise wording in v4, no migration guide, Node floor rides along, no default-branch switch. Work branch: change/change-bundle.
  - 2026-07-12 standing authorization (owner /goal 开工, plan approved verbatim in-session): run the full change to release — archive, branch v4, push v4 + v3 tail 59289ce, tag v4.0.0, CI, npm publish; expiry: this change-bundle release.
