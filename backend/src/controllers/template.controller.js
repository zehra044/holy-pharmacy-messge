import {
  validateCreateTemplate,
  validateUpdateTemplate,
  validateTemplateListQuery,
} from '../validators/template.validator.js';
import * as templateService from '../services/template.service.js';
import { isUuid } from '../utils/uuid.js';

export async function createTemplate(req, res, next) {
  try {
    const { errors, value } = validateCreateTemplate(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    const template = await templateService.createTemplate(req.user, value);
    res.status(201).json({ template });
  } catch (err) {
    next(err);
  }
}

export async function listTemplates(req, res, next) {
  try {
    const { errors, value } = validateTemplateListQuery(req.query);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    const templates = await templateService.listTemplates(req.user, value);
    res.status(200).json({ templates });
  } catch (err) {
    next(err);
  }
}

export async function getTemplate(req, res, next) {
  try {
    if (!isUuid(req.params.id)) return res.status(400).json({ error: 'Invalid template id' });
    const template = await templateService.getTemplate(req.user, req.params.id);
    res.status(200).json({ template });
  } catch (err) {
    next(err);
  }
}

export async function updateTemplate(req, res, next) {
  try {
    if (!isUuid(req.params.id)) return res.status(400).json({ error: 'Invalid template id' });
    const { errors, value } = validateUpdateTemplate(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    const template = await templateService.updateTemplate(req.user, req.params.id, value);
    res.status(200).json({ template });
  } catch (err) {
    next(err);
  }
}