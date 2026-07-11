### Requirement: apriori init scaffolds the workflow and per-tool pointers
`apriori init` SHALL scaffold the single `apriori/` root and write a thin pointer to the self-contained runbook in each selected AI tool's native location and format, interactively by default and non-interactively via flags, without ever overwriting existing files silently.

#### Scenario: IN-01 detects present tools and pre-selects them
- WHEN the project already contains a tool's marker (CLAUDE.md, .cursor/, .github/, …)
- THEN init pre-checks that tool in the multi-select

#### Scenario: IN-02 interactive arrow-key multi-select of tools
- WHEN run with no flags in a TTY
- THEN it presents an **arrow-key** multi-select (↑/↓ move, space toggle, a all, enter confirm — no numbered input) over {Claude Code, Codex, Cursor, GitHub Copilot, OpenCode, Windsurf}, detected tools pre-checked

#### Scenario: IN-03 non-interactive via flags
- WHEN run with `--tools a,b --test-cmd "…" --yes`
- THEN it scaffolds without prompting (CI-friendly)

#### Scenario: IN-04 the protocol is written once; tools get pointers
- WHEN any set of tools is selected
- THEN `apriori/runbook.md` is written once, **byte-identical to the package's own `RUNBOOK.md` (single source — no separate template copy to drift)**, and each tool gets only a pointer to it (no protocol duplication)

#### Scenario: IN-05 per-tool native location and format
- WHEN a tool is selected
- THEN its pointer lands at that tool's path in its format (e.g. Cursor → `.cursor/rules/apriori.mdc` with MDC frontmatter; Claude Code → `CLAUDE.md` + `.claude/commands/apriori.md`; AGENTS.md shared by Codex/OpenCode)

#### Scenario: IN-06 additive and non-clobbering
- WHEN a target file already exists
- THEN init appends the pointer (rules files) or skips with a notice (runbook), never silently overwriting; re-running is safe

#### Scenario: IN-07 preview before writing
- WHEN about to write
- THEN it lists every file it will create or touch and asks to proceed (skippable with --yes)

#### Scenario: IN-08 reports command-level vs rule-level entry honestly
- WHEN a selected tool has no slash-command mechanism (e.g. Cursor, Copilot)
- THEN init states that tool gets a rule-level entry (point the agent at the runbook), not a `/apriori` command

#### Scenario: IN-09 --language pins a language in the scaffolded config
- WHEN init runs with `--language 中文` on a project without an existing config
- THEN the scaffolded `apriori/process-config.md` has its `language` field set to `中文` (default is `auto` = match the human); an existing config is never overwritten

#### Scenario: IN-10 the multi-select is arrow-key driven (no numbered input)
- WHEN the interactive selector runs
- THEN keys map as ↑/↓ = move (wrapping), space = toggle current, `a` = toggle all, enter = confirm, Ctrl-C/Esc = cancel; the rendered menu shows a cursor + `◉`/`◯` checkboxes, a `selected: <names>` footer (`(none)` when empty; names colored on a TTY), and never a numbered list; selection returns the chosen tool keys in order

#### Scenario: IN-11 a gitignored scratch dir for ephemeral instruments
- WHEN init scaffolds the `apriori/` root
- THEN it creates `apriori/tmp/` and an `apriori/.gitignore` containing `tmp/`, so P7 screenshot self-checks and similar ephemeral instruments never enter version control; an existing `.gitignore` is never overwritten

#### Scenario: IN-12 --test-cmd is persisted, not parsed-and-dropped
- WHEN `apriori init --test-cmd "<cmd>"` creates a fresh process-config
- THEN the config gains a `test-cmd` row that `apriori verify` uses as its default test command; an existing config is never rewritten

### Requirement: init records what it creates in the managed manifest
`apriori init` SHALL maintain `apriori/managed.json` entries ONLY for files it actually creates in a run: a fresh init records the runbook and each command file it wrote; init for an additional tool merges into a valid existing manifest preserving entries it didn't touch; a command file that already existed on disk is skipped as today and gains NO entry (existing content is never blind-adopted). When init creates a file that is absent on disk — including a manifest-listed file the user deleted as the prescribed cure — the entry is written/replaced with the hash of the bytes just written, so the next update sees `up-to-date`, not `modified`. `init --dry-run` never writes or modifies the manifest (it reports would-be entries). A hygiene-invalid manifest (per the update module's rules) makes init exit nonzero before scaffolding or merging anything.

#### Scenario: IN-13 fresh init writes the manifest for exactly what it created
- WHEN `apriori init --tools <t>` scaffolds a new project
- THEN `apriori/managed.json` lists the runbook and the created command file(s) with hashes of the written bytes, and nothing else

#### Scenario: IN-14 add-tool init merges without adopting bystanders
- WHEN init runs for an additional tool in a project where another tool's command path already carries a user file
- THEN the new tool's created file gains an entry, existing entries are preserved, and the pre-existing user file gains no entry (a later update reports it `unmanaged`)

#### Scenario: IN-15 the delete-and-reinit cure closes cleanly
- WHEN a managed file was locally modified, deleted, and `apriori init --tools <t>` recreates it
- THEN the manifest entry is refreshed to the recreated bytes and the next update reports `up-to-date`

#### Scenario: IN-16 init dry-run leaves the manifest alone
- WHEN `apriori init --dry-run` runs fresh or for an additional tool
- THEN the manifest is not created or changed, while the report shows the would-be entries

#### Scenario: IN-17 a hygiene-invalid manifest blocks init
- WHEN `apriori/managed.json` exists but is invalid per the hygiene rules
- THEN init exits nonzero naming the defect and writes nothing
