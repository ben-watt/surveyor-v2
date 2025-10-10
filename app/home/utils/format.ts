export const toFileSize = (size: number): [number, string] => {
  if (size < 1024) {
    return [size, 'B'];
  } else if (size < 1024 * 1024) {
    return [Math.round(size / 1024), 'KB'];
  } else if (size < 1024 * 1024 * 1024) {
    return [Math.round(size / 1024 / 1024), 'MB'];
  } else {
    return [Math.round(size / 1024 / 1024 / 1024), 'GB'];
  }
};

export const formatFileSize = (size?: number): string => {
  if (!size && size !== 0) return 'Unknown size';
  const [value, unit] = toFileSize(size);
  return `${value} ${unit}`;
};

