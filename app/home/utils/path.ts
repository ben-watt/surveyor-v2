export const joinPath = (...parts: string[]): string => {
  const joined = parts
    .filter(Boolean)
    .join('/')
    .replace(/\\/g, '/');
  // Remove leading slashes for Amplify S3 key compatibility
  return joined.replace(/^\/+/, '');
};

export const sanitizeFileName = (name: string): string => {
  // Preserve extension while sanitizing basename
  const lastDot = name.lastIndexOf('.');
  const base = lastDot > 0 ? name.slice(0, lastDot) : name;
  const ext = lastDot > 0 ? name.slice(lastDot) : '';

  const sanitizedBase = base
    .trim()
    .replace(/\s+/g, '-') // spaces to dashes
    .replace(/[^A-Za-z0-9._-]/g, '') // remove unsafe chars
    .replace(/-+/g, '-') // collapse dashes
    .replace(/^\.+/, '') // no leading dots
    .slice(0, 100) || 'file';

  const sanitizedExt = ext.replace(/[^A-Za-z0-9.]/g, '').slice(0, 20);
  return `${sanitizedBase}${sanitizedExt}`;
};

