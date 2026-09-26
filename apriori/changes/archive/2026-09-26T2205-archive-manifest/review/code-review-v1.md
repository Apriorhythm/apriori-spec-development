<!-- provenance: provider=codex model=gpt-6-astra session=01a0ddfe-4624-7760-8605-5beb0bb0a6f2 date=2026-09-26 -->
# code-review — archive-manifest (round 1)

> recorded on behalf of the reviewer (read-only sandbox, R2): body below is verbatim from the raw transcript.

Independent review of `archive-manifest`. Intended path: `apriori/changes/archive-manifest/review/code-review-v1.md`. Not saved because the sandbox is read-only; this body is provided for verbatim landing under RUNBOOK §1 R2.

Four substantive issues remain. The approach is sound, but the implementation is not review-ready.

1. **P1 — The manifest temp path can overwrite unrelated content.**  
   In [lib/manifest.js:60](/root/terra/asd-v62-code/lib/manifest.js:60), `writeFileSync` opens the predictable `archive-manifest.json.tmp` with ordinary truncating semantics. An existing symlink at that path is followed. If it points to a store file, manifest production itself overwrites store bytes before staging; another target permits writes outside the bundle. Rename then publishes the symlink as the manifest. The catch path also deletes a pre-existing temp occupant.

   This violates both “links never followed” and manifest-failure atomicity. Separately, excluding that filename from every listing hides subsequent additions or modifications to it from drift reporting.

   **Suggested fix:** exclusively create a transaction-owned temporary file, clean up only that owned file, and publish a regular manifest by rename. Preserve and inventory unrelated occupants; exclude only the manifest and any temporary artifact actually owned by the current operation. Verify the existing-symlink and rename-failure cases through the archive entry point.

2. **P1 — A symlinked bundle can rewrite an already archived manifest.**  
   [lib/archive-merge.js:1091](/root/terra/asd-v62-code/lib/archive-merge.js:1091) builds and writes through `bundleDir` without establishing that it is a real in-flight directory. Discovery permits a source whose realpath remains inside `changesDir`; an absolute symlink such as `changes/c → changes/archive/<old-stamp>-c` meets that condition. Readiness checks the contained artifacts, not the bundle root’s link type.

   For an otherwise ready bundle with already-applied deltas, the new writer therefore recomputes and replaces the archived manifest, erasing its previous baseline. The subsequent move moves the symlink, not the underlying bundle. Drift checking also skips that archived symlink because `Dirent.isDirectory()` is false.

   **Suggested fix:** establish the source bundle’s actual identity before manifest production and prevent this path from writing through an alias into an archived bundle. Preserve existing destination-conflict behavior. Add entry-point evidence that an archived target’s manifest remains byte-for-byte unchanged.

3. **P2 — Valid filenames disappear or receive incorrect drift classifications.**  
   [lib/manifest.js:35](/root/terra/asd-v62-code/lib/manifest.js:35) uses `{}` as the path dictionary. Assigning a hash to a root file named `__proto__` does not create an own property, so that regular file is omitted from the manifest. In [lib/manifest.js:86](/root/terra/asd-v62-code/lib/manifest.js:86), membership uses `in`, which includes inherited properties: removing a recorded root file named `constructor` or `toString` is not reported as removal.

   This breaks the required complete inventory and content-drift report without any filesystem race.

   **Suggested fix:** use a prototype-free dictionary and own-property membership checks. Cover these valid filenames in archive creation and drift comparison.

4. **P2 — AM-130 does not prove that retry recomputes the manifest.**  
   [test/archive-manifest.test.js:122](/root/terra/asd-v62-code/test/archive-manifest.test.js:122) retries immediately after the injected move failure without changing any inventoried content. It neither captures the first manifest nor proves its replacement. An implementation that simply reuses the existing manifest would satisfy the current assertions.

   This is a substantive evidence gap for an explicitly required recovery behavior. The atomic-publication boundary is also uncovered: AM-129 injects open/write failures, while the manifest rename directly calls `fs.renameSync` and bypasses the injected rename seam.

   **Suggested fix:** change an inventoried file between attempts and assert the retry records its new hash; exercise publication-rename failure and assert untouched stores, preserved bundle content, and successful recovery. These are producer-side requirements before another review, not tests added by this reviewer.

Examined: transaction ordering, hash/write failure propagation, temp ownership, symlink handling and containment, stamp reuse, retry assertions, content-based drift comparison, exit-code separation, missing/unparseable manifest reporting, path separators, and the MODIFIED block’s retained scenarios. AM-118 and AM-119 are both retained. The AM-119 listing adjustment and ADM-06 staging-only injection are appropriate. Normal drift notes do not enter `fails`; relative inventory keys explicitly use `/`.

Not examined dynamically: Windows filesystem behavior, concurrent replacement races, actual permission failures, or crash durability. No builds or tests were run, and the supplied 837/837 evidence was not independently reproduced. No credentials, human-note files, raw review transcripts, or other changes’ documents were read.

`## Open` is empty. The requested gate reports the missing completed review round; that is expected during this review and is not a product finding. No scope expansion or approach-level reason to split was found. No separate advisories.

VERDICT: 4 issues open
