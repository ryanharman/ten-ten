/**
 * Namespaced, failure-tolerant localStorage access. Storage can throw (private
 * mode, quota, disabled) — the game must keep working without it.
 */
const PREFIX = "ten-ten:";

export function readStored(key: string): string | null {
  try {
    return localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(PREFIX + key, value);
  } catch {
    // Persistence is best-effort.
  }
}
