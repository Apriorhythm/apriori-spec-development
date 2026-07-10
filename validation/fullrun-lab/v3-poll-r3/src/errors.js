// Stable error codes + HTTP status (req-final §11 / §12.1).
export const ERROR_STATUS = {
  TITLE_REQUIRED: 400,
  TITLE_TOO_LONG: 400,
  OPTION_REQUIRED: 400,
  OPTION_TOO_LONG: 400,
  OPTION_COUNT_OUT_OF_RANGE: 400,
  DEADLINE_IN_PAST: 400,
  INVALID_MODE: 400,
  INVALID_DEADLINE: 400,
  INVALID_PAYLOAD: 400,
  INVALID_JSON: 400,
  NO_SELECTION: 400,
  SINGLE_CHOICE_VIOLATION: 400,
  DUPLICATE_OPTION_ID: 400,
  OPTION_NOT_FOUND: 400,
  POLL_NOT_FOUND: 404,
  POLL_CLOSED: 409,
  INVALID_ADMIN_TOKEN: 403,
  UNSUPPORTED_MEDIA_TYPE: 415,
  PAYLOAD_TOO_LARGE: 413,
  PERSIST_FAILED: 500,
};

export class ApiError extends Error {
  constructor(code, message) {
    super(message || code);
    this.code = code;
    this.status = ERROR_STATUS[code] ?? 500;
  }
}

export function apiError(code, message) {
  return new ApiError(code, message);
}
