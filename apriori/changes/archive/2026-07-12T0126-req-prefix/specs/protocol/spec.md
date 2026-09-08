<!-- apriori-base: sha256:04a7ba114bff8e85f4b2fe5af755011f24a700726c2b1aeb1dcef0bb03167f18 -->
# Delta — protocol (req-prefix)

## ADDED Requirements

### Requirement: requirement-stage paths carry the change name
The runbook (both editions) and the concepts handbook (both languages) SHALL write every requirement-stage path with the change prefix — `requirement/<change>-req-v{N}.md` finalized as `requirement/<change>-req-final.md`, and `requirement/<change>-intent-card.md` on the explore track — and none of the old global literals (`requirement/req-v`, `requirement/req-final.md`, `requirement/intent-card.md`) anywhere in the four live docs; parallel changes stop overwriting each other's requirement history. The STEP6 section (both runbook editions) SHALL carry the preservation clause: after `apriori archive --change <name> --write --changes-dir apriori/changes` moves the change dir, and before the STEP6 closeout commit, every `requirement/<change>-req-*.md` and `requirement/<change>-intent-card.md` (if present) is copied into `apriori/changes/archive/<stamp>-<change>/requirement/`, basenames preserved, all versions included. Already-archived changes keep their old file names (grandfathered — nothing parses requirement filenames).

#### Scenario: PR-19 the prefixed convention binds in every live doc
- WHEN the four live docs (runbook EN/CN, concepts EN/CN) are scanned
- THEN the prefixed forms appear where the convention is written (artifact table, STEP0, intent card, the goal recipes, concepts' walkthrough), the STEP6 preservation clause names its destination and its before-the-closeout-commit timing in both runbook editions, and none of the three forbidden old literals appears anywhere in the four docs
