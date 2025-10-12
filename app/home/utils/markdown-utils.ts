import { Err, Ok, Result } from 'ts-results';

/**
 * Basic markdown validation
 */
export function validateMarkdown(content: string): Result<void, Error> {
  if (!content) {
    return Err(new Error('Content cannot be empty'));
  }

  // Basic markdown structure check
  const hasContent = content.trim().length > 0;
  if (!hasContent) {
    return Err(new Error('Content must not be empty'));
  }

  // Check for maximum size (10MB)
  if (content.length > 10 * 1024 * 1024) {
    return Err(new Error('Content exceeds maximum size of 10MB'));
  }

  return Ok(undefined);
}
