export function validateLogin(body) {
  const errors = [];

  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!email || !email.includes('@')) {
    errors.push('A valid email is required');
  }
  if (!password) {
    errors.push('Password is required');
  }

  return { errors, value: { email, password } };
}