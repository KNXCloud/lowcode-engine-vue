export function parseFileNameToPath(fileName: string): string {
  const path = fileName.endsWith('/index.vue')
    ? fileName.slice(0, fileName.length - 10)
    : fileName.replace(/\.(\w*)$/, '');

  return '/' + path.replace(/^\//, '');
}
