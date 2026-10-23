/**
 * Server-side validation of link payloads. Never trust the client: every write goes through here.
 */
import { CreateLinkInput, LinkVisibility, UpdateLinkInput } from '../../shared/types/link';
import { normalizeShortName, validateShortNameFormat, validateTargetUrl } from '../../shared/validation';
import { badRequest } from '../errors';

const LIMITS = {
  targetUrl: 2048,
  description: 500,
  category: 50,
  owner: 254,
  tag: 40,
  tags: 20,
};

type Body = Record<string, unknown>;

function asObject(body: unknown): Body {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw badRequest('Request body must be a JSON object.');
  }
  return body as Body;
}

function optionalString(body: Body, field: string, max: number): string | undefined {
  const value = body[field];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw badRequest(`"${field}" must be a string.`);
  const trimmed = value.trim();
  if (trimmed.length > max) throw badRequest(`"${field}" cannot exceed ${max} characters.`);
  return trimmed;
}

function parseShortName(value: unknown): string {
  if (typeof value !== 'string') throw badRequest('"shortName" must be a string.');
  const result = validateShortNameFormat(value);
  if (!result.valid) throw badRequest(result.error || 'Invalid short name.');
  return normalizeShortName(value);
}

function parseTargetUrl(value: unknown): string {
  if (typeof value !== 'string') throw badRequest('"targetUrl" must be a string.');
  const trimmed = value.trim();
  if (trimmed.length > LIMITS.targetUrl) {
    throw badRequest(`"targetUrl" cannot exceed ${LIMITS.targetUrl} characters.`);
  }
  const result = validateTargetUrl(trimmed);
  if (!result.valid) throw badRequest(result.error || 'Invalid target URL.');
  return trimmed;
}

function parseVisibility(value: unknown): LinkVisibility | undefined {
  if (value === undefined || value === null) return undefined;
  if (value !== 'public' && value !== 'private') {
    throw badRequest('"visibility" must be "public" or "private".');
  }
  return value;
}

function parseIsActive(value: unknown): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'boolean') throw badRequest('"isActive" must be a boolean.');
  return value;
}

function parseTags(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value) || value.some((t) => typeof t !== 'string')) {
    throw badRequest('"tags" must be an array of strings.');
  }
  const tags = Array.from(new Set(value.map((t: string) => t.trim()).filter(Boolean)));
  if (tags.length > LIMITS.tags) throw badRequest(`A link can have at most ${LIMITS.tags} tags.`);
  if (tags.some((t) => t.length > LIMITS.tag)) {
    throw badRequest(`Tags cannot exceed ${LIMITS.tag} characters.`);
  }
  return tags;
}

export function parseCreateLinkInput(raw: unknown): CreateLinkInput {
  const body = asObject(raw);
  const category = optionalString(body, 'category', LIMITS.category);
  return {
    shortName: parseShortName(body.shortName),
    targetUrl: parseTargetUrl(body.targetUrl),
    description: optionalString(body, 'description', LIMITS.description) ?? '',
    category: category || 'General',
    owner: optionalString(body, 'owner', LIMITS.owner) ?? '',
    visibility: parseVisibility(body.visibility) ?? 'public',
    isActive: parseIsActive(body.isActive) ?? true,
    tags: parseTags(body.tags) ?? [],
  };
}

export function parseUpdateLinkInput(raw: unknown): UpdateLinkInput {
  const body = asObject(raw);
  const input: UpdateLinkInput = {};

  if (body.shortName !== undefined && body.shortName !== '') input.shortName = parseShortName(body.shortName);
  if (body.targetUrl !== undefined) input.targetUrl = parseTargetUrl(body.targetUrl);

  const description = optionalString(body, 'description', LIMITS.description);
  if (description !== undefined) input.description = description;

  const category = optionalString(body, 'category', LIMITS.category);
  if (category !== undefined) input.category = category || 'General';

  const owner = optionalString(body, 'owner', LIMITS.owner);
  if (owner !== undefined) {
    if (!owner) throw badRequest('"owner" cannot be empty.');
    input.owner = owner;
  }

  const visibility = parseVisibility(body.visibility);
  if (visibility !== undefined) input.visibility = visibility;

  const isActive = parseIsActive(body.isActive);
  if (isActive !== undefined) input.isActive = isActive;

  const tags = parseTags(body.tags);
  if (tags !== undefined) input.tags = tags;

  return input;
}
