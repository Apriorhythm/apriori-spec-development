# Prototype walk — turning a runnable UI prototype into a checkable inventory

> **Audience: AI agents.** The runbook sends you here (§4 Ground) only when a walk is to run; read this file in full before you start. It is optional, owner-authorized work — never a default step.
> Source: generalized from the walk specification an owner used on a real requirement (2026-09), whose output a later change reconciled item by item against the implementation.

## 0. Entry — fill these in, then follow §1–§9

| Parameter | What to put | Default |
|---|---|---|
| `PROTOTYPE` | path of the runnable prototype (HTML/JS) and its version or date | — (required) |
| `SOURCES` | the requirement documents the prototype is read against (PRD, change notices), each with its version | — (required) |
| `SCOPE` | the pages, flows or components this walk covers | the whole prototype |
| `CAPS` | max states, max actions, max workflow depth, per-action timeout, global timeout — set **before** running | 300 states · 2000 actions · depth 8 · 10 s · 30 min |
| `OUT` | where the kept artifacts go — `checklist.md`, `REPORT.md`, the JSON maps, and under `evidence/` the scrubbed screenshots the checklist cites | `apriori/changes/<change>/prototype-walk/` (archived with the change); before a change exists, a path the owner names |
| `SCRATCH` | screenshots no row cites, raw action logs, runtime copies — large and re-creatable, not committed | `apriori/tmp/prototype-walk/<change>/` |

A human can start one with a single sentence: *"Walk the prototype `<PROTOTYPE>` against `<SOURCES>` per `apriori/guides/prototype-walk.md`, scope `<SCOPE>`."*

## 1. What a walk is, and what it is not

- It **is** a systematic exploration of a runnable prototype — static reading of its code, then real interaction with it — that leaves a **checklist of observable facts** (pages, columns, fields, options and their key-values, states, texts, transitions) with evidence for each, plus the prototype's own defects.
- It is **source material**, registered in Ground (§9): it authorizes nothing — not `apriori new`, not development, not reproducing what the prototype does.
- It does **not** replace the requirement sources: where the prototype and the PRD disagree, the walk records the disagreement; it does not settle it (§4).
- It does **not** prove the implementation: a later independent check reconciles the checklist against the built pages (§5). The walk only makes that check possible.

Why it exists: on two earlier requirements, pages shipped missing columns, fields and option values that the prototype showed, while every end-to-end assertion was green — the implementation, the spec and the tests all came from one spec that had left those items out. On a later requirement the prototype was first turned into a checklist like this one, and a change near the end reconciled it row by row; the page gaps it found (labels, prompts, input behaviour) were fixed before any human acceptance.

## 2. Before you start

1. **Record the inputs.** The prototype's path and version, each source's path and version, the scope, the caps. These go into the report header (§8) and into the Ground `observed` line (§9).
2. **Read the requirement sources first**, to understand what the pages are for; then the prototype. Reading the prototype only tells you what was drawn, not what was asked for.
3. **Do not modify the prototype.** If it cannot run as-is (a missing local asset, a hard-coded absolute path), work on a copy under `SCRATCH/runtime/`, record every change you made and why, and say so in the report.
4. **Check what you can actually run** (§6.3): a local HTTP server, a browser automation tool (Playwright or an equivalent), a browser. Whatever is missing, say so now — the walk then continues with what is possible and reports the gap; it never pretends to have covered runtime behaviour it could not exercise.

## 3. The walk, phase by phase

Run the phases in order and do not stop after the first few. Each phase leaves an artifact in `OUT/` (maps, model, coverage, checklist, report) or `SCRATCH/` (screenshots, the raw action log, runtime copies).

### 3.1 Static interaction analysis → `static-interaction-map.json`
Read the HTML, CSS and JavaScript **before** clicking anything. The goal is a map of potential interactions, including ones invisible in the initial state:
- event bindings (`onclick`, `addEventListener`, change/input/submit/key handlers), render/show/hide/open/close functions, modals, drawers, dropdowns, pickers, tabs, toggles, `disabled` logic, validation, storage use (`localStorage` / `sessionStorage`), navigation;
- **state variables** that drive the UI (the current page, the active tab, the selected items, an open flag, the record being edited, form data, filters) — for each: which UI it controls, which actions change it, what effect follows;
- **conditional rendering** — every `condition → UI effect` (a field shown only for one channel type, a button only for one status);
- **literal text and option lists** in the source — labels, placeholders, prompts, error messages, option values and their display texts (key-value pairs). These feed the checklist directly (§5).

