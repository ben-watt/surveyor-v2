/**
 * Sanitizes a file name by removing invalid characters and ensuring it's safe for storage
 */
export function sanitizeFileName(fileName: string): string {
  // Remove invalid characters
  const sanitized = fileName.replace(/[^a-zA-Z0-9-_\.]/g, '_');
  // Ensure it's not empty
  return sanitized || 'untitled';
}

/**
 * Calculates a simple checksum for content validation
 */
export async function calculateChecksum(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
} 