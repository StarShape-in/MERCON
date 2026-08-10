const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(val: unknown): boolean {
  return typeof val === 'string' && UUID_REGEX.test(val);
}

export function getValidUuid(val: unknown): string | null {
  return isUuid(val) ? (val as string) : null;
}
