'use strict';
/*
 * Leaf text helpers shared by check, review, readiness and spec-runner — this module
 * requires nothing, so any sibling can import it without opening a cycle.
 */

// drop every CLOSED ``` fence span (an unclosed opener is ordinary text)
function stripFences(text) { return text.replace(/```[\s\S]*?```/g, ''); }

// a reason must carry a letter or a digit IN ANY SCRIPT — `\w` is ASCII-only and would
// make every Chinese reason illegal in a log written in Chinese
const HAS_REASON = /[\p{L}\p{N}]/u;

module.exports = { stripFences, HAS_REASON };
