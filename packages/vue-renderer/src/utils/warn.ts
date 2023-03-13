export function warn(message: string) {
  console.warn('[vue-renderer]: ' + message);
}

const cached: Record<string, boolean> = {};
export function warnOnce(message: string) {
  if (!cached[message] && (cached[message] = true)) {
    warn(message);
  }
}
