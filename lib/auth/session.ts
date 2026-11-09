const TOKEN_KEY = "nordin-demo-token";
const listeners = new Set<() => void>();
// Only browser events change this flag; it contains no credential or user data.
let revoked = false;

export function getDemoToken(): string | null {
  if (revoked || typeof window === "undefined") return null;
  try { return sessionStorage.getItem(TOKEN_KEY)?.trim() || null; } catch { return null; }
}
export function getSessionSnapshot() { return revoked ? "revoked" : getDemoToken() ? "signed-in" : "signed-out"; }
export function getServerSessionSnapshot(): undefined { return undefined; }
function emit() { listeners.forEach((listener) => listener()); }
export function subscribeSession(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => { listeners.delete(listener); window.removeEventListener("storage", listener); };
}
export function setDemoToken(value: string) {
  const token = value.trim();
  if (!token) throw new Error("Empty demo token");
  sessionStorage.setItem(TOKEN_KEY, token);
  revoked = false;
  emit();
}
export function revokeDemoSession() {
  if (revoked) return false;
  revoked = true;
  try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* Revocation still blocks the token getter. */ }
  emit();
  return true;
}
