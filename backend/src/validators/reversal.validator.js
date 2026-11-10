export function validateReversal(body) {
  const errors = [];

  const reason =
    typeof body?.reason === 'string' ? body.reason.trim().replace(/\s+/g, ' ') : '';

  if (reason.length < 5 || reason.length > 255) {
    errors.push('reason is required and must be between 5 and 255 characters');
  }

  return { errors, value: { reason } };
}