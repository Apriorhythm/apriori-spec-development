// Domain model — pure logic, no I/O.
import { randomBytes } from 'node:crypto';
import { ApiError } from './errors.js';

export const LIMITS = {
  TITLE_MAX: 100,
  OPTION_MAX: 50,
  OPTIONS_MIN: 2,
  OPTIONS_MAX: 10,
};

export function codePoints(s) {
  return [...s].length;
}

// URL-safe id, 16 chars from 12 random bytes (base64url). Charset [A-Za-z0-9_-].
export function newId() {
  return randomBytes(12).toString('base64url');
}

// 128-bit admin token, hex.
export function newAdminToken() {
  return randomBytes(16).toString('hex');
}

// Build a fresh poll from already-validated fields.
export function newPoll({ title, options, mode, deadlineMs }, now = Date.now()) {
  return {
    id: newId(),
    title,
    options: options.map((text, i) => ({ id: 'o' + (i + 1), text, votes: 0 })),
    mode: mode || 'single',
    createdAt: now,
    deadline: deadlineMs ?? null,
    status: 'open',
    totalVoters: 0,
    adminToken: newAdminToken(),
  };
}

export function isExpired(poll, now = Date.now()) {
  return poll.deadline != null && now >= poll.deadline;
}

// Effective closed = persisted closed OR past deadline.
export function isClosed(poll, now = Date.now()) {
  return poll.status === 'closed' || isExpired(poll, now);
}

// Apply a vote in place. optionIds already structurally validated (non-empty, no dups, strings).
// Throws ApiError for domain violations. Returns the mutated poll.
export function applyVote(poll, optionIds, now = Date.now()) {
  if (isClosed(poll, now)) throw new ApiError('POLL_CLOSED');
  if (poll.mode === 'single' && optionIds.length > 1) throw new ApiError('SINGLE_CHOICE_VIOLATION');
  const byId = new Map(poll.options.map((o) => [o.id, o]));
  for (const oid of optionIds) {
    if (!byId.has(oid)) throw new ApiError('OPTION_NOT_FOUND');
  }
  for (const oid of optionIds) byId.get(oid).votes += 1;
  poll.totalVoters += 1;
  return poll;
}

// Idempotent close.
export function closePoll(poll) {
  poll.status = 'closed';
  return poll;
}

// Public projection: strip adminToken, add integer percentages.
export function toPublic(poll) {
  const total = poll.totalVoters;
  return {
    id: poll.id,
    title: poll.title,
    mode: poll.mode,
    status: poll.status,
    deadline: poll.deadline,
    totalVoters: total,
    closed: poll.status === 'closed',
    options: poll.options.map((o) => ({
      id: o.id,
      text: o.text,
      votes: o.votes,
      percent: total === 0 ? 0 : Math.round((o.votes / total) * 100),
    })),
  };
}

// single-choice single-violation is thrown by SINGLE_CHOICE_VIOLATION above.
