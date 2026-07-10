# Proposal: organize-downloads

## Why

The user's Windows 11 Downloads folder has become an unmanageable mess, and it re-accumulates clutter faster than it can be cleaned by hand. A safety-first organizing tool is needed that (a) does a one-time cleanup of the existing backlog and (b) keeps the folder tidy automatically going forward — without ever risking data loss. The user's explicit priority: "I'd rather it do less than misfile/lose anything."

## What Changes

- New tool that sorts files in the Downloads folder into type-based category folders: images, videos, documents, installers, archives (plus an `其他`/other bucket decision recorded in design).
- Two run modes:
  - **One-shot backfill**: manually triggered cleanup of the existing backlog (Downloads and, once, the Desktop).
  - **Daily scheduled run**: registered with Windows Task Scheduler; Downloads only. The Desktop is explicitly excluded from scheduled runs.
- Per-folder rule profiles: Downloads uses the standard profile; Desktop uses a conservative profile (never touch `.lnk` shortcuts, much longer "leave fresh files alone" grace period).
- Safety envelope (non-negotiable, spans all modes):
  - The tool only ever **moves and renames** files. It never overwrites and never immediately deletes.
  - **Dry-run preview** available for every run; the backfill run requires reviewing a preview before executing.
  - Every move is recorded in an **operation ledger** (original path → new path + timestamp), enabling **one-command undo** of a run.
  - Files that are still downloading (`.crdownload`, `.tmp`, `.part`) or too recently created are skipped.
- Duplicate handling: content-identical duplicates (hash comparison) are moved to a `_duplicates` quarantine folder and only auto-purged after a **30-day buffer**; same-name-different-content files coexist via Windows-style ` (2)` suffixing.
- Aging rule: archive files whose modified time is older than 180 days move to an `旧文件` (old files) subfolder inside Downloads.

## Capabilities

### New Capabilities

- `file-classification`: mapping files to category folders by extension/type; the five categories plus fallback handling for unrecognized types; name-collision suffixing rules.
- `safe-file-operations`: the move-only/no-delete/no-overwrite envelope, in-use and too-fresh file skipping, dry-run preview, operation ledger, and run-level undo.
- `duplicate-quarantine`: content-hash duplicate detection, `_duplicates` quarantine, 30-day buffered purge.
- `aging-archive`: 180-day modified-time rule moving old archives to the `旧文件` subfolder.
- `folder-profiles`: per-target-folder rule profiles (Downloads standard vs Desktop conservative), including which targets participate in scheduled runs.
- `scheduled-runs`: daily execution via Windows Task Scheduler (no resident background process; missed runs execute at next opportunity).

### Modified Capabilities

<!-- none — fresh project, no existing specs -->

## Impact

- Fresh, empty repository: everything is new code; no existing systems affected.
- Runtime target: Windows 11. Scheduling depends on Windows Task Scheduler; no always-on daemon.
- Touches user data (Downloads, Desktop) — the safety envelope above is the core mitigation and must be treated as a hard requirement, not a feature.
- Known platform caveat recorded for design: NTFS last-access time is unreliable/often disabled, so aging uses **modified time** only.