One entry per interaction: component, element, source location, action, condition, state variable, expected UI effect.

### 3.2 Serve it locally
Serve the prototype over a local HTTP server (not `file://`). Record the server URL, port, target URL, browser and viewport. On first load record the title, main regions, visible interactive elements, console errors, page errors, failed requests and any storage it uses.

### 3.3 Runtime discovery → `runtime-elements.json`
With the automation tool, enumerate the interactive elements actually present — buttons, links, inputs, textareas, selects, checkboxes, radios, comboboxes, tabs, menus, dialogs, drawers, pickers, clickable divs/spans, elements with a `role`, `tabindex` or an inline handler, dynamically created elements. For each: a selector, role, accessible name, text, label/placeholder/title, visibility, enabled state, bounding box, owning page and component, whether it sits in a scroll container, whether a parent must be opened first. Prefer role and accessible name, then label, text, `data-*`, id, name; avoid brittle CSS selectors without a reason.

### 3.4 UI state model → `ui-state-model.json`
Model states, not element lists:
- **page state** — URL, page or module, main content, relevant storage;
- **component state** — the open modal/drawer/dropdown/picker, the active tab, selections, input values, checkbox/radio/select values, disabled and expanded states, table scroll position, which conditional fields are shown;
- **action** — click, fill, type, select, check, uncheck, press, scroll, hover, submit, cancel, close, navigate;
- **result** — what changed: elements added or removed, fields changed, URL, storage, a validation message, a success or error state, a newly opened container, newly available interactions.

### 3.5 State signature and de-duplication
Give each state a signature from what matters to the user: page, open containers, active tab, selections, input values, toggle states, expanded/collapsed parts, relevant storage and scroll. Two states with the same signature are one state.
**Hard rule (§6.1):** write down, once, what the signature includes and why that is enough to call two states equal. A signature that leaves out something visible (a message, a disabled flag, a column) merges states that differ — when in doubt, include it.
States you **injected** to reach something (by setting storage, calling a function from the console, editing the DOM) are marked as injected and kept apart from states a user can reach by interacting; the coverage counts them separately.

### 3.6 Traversal → `OUT/transitions.json`, `SCRATCH/actions.jsonl`
Traverse breadth-first, depth-first or equivalently: state before → action → wait for the UI to settle → state after → signature → new state queued or duplicate skipped. The same action in a different state is a different transition (Edit from the default state, from a selected state, from a validation state). Log every action with timestamp, state before, target, input, state after, and any error.

### 3.7 Interactions and boundaries to cover
Cover at least: navigation, tabs, dropdowns and selects, checkboxes and radios, text inputs and search, clear, select all and deselect all, modals, drawers, pickers (single and multiple), add, delete, edit, copy, enable, disable, save, cancel, close, back, view details, expand and collapse, table scrolling in both directions and sticky areas, validation, success, error, empty and disabled states, conditional show and hide, refresh and re-entry (storage persistence), browser back/forward where it applies.
For inputs: empty, whitespace only, the maximum length and one beyond it, special characters, a value the validation should refuse, and a value it should accept. Record each validation message verbatim.

### 3.8 Path explosion control
Cover meaningful state boundaries, not the Cartesian product of every field, option and entity. Use these classes, and record which representative stood for which class:
- **Selection components** (multi-select, checkbox group, tag picker): default, empty, one, several, all, clear, change an existing selection, save and reopen.
- **Cascading selectors** (province → city, category → item): pick a parent, pick a child, remove a child, remove a parent, and the parent/child state staying in sync.
- **Entity pickers** (people, projects, records): open, search, select one, select several (if supported), clear, confirm, cancel, reopen with an existing selection, save after changing it.
- **Type or event switches that reshape a form** (a channel type, an event kind): for each value — select it, see which fields appear, fill what is required, save, reopen, check the values come back. Values that produce the same form are merged into one representative, and that is recorded.
- **Combinations of conditions:** each condition on its own; the pairs that change the form's structure, its validation or what is saved; nothing beyond that unless it changes the outcome.
- **Tables:** first, middle and last row; the empty table; the action column; horizontal and vertical scroll to start, middle and end — never row by row.
- **Duplicates and loops:** a transition already seen (same state, same action, same result) is skipped and logged as a skipped duplicate; `A → B → A` is resolved by signature; no element is clicked endlessly. The caps from §0 stop the walk where nothing else does (§6.2).

