export const ALLOWED_PLACEHOLDERS = ['customer_name', 'balance', 'currency'];

const TOKEN = /\{[^{}]*\}/g;

// Returns a list of problems (empty list = template is fine).
export function findTemplateProblems(body) {
  const problems = [];

  const tokens = body.match(TOKEN) || [];
  const unknown = [...new Set(tokens.filter((t) => !ALLOWED_PLACEHOLDERS.includes(t.slice(1, -1))))];
  if (unknown.length > 0) {
    const allowed = ALLOWED_PLACEHOLDERS.map((p) => `{${p}}`).join(', ');
    problems.push(`Unknown placeholder(s): ${unknown.join(', ')}. Allowed: ${allowed}`);
  }

  // Anything left over after removing valid-looking tokens must not contain braces.
  if (/[{}]/.test(body.replace(TOKEN, ''))) {
    problems.push('Template has an unmatched { or }');
  }

  return problems;
}

// One pass only: replaced text is never scanned again.
export function renderTemplate(body, values) {
  return body.replace(TOKEN, (token) => {
    const key = token.slice(1, -1);
    return Object.hasOwn(values, key) ? values[key] : token;
  });
}