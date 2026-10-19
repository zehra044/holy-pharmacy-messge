// Read required settings once, and fail fast if one is missing.
export const DEFAULT_COUNTRY_CODE = process.env.DEFAULT_COUNTRY_CODE || '252';
function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const JWT_SECRET = required('JWT_SECRET');
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';
export const MAX_CREDIT_AMOUNT = Number(process.env.MAX_CREDIT_AMOUNT || 10000);
export const MAX_BACKDATE_DAYS = Number(process.env.MAX_BACKDATE_DAYS || 90);