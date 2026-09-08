<!-- apriori-base: sha256:34d220f38109c44e619cad5f9de7794c679dc16a0455474c27503021bc9e6186 -->
# Delta — protocol (ledger-states)

## ADDED Requirements

### Requirement: the ledger vocabulary and the post-archive gate are protocol
The runbook (both editions) SHALL document, in the P0 issue-ledger section: the full status vocabulary (`open` / `fixed` awaiting verification / `rejected + reason` awaiting reviewer concurrence / `verified` / `rejected-verified` preserving the original rejection reason plus a reviewer-concurrence evidence reference / `waived + reason` settable ONLY by the human with a `gates:` entry recording the decision / `advisory-acked` for reviewer-labeled advisory batches); who sets what (reviewer flips fixed→verified and rejected→rejected-verified or reopens; the producer never terminalizes its own findings); and that a re-found issue REOPENS its old ID by returning it to `open` — reopened is an event, not a status. The STEP6 section SHALL require a post-archive `apriori gate --change <name>` run (resolving the archived stage) whose result enters the gate④ packet. The concepts handbook's §7.0 vocabulary strings reflect the same states in both languages.

#### Scenario: PR-18 the vocabulary and the post-archive gate bind in both editions
- WHEN the P0 and STEP6 sections are read in either language
- THEN the seven statuses with their setters are documented (waived = human-only with a gates: entry; rejected-verified preserves the original rationale), the reopen-is-an-event rule is stated, the STEP6 exit names the post-archive gate run feeding the gate④ packet, and concepts §7.0 carries the updated vocabulary in both languages
