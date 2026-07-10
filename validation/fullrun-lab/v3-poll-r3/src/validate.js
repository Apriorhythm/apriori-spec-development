// Payload validation — throws ApiError with the stable code (req-final §11 / §12.1).
import { ApiError } from './errors.js';
import { LIMITS, codePoints } from './model.js';

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

// Strict-ish ISO 8601: date, optional time, optional fractional secs, optional TZ.
const ISO_8601_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})?)?$/;

// Returns { title, options, mode, deadlineMs } or throws ApiError.
export function validateCreate(body, now = Date.now()) {
  if (!isPlainObject(body)) throw new ApiError('INVALID_PAYLOAD');

  // title
  if (typeof body.title !== 'string') throw new ApiError('INVALID_PAYLOAD');
  const title = body.title.trim();
  if (title.length === 0) throw new ApiError('TITLE_REQUIRED');
  if (codePoints(title) > LIMITS.TITLE_MAX) throw new ApiError('TITLE_TOO_LONG');

  // options
  if (!Array.isArray(body.options) || !body.options.every((o) => typeof o === 'string')) {
    throw new ApiError('INVALID_PAYLOAD');
  }
  if (body.options.length < LIMITS.OPTIONS_MIN || body.options.length > LIMITS.OPTIONS_MAX) {
    throw new ApiError('OPTION_COUNT_OUT_OF_RANGE');
  }
  const options = body.options.map((o) => o.trim());
  for (const o of options) {
    if (o.length === 0) throw new ApiError('OPTION_REQUIRED');
    if (codePoints(o) > LIMITS.OPTION_MAX) throw new ApiError('OPTION_TOO_LONG');
  }

  // mode
  let mode = 'single';
  if (body.mode !== undefined && body.mode !== null) {
    if (body.mode !== 'single' && body.mode !== 'multi') throw new ApiError('INVALID_MODE');
    mode = body.mode;
  }

  // deadline (optional) — must be a strict ISO 8601 string (GAP-1),
  // not merely something Date.parse happens to accept (e.g. "01/02/2030").
  let deadlineMs = null;
  if (body.deadline !== undefined && body.deadline !== null) {
    if (typeof body.deadline !== 'string' || !ISO_8601_RE.test(body.deadline)) {
      throw new ApiError('INVALID_DEADLINE');
    }
    const t = Date.parse(body.deadline);
    if (Number.isNaN(t)) throw new ApiError('INVALID_DEADLINE');
    if (t <= now) throw new ApiError('DEADLINE_IN_PAST');
    deadlineMs = t;
  }

  return { title, options, mode, deadlineMs };
}

// Returns { optionIds } or throws ApiError.
export function validateVote(body) {
  if (!isPlainObject(body)) throw new ApiError('INVALID_PAYLOAD');
  if (!Array.isArray(body.optionIds) || !body.optionIds.every((x) => typeof x === 'string')) {
    throw new ApiError('INVALID_PAYLOAD');
  }
  const optionIds = body.optionIds;
  if (optionIds.length === 0) throw new ApiError('NO_SELECTION');
  if (new Set(optionIds).size !== optionIds.length) throw new ApiError('DUPLICATE_OPTION_ID');
  return { optionIds };
}