### 3.9 Errors
Listen throughout for console errors, page errors, failed requests, failed navigations, uncaught exceptions and unhandled rejections; after each significant action check for new ones. Record timestamp, action, state, URL, target, message and stack. Scrub them before writing (§6.4).

### 3.10 Screenshots → `SCRATCH/screenshots/`, `OUT/evidence/`, `OUT/screenshot-index.txt`
Take a screenshot at each first visit to a state, each open container, each validation/success/error state, each scroll extreme of a table, and wherever a checklist row needs visual evidence. Name them `NNN_<page>_<what>.png` and index them with the state they show. Scrub them before writing (§6.4). A screenshot a checklist row cites is kept in `OUT/evidence/` — it is that row's evidence and must survive the archive; the rest stay in `SCRATCH/`.

### 3.11 Coverage → `coverage.json`
Report, separately: interactions discovered statically, discovered at runtime, and both; **covered**, **uncovered** (with the reason), **blocked** (with the reason and whether it could continue automatically), **skipped as duplicates**, and **injected-only** states; and whether any cap from §0 was reached. Never mark something covered to raise a number.

## 4. Prototype defects and unsettled rules

- Something the prototype does that looks wrong — a broken flow, a dead control, a contradiction with itself or with the sources — is a **prototype defect**, recorded with: observed behaviour, steps, the state, why it may matter, and the assumption it depends on. Grade it (P0–P3) by impact on the delivery.
- Something you cannot confirm (a business rule the prototype hints at but no source states) is a **potential issue**, not a defect: record it, never invent the rule.
- Code in the prototype that no user path reaches (a function never called, a hidden panel never opened) is **not** a feature: record it as unreachable; do not count it as something to build.
- Who decides: the requirement sources and the owner's recorded decisions settle what to reproduce, in that order. A defect the sources already settle is ruled by them (record which line): the delivery shows the corrected behaviour, so the row stays `in` with ruling `corrected — <source line>` (§5). Only a question nothing settles goes to the owner — as an `## Open` item, never as your choice.

## 5. The output that matters: the reconciliation checklist → `checklist.md`

The walk exists to produce this file. Every observable fact the delivery will be judged on gets one row; the later independent check (and the contract) work from it. Reuse what §3 produced — the checklist points into it — and keep **one** progress source: do not fork a second ledger elsewhere.

| Field | Meaning |
|---|---|
| `ID` | stable, never reused: `PW-<page>-<nn>` |
| `version` | the prototype version the row was read from |
| `observable` | exactly what a user can see or do: a column header, a field label, an option's display text **and its value**, a default, a message's exact wording, a state and its transition, a disabled condition |
| `evidence` | where it was read: a screenshot kept under `OUT/evidence/`, a state id, a source location |
| `scope` | whether the delivery must show this row: `in` · `out` (outside this delivery, listed so a later check names it as excluded) |
| `ruling` | how the delivery shows it: `as prototype` · `corrected — <source line or recorded decision>` (a prototype defect: the delivery shows the corrected behaviour) · `not built — <reason>` (unreachable code, a feature out of scope) · `owner — <Open id>` (nothing settles it yet) |
| `implementation` | where it was built (file, component) — filled when it is built |
| `verification` | the test or scenario id that pins it — filled when it is verified |

Rules for the checklist:
- Exact text is copied, not paraphrased; an option list is copied with its values (the key-value pairs are exactly what drifted on earlier requirements).
- A prototype defect the sources correct is an `in` row with ruling `corrected — …`: the delivery must show the corrected behaviour, and it is reconciled like every other `in` row — against its ruling, not against the prototype — so the implementation neither copies the defect back in nor drops the correction.
- When the contract is written, a scenario that pins observable content cites the checklist ids it covers.
- **Reconciling it later is not the walk's job, but the walk must make it possible:** the later check ticks each `in` row — corrected ones included — against the built page and the row's ruling, fills `implementation` and `verification`, and lists every row left open — in the current checklist, which for an archived walk is a successor in the current change (§9), never the frozen original. Ticking is not proof: the check also looks at the assertion behind each tick and the conditions it ran under — an assertion that is true on an empty list, a log check run at a level that hides the line it looks for, a row ticked off against the wrong item all look green and prove nothing.

