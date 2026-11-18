import { findTemplateProblems } from '../utils/template.js';

const MAX_NAME = 80;
const MAX_BODY = 600;

export function validateCreateTemplate(body) {
  const errors = [];
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const text = typeof body?.body === 'string' ? body.body.trim() : '';

  if (!name || name.length > MAX_NAME) errors.push(`name is required (max ${MAX_NAME} characters)`);
  if (!text || text.length > MAX_BODY) errors.push(`body is required (max ${MAX_BODY} characters)`);
  else errors.push(...findTemplateProblems(text));

  return { errors, value: { name, body: text } };
}

export function validateUpdateTemplate(body) {
  const errors = [];
  const value = {};

  if (body?.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name || name.length > MAX_NAME) errors.push(`name must be 1 to ${MAX_NAME} characters`);
    else value.name = name;
  }

  if (body?.body !== undefined) {
    const text = typeof body.body === 'string' ? body.body.trim() : '';
    if (!text || text.length > MAX_BODY) errors.push(`body must be 1 to ${MAX_BODY} characters`);
    else {
      const problems = findTemplateProblems(text);
      if (problems.length > 0) errors.push(...problems);
      else value.body = text;
    }
  }

  if (body?.isActive !== undefined) {
    if (typeof body.isActive !== 'boolean') errors.push('isActive must be true or false');
    else value.isActive = body.isActive;
  }

  if (errors.length === 0 && Object.keys(value).length === 0) {
    errors.push('Provide at least one field to update: name, body or isActive');
  }

  return { errors, value };
}

export function validateTemplateListQuery(query) {
  const errors = [];

  // Default: active templates only. "all" returns both.
  let isActive = true;
  if (query.isActive === 'false') isActive = false;
  else if (query.isActive === 'all') isActive = undefined;
  else if (query.isActive !== undefined && query.isActive !== 'true') {
    errors.push('isActive must be "true", "false" or "all"');
  }

  return { errors, value: { isActive } };
}