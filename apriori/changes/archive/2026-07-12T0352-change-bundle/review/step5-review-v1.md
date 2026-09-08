# STEP5 consistency review — change-bundle (round 1)

Reviewer: codex session 019f4b30-68f9-7222-9b64-17f52a333b4c (read-only). Raw: step5-review-v1-raw.txt. Rows recorded on behalf of the reviewer.

- CBIMPL-1 — reviewDirDefect() used existsSync before lstat: a dangling review/ symlink read as ABSENCE, so C4/C5 did not block on the GT-05 review-dir defect. Fix: lstat first, ENOENT is the only absence.
- CBIMPL-2 — CK-10 discovery followed symlinked change dirs (statSync) and silently skipped dangling review/ symlinks (existsSync before lstat). Fix: lstat change dirs (symlink -> warn-skip), lstat review/ (dangling symlink -> warn).
- CBIMPL-ADV-1 (advisory, acked) — AM-37 hardened: the archived requirement history is asserted to be the bundle's own content.

VERDICT: 2 issues open
