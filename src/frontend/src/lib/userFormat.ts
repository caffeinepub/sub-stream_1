/**
 * Parses the backend `name` field which uses the convention:
 *   "DISPLAY NAME|username_handle"
 * If no pipe is present, the whole string is treated as the username
 * and the display name is derived by uppercasing it.
 */
export function getDisplayName(name: string): string {
  if (!name) return "";
  const pipe = name.indexOf("|");
  if (pipe === -1) return name.toUpperCase();
  return name.slice(0, pipe).toUpperCase();
}

export function getUsername(name: string): string {
  if (!name) return "";
  const pipe = name.indexOf("|");
  if (pipe === -1) return name.toLowerCase().replace(/[^a-z0-9_]/g, "");
  return name.slice(pipe + 1).toLowerCase();
}

/** Format a raw display name input to uppercase */
export function formatDisplayName(s: string): string {
  return s.toUpperCase();
}

/** Sanitize a username: lowercase, strip spaces, keep letters/numbers/underscores */
export function sanitizeUsername(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9_]/g, "");
}

/** Combine into the storage format */
export function packName(displayName: string, username: string): string {
  return `${displayName.toUpperCase()}|${sanitizeUsername(username)}`;
}
