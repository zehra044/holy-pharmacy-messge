const ASSIGNABLE_ROLES = ['MANAGER', 'EMPLOYEE'];

export function validateCreateUser(body) {
  const errors = [];

  const fullName = typeof body?.fullName === 'string' ? body.fullName.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const role = typeof body?.role === 'string' ? body.role.trim().toUpperCase() : '';

  if (!fullName) errors.push('Full name is required');
  if (!email || !email.includes('@')) errors.push('A valid email is required');
  if (password.length < 8) errors.push('Password must be at least 8 characters');
  if (!ASSIGNABLE_ROLES.includes(role)) {
    errors.push('Role must be MANAGER or EMPLOYEE');
  }

  return { errors, value: { fullName, email, password, role } };
}