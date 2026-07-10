// 业务错误类型：router 据此映射 HTTP 状态码。
export class ValidationError extends Error {} // 400
export class NotFoundError extends Error {} // 404
export class ClosedError extends Error {} // 409
export class BadKeyError extends Error {} // 403
export class CorruptError extends Error {} // 500（数据损坏）
export class ExistsError extends Error {} // 内部：writeNew 目标已存在