## 6. Hard constraints

1. **Equivalence is justified (§3.5).** State the signature's contents and why they suffice; do not merge states that differ in anything a user sees; keep injected states apart from user-reachable ones.
2. **Caps are set before running and never become a claim.** Reaching a cap, missing a capability or meeting a blocked path is reported as such, with what was not covered; it is never "fully covered".
3. **Tools are optional prerequisites, not new dependencies.** A local server, Playwright (or an equivalent) and a browser are needed for §3.2–§3.10; apriori-cli does not install or require them. Without them, do §3.1 and §5 from the source, mark every runtime row as not exercised, and say what is missing. The prototype itself stays unmodified (§2.3).
4. **Isolation and scrubbing.** Use made-up data, never real customer or personal data. Block or avoid calls to external services; if the prototype makes one, record it without letting it reach anyone. Scrub everything written — screenshots, action logs, input values, storage dumps, error stacks — of tokens, keys, phone numbers, addresses and anything personal; masking the screenshots alone is not enough.

## 7. Completion criteria

The walk is complete only when all of these hold:
- static analysis done and `static-interaction-map.json` written;
- the prototype served locally and exercised with the automation tool — or the missing capability reported (§6.3);
- runtime elements discovered; the state model built; signatures with their stated equivalence basis used for de-duplication;
- the main reachable states, actions and transitions explored; modals, drawers, dropdowns and pickers opened; conditional branches, input boundaries, save/cancel/delete/enable/disable flows and table scrolling exercised;
- errors checked; screenshots and `actions.jsonl` (in `SCRATCH/`) and `coverage.json` written;
- uncovered, blocked, duplicate and injected-only paths listed, with reasons, and any cap reached named;
- `checklist.md` written with every row's fields filled up to `ruling`, every corrected prototype defect an `in` row with its correcting source, every row a cited screenshot supports backed by a file under `OUT/evidence/`, and every unsettled row pointing at an `## Open` item;
- `REPORT.md` written (§8).
If anything is still uncovered, the report says so; it never says "all done".

## 8. Report → `REPORT.md`

Sections: inputs (prototype, sources and versions, scope, caps, environment); page structure; static and runtime interaction maps (summaries, with pointers); state model; covered paths; uncovered paths; blocked paths (path, reason, status, can continue automatically?); skipped duplicates; workflows; errors; prototype defects and potential issues (§4); screenshot index; coverage numbers; the checklist summary (rows per scope, rows awaiting the owner). Every conclusion traces to an action, a state, a screenshot or a source location.
The final message to the human is short: target, counts (states, actions, transitions, screenshots, checklist rows), errors, defects, uncovered and blocked items, rows awaiting the owner, where the artifacts are.

## 9. Registering the result

In the change's `## Reality Check` (§4 Ground), one line: `observed: <OUT>/checklist.md — prototype <version>, walked <date>; scope <scope>; rows <n> (in <a>, of which corrected <c> / out <b>); <k> awaiting the owner; runtime phases <run | not run — why>`. The checklist is source material: decisions in it are decisions only where a source line or a recorded owner decision says so. Rows awaiting the owner become `## Open` items with their own ids. A later change that builds or checks the pages reads the checklist and reuses it for the scope it covered at that prototype version. It does not re-walk what is covered; with the owner's authorization it **continues** the same walk for what is not — paths left uncovered or blocked, pages newly in scope, runtime phases that could not run before (§6.3) — keeping existing ids. Where the continuation is written depends on the checklist's change: while that change is in flight, add the rows to its checklist in place; once it is archived, its bundle is frozen (§4) — never edit it. Instead start a **successor** `checklist.md` in the current change's `OUT`: carry every row over with its id, sources and evidence references (the archived evidence stays where it is), say on its first line which checklist it continues and from which archived bundle, and add the new rows there. From then on the successor is the one current progress source; the archived predecessor is history. The same holds for a later reconciliation (§5): it fills `implementation` and `verification` in the current change's checklist — the predecessor in place while its change is in flight, a successor once it is archived. A new prototype version is walked again, against the latest checklist. The runbook's once-per-requirement offer is about starting a walk; finishing one the owner authorized needs no new offer.
