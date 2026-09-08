# STEP5 P8 Consistency Review — change-projection r2

## Resolution Check

IMPL-1: verified. `discoverDeltas()` now validates `specs/` itself before using it as a containment root, and `mdFilesUnder()` follows symlink dirents explicitly so escaping symlinked files/subdirs become containment errors rather than silent skips. AM-22 now covers symlinked `specs/`, escaping symlinked subdir, and symlinked `archive/` move destination.

IMPL-2: verified. `parseStamp()` now flags standalone `apriori-base` comment attempts that fail the strict stamp form, so structurally malformed stamp comments no longer silently disable CAS. AM-23 includes a missing-colon case.

## New Issues

No new spec-vs-code gaps found in the amended code, tests, or docs.

## Notes

The ADV-4 fixes are present: README/README_cn scope archive failure atomicity “up to the commit point,” `stampCli()` now requires exactly one raw argv entry, and the move-destination symlink case is tested.

## Ledger Delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| IMPL-1 | Symlinked delta paths could be silently ignored or accepted outside the change tree. | AM-22 path-containment security could be bypassed or made invisible for delta inputs. | STEP5·r1 | verified |
| IMPL-2 | Structurally malformed `apriori-base` comments could be treated as absent stamps. | CAS could silently opt out when the author intended divergence protection. | STEP5·r1 | verified |

VERDICT: no spec-vs-code gaps
