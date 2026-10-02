<!-- apriori-base: sha256:3c1f2ece329b376b061a2abdaaaa7077423fa7cabb7ff9f47d2a59f0be8966e7 -->
# Delta — doctor (batch-review-fixes)

## MODIFIED Requirements

### Requirement: D2 names the guide the runbook relies on when it is missing
When the installed runbook names `apriori/guides/prototype-walk.md` and that path is missing or not a regular file, D2 SHALL report one finding naming the guide and the fix (`apriori update` installs a guide never installed; when update reports it missing, `apriori init --tools <t>` recreates it). It judges the path as update does — by lstat, never following a symlink: a symlink at the path (even to a good file), a directory or other non-file there, or anything but a plain directory at `apriori/guides` is a finding whose fix is to move it aside and then run that cure; a path resolving outside the project is a finding too. A runbook that does not name the guide, or no readable runbook, raises no guide finding (a missing runbook is D2's own finding already).

#### Scenario: PW-03 doctor reports a missing guide the runbook names, and nothing otherwise
- WHEN doctor runs on a healthy project whose runbook names the guide and the guide is present, then with the guide deleted, then with a directory in its place, then with the guide replaced by a symlink to a regular file inside the project, then with `apriori/guides` a symlink to a directory inside the project, then with the guide deleted and the runbook missing
- THEN the first is HEALTHY (exit 0); the second and third each give exactly one D2 finding naming `apriori/guides/prototype-walk.md` with a fix naming `apriori update`; the symlinked guide and the symlinked `apriori/guides` each give exactly one D2 finding saying what sits there, the guide's with the move-aside fix, and the result is FINDINGS; the fourth gives the runbook's D2 finding and no guide finding

## Notes

Batch review (10-02, c290842) guide-4: D2 followed a symlinked guide with statSync and reported HEALTHY while update refuses that guide; it now reads the same lstat judgment (`managed.guideBlock`). SST-6: PW-03 asserts the HEALTHY result and the directory finding's fix. PW-03 keeps its id.
