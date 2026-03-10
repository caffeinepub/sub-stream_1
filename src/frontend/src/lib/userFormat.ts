/**
 * Parses the backend `name` field which uses the convention:
 *   "DISPLAY NAME|username_handle|Real Name"
 * If no pipe is present, the whole string is treated as the username
 * and the display name is derived by uppercasing it.
 * Supports both 2-part (legacy) and 3-part (new) formats.
 */
export function getDisplayName(name: string): string {
  if (!name) return "";
  const parts = name.split("|");
  return (parts[0] ?? name).toUpperCase();
}

export function getUsername(name: string): string {
  if (!name) return "";
  const parts = name.split("|");
  if (parts.length < 2) return name.toLowerCase().replace(/[^a-z0-9_]/g, "");
  return (parts[1] ?? "").toLowerCase();
}

export function getRealName(name: string): string {
  if (!name) return "";
  const parts = name.split("|");
  return parts[2] ?? "";
}

/** Format a raw display name input to uppercase */
export function formatDisplayName(s: string): string {
  return s.toUpperCase();
}

/** Sanitize a username: lowercase, strip spaces, keep letters/numbers/underscores */
export function sanitizeUsername(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9_]/g, "");
}

/** Combine into the storage format. Optional realName as 3rd part. */
export function packName(
  displayName: string,
  username: string,
  realName?: string,
): string {
  const base = `${displayName.toUpperCase()}|${sanitizeUsername(username)}`;
  if (realName?.trim()) return `${base}|${realName.trim()}`;
  return base;
}
