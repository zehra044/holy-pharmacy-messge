import { DEFAULT_COUNTRY_CODE } from '../config/env.js';

// Turns "061 234 5678", "+252-61-234-5678" or "00252612345678" into "+252612345678".
// Returns null if the result does not look like a real international number.
export function normalizePhone(input) {
  if (typeof input !== 'string') return null;

  let p = input.replace(/[\s\-().]/g, '');

  if (p.startsWith('+')) {
    // already international
  } else if (p.startsWith('00')) {
    p = '+' + p.slice(2);
  } else if (p.startsWith('0')) {
    p = '+' + DEFAULT_COUNTRY_CODE + p.slice(1);
  } else if (p.startsWith(DEFAULT_COUNTRY_CODE)) {
    p = '+' + p;
  } else {
    p = '+' + DEFAULT_COUNTRY_CODE + p;
  }

  return /^\+[1-9]\d{7,14}$/.test(p) ? p : null;
}