/**
 * Hosting (8 Nov 2026): one shared password protects a hosted copy until real logins exist.
 * `authorization` is the request's Authorization header; `password` comes from APP_PASSWORD.
 * No password set = open (your own computer, tests). Any user name is accepted.
 */
export function isAllowed(authorization: string | null, password: string | undefined): boolean {
  if (!password) return true;
  if (!authorization?.startsWith("Basic ")) return false;
  let decoded: string;
  try {
    decoded = atob(authorization.slice("Basic ".length).trim());
  } catch {
    return false;
  }
  const given = decoded.slice(decoded.indexOf(":") + 1);
  return decoded.includes(":") && sameText(given, password);
}

/** Compares without stopping at the first difference, so timing doesn't hint at the password. */
function sameText(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
