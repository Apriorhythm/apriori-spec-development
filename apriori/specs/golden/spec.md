### Requirement: the golden path proves the packaged CLI end-to-end
`scripts/golden-path.mjs` SHALL extract the README Quickstart's shell blocks in document order and run them as one bash script in a fresh temp directory, with `apriori` resolving to the local checkout bin (`--local`) or to a tarball installed into an isolated prefix (`--packed <tgz>`, PATH prepended with the platform bin dir and a preflight asserting `apriori` resolves inside the prefix); it SHALL assert each block's last command against the documented exit sequence `[0, 1, 0, 0]` and the final state (store verify 0, check 0, doctor --no-run 0, archived demo change present), failing loudly with the block index and expected/actual on any mismatch. The CI workflow SHALL run the packed mode on ubuntu and windows.

#### Scenario: GP-01 the extractor is a pure text seam
- WHEN `extractBlocks(readmeText)` runs on the real README (and on doctored variants in tests)
- THEN it returns the Quickstart's ```shell blocks in document order (four today), never reading or writing the filesystem itself

#### Scenario: GP-02 a --local run walks the whole Quickstart
- WHEN `node scripts/golden-path.mjs --local` runs in a fresh temp dir
- THEN every block executes in sequence with the checkout bin aliased over `npm i -g`, per-block last exits match `[0, 1, 0, 0]`, and the run finishes exit 0

#### Scenario: GP-03 final state is asserted, not assumed
- WHEN the blocks complete
- THEN the runner re-asserts: `verify --specs apriori/specs` exits 0, `check` exits 0, `doctor --no-run` exits 0, and `apriori/changes/archive/` contains the archived demo change — any miss fails the run naming the assertion

#### Scenario: GP-04 drift between README and contract fails loudly
- WHEN a doctored README text changes the block count or makes a block's exit diverge from the expected sequence
- THEN the runner (fed through the text seam) fails naming the block index and expected/actual — the README cannot silently drift from the contract

#### Scenario: GP-05 packed mode proves the published file set
- WHEN `--packed <tgz>` installs the tarball into an isolated prefix (platform bin dir on PATH, resolve-inside-prefix preflight)
- THEN the same walk succeeds using ONLY the packaged files — a package.json `files:` gap surfaces here; the runner aborts if `apriori` resolves outside the prefix
