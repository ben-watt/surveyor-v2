import { Err, Ok, Result } from 'ts-results';

/**
 * Validates markdown content
 */
export function validateMarkdown(content: string): Result<void, Error> {
  // Basic markdown validation
  if (!content.trim()) {
    return Err(new Error('Content cannot be empty'));
  }
  return Ok(undefined);
}

/**
 * Validates HTML content
 */
export function validateHtml(content: string): Result<void, Error> {
  // Basic HTML validation
  if (!content.trim()) {
    return Err(new Error('Content cannot be empty'));
  }
  if (!content.includes('<') || !content.includes('>')) {
    return Err(new Error('Invalid HTML content'));
  }
  return Ok(undefined);
}

/**
 * Validates JSON content
 */
export function validateJson(content: string): Result<void, Error> {
  try {
    JSON.parse(content);
    return Ok(undefined);
  } catch (error) {
    return Err(new Error('Invalid JSON content'));
  }
}
