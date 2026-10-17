// Read required settings once, and fail fast if one is missing.
function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const JWT_SECRET = required('JWT_SECRET');
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';