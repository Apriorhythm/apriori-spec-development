# Security

## Reporting

Please report suspected vulnerabilities privately via GitHub Security Advisories on this repository ("Report a vulnerability"). You should receive an acknowledgment within a week. Please do not open public issues for security reports.

## Posture (what the CLI actually guarantees)

- **Zero runtime dependencies.** The entire CLI is Node stdlib; there is no supply chain below it to audit but Node itself.
- **Path containment.** Every path DERIVED from a change name — what `verify --change`, `archive --change`, `gate` and `doctor` read or move under `apriori/` — is validated by realpath containment (symlinks followed and judged by where they point; not-yet-existing targets judged by their nearest existing ancestor). `verify --change`, `archive --change` and `gate` treat an escaping path as an error (exit 2, nothing read/written/moved); `doctor` never reads an escaping archived dir and reports it as a skip note instead (diagnosis, not enforcement). Explicit operator-given file arguments (single-file `archive --store <f> --delta <f>`, `stamp <file>`) are used as given, like any file tool.
- **Fail-closed parsing.** Unknown flags, malformed deltas, malformed CAS stamps, duplicate requirement names and vacuous verify runs are errors, never silent passes — the failure modes an attacker (or a typo) would exploit to make a gate lie are the ones that refuse loudest.
- **Write discipline.** `check`, `status`, and `doctor --no-run` are strictly read-only. `verify`, `gate`, and `doctor` (without `--no-run`) write nothing THEMSELVES but do execute your configured test command, which runs with your privileges (see Scope notes). `archive --write` commits via temp-file + rename, failure-atomic up to its commit point; crash durability (fsync) is explicitly NOT claimed — see the documented transaction semantics.
- **Review evidence.** The workflow's review artifacts archive raw reviewer transcripts; treat them as potentially containing whatever the reviewer saw. Do not commit secrets into a repository the workflow reviews — the transcripts are files like any other.

## Scope notes

- `verify`/`gate`/`doctor` execute the project's OWN configured test command — that command runs with your privileges, exactly as if you typed it. The CLI adds no sandboxing around it.
- The `process-config.md` `test-cmd` row is human-owned input; treat write access to it as equivalent to shell access.
