export function parseFileNameToPath(fileName: string): string {
  const path = fileName.endsWith('/index.vue')
    ? fileName.slice(0, fileName.length - 10)
    : fileName.replace(/\.(\w*)$/, '');

  return '/' + path.replace(/^\//, '');
}

export function parseFileNameToCompName(fileName: string): string {
  const path = parseFileNameToPath(fileName);
  return path.replace(/[/-_][\w]/, (s) => s[1].toUpperCase());
}
