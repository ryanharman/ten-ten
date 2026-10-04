/**
 * Holds a pending app update (new service worker waiting). It is applied at a
 * safe moment — when the player starts a new game — never mid-game.
 */
let pendingUpdate: (() => void) | null = null;

export function setPendingUpdate(apply: () => void): void {
  pendingUpdate = apply;
}

/** Applies a pending update (reloads the app). Returns false if none is pending. */
export function applyPendingUpdate(): boolean {
  if (!pendingUpdate) return false;
  const apply = pendingUpdate;
  pendingUpdate = null;
  apply();
  return true;
}
