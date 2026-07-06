### Requirement: apriori init scaffolds the workflow and per-tool pointers
`apriori init` SHALL scaffold the single `apriori/` root and write a thin pointer to the self-contained runbook in each selected AI tool's native location and format, interactively by default and non-interactively via flags, without ever overwriting existing files silently.

#### Scenario: IN-01 detects present tools and pre-selects them
- WHEN the project already contains a tool's marker (CLAUDE.md, .cursor/, .github/, …)
- THEN init pre-checks that tool in the multi-select

#### Scenario: IN-02 interactive multi-select of tools
- WHEN run with no flags in a TTY
- THEN it presents a multi-select of {Claude Code, Codex, Cursor, GitHub Copilot, OpenCode, Windsurf}

#### Scenario: IN-03 non-interactive via flags
- WHEN run with `--tools a,b --test-cmd "…" --yes`
- THEN it scaffolds without prompting (CI-friendly)

#### Scenario: IN-04 the protocol is written once; tools get pointers
- WHEN any set of tools is selected
- THEN `apriori/runbook.md` is written once and each tool gets only a pointer to it (no protocol duplication)

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
