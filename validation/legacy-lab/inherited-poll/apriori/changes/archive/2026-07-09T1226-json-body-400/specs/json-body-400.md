# Spec delta — json-body-400

> Merges into `apriori/specs/polls.md`. Trivial-tier bugfix: request-body shape validation at the
> HTTP layer.

## ADDED Requirements

### Requirement: REQUEST-BODY-VALIDATION — non-object JSON bodies are rejected, never 500

Every JSON-consuming POST endpoint rejects a request body that does not parse to a plain JSON
object with `400 {error:"请求格式不正确"}` — a malformed body can never produce a 500.

#### Scenario: RB-01 — JSON `null`, arrays, and bare primitives get 400 with the fixed message
- Given `POST /api/polls` or `POST /api/polls/:id/vote` (with a valid voter cookie)
- When the request body is the JSON literal `null`, a JSON array, or a bare string/number — i.e.
  valid JSON that is not an object — or is not valid JSON at all
- Then the response is `400` with `{error:"请求格式不正确"}` (and never a 500)
- And an empty body keeps its existing behavior (treated as `{}` — downstream field validation
  answers with its specific 400 message, e.g. `问题不能为空` / `请至少选择一个选项`)
