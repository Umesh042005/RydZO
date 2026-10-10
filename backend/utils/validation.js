// Shared request-input guards.
// express.json() turns JSON objects into JS objects, so a body like
// { "email": { "$ne": null } } reaches Mongo as a query operator unless
// we insist on plain strings.

const isOptionalString = (value) => value === undefined || value === null || typeof value === 'string';

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

// Builds a phone/email lookup filter from only the identifiers actually supplied.
// Returns null when nothing usable was supplied or a value is not a string.
// (Passing { phone: undefined } to Mongo serializes to {} and matches every user.)
const buildIdentityFilter = (phone, email) => {
  if (!isOptionalString(phone) || !isOptionalString(email)) return null;

  const clauses = [];
  if (isNonEmptyString(phone)) clauses.push({ phone: phone.trim() });
  if (isNonEmptyString(email)) clauses.push({ email: email.trim().toLowerCase() });

  return clauses.length > 0 ? { $or: clauses } : null;
};

module.exports = { isOptionalString, isNonEmptyString, buildIdentityFilter };
