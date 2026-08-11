export const MEMBERS_UPDATED_KEY = "abbsy-members-updated";

/**
 * Cross-tab signal after member mutations.
 * Same-tab UI should call LiveDataProvider.refresh() directly (one fetch).
 * Other tabs pick this up via the storage event.
 */
export function notifyMembersChanged() {
  try {
    localStorage.setItem(MEMBERS_UPDATED_KEY, String(Date.now()));
  } catch {
    // ignore storage failures
  }
}

export function subscribeMembersChanged(callback: () => void) {
  function onStorage(e: StorageEvent) {
    if (e.key === MEMBERS_UPDATED_KEY) callback();
  }

  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}
