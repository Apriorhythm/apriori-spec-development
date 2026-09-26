<!-- provenance: provider=codex model=gpt-6-astra session=01a0ddfe-4624-7760-8605-5beb0bb0a6f2 date=2026-09-26 -->
# code-review — archive-manifest (round 2)

> recorded on behalf of the reviewer (read-only sandbox, R2): body below is verbatim from the raw transcript.

Round 2 independent review. Intended path: `apriori/changes/archive-manifest/review/code-review-v2.md`. Read-only sandbox: supplied for verbatim landing.

Two substantive issues remain.

1. **P1 — Short writes can publish an incomplete manifest and allow store commits.**  
   [lib/manifest.js:80](/root/terra/asd-v62-code/lib/manifest.js:80) calls `fs.writeSync` once and ignores its returned byte count. A successful short write—for example when storage fills partway through—therefore proceeds to close and rename the truncated JSON, after which `archiveChange` commits stores.

   This violates the requirement that manifest-production failure prevent store writes. The installed Node implementation confirms that `writeSync` returns the underlying write count; it does not implement the complete-write loop.

   **Suggested fix:** write all serialized bytes through the owned descriptor, handling partial writes and failing on incomplete progress before publication. Add archive-entry-point evidence for a short write followed by failure: stores unchanged, no partial manifest published, and owned temp cleaned up. AM-129 currently injects failure at exclusive creation, before any bytes are written, so it cannot catch this regression.

2. **P2 — AM-132 does not prove its claimed store-preservation behavior.**  
   [test/archive-manifest.test.js:169](/root/terra/asd-v62-code/test/archive-manifest.test.js:169) checks only that the final store contains `Alpha2` and lacks `"manifest"`. The normal store commit occurs after manifest publication and could overwrite evidence of an earlier write through the link. These assertions therefore do not establish that publication never touched the target.

   The [AM-132 contract:36](/root/terra/asd-v62-code/apriori/changes/archive-manifest/specs/archive-merge/spec.md:36) explicitly requires a byte-identical target, but this fixture intentionally merges changes into that same store. The directory-occupant branch correctly tests rename failure, but cannot establish the separate symlink-target guarantee.

   **Suggested fix:** point the occupant symlink at a store file outside the merge jobs and assert exact before/after bytes, or inspect the target before staging begins. Retain the regular-file publication assertion. This closes the remaining evidence gap from round 1; the current exclusive-create/rename implementation itself addresses the original write-through defect.

The other round-1 findings are resolved in the inspected code and assertions:

- Unique exclusive creation and owned cleanup replace the unsafe fixed temp; unrelated temp-like names are no longer globally excluded.
- The bundle-root `lstat` guard prevents the archived-bundle alias case; AM-133 checks refusal and unchanged archived manifest bytes.
- Null-prototype inventories and own-property comparisons fix special filenames; AM-134 and CK-22 exercise them.
- AM-130 now changes content between attempts and asserts both the new hash and its difference from the original. AM-132’s directory occupant supplies real publication-rename failure coverage without changing the existing store/move injection seams.

Examined: current status/diff, deltas, flow-state, requested gate output, manifest publication and cleanup, symlink boundaries, retry behavior, filename handling, drift exit-code separation, retained declaration scenarios, and affected test assertions. No scope expansion or approach-level reason to split was found.

Not dynamically examined: filesystem faults, concurrent replacement races, Windows behavior, or crash durability. No tests or builds were run; the supplied 841/841 result was not independently reproduced. Gate remains blocked on the unresolved review round, as expected. No prohibited files or raw transcripts were read. No separate advisories.

VERDICT: 2 issues open
