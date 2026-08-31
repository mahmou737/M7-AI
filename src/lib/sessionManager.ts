/**
 * Smart Session & Cache Lifecycle Management for M7 AI
 */

const LAST_ACTIVITY_KEY = "m7_last_interaction_timestamp";
const SESSION_START_KEY = "m7_current_session_token";

// Default timeout: 45 minutes of total user inactivity
export const SESSION_INACTIVITY_TIMEOUT_MS = 45 * 60 * 1000;

export function recordUserActivity(): void {
  try {
    const now = Date.now();
    localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
  } catch {}
}

export function isSessionExpired(): boolean {
  try {
    const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (!lastActivity) return false;
    const elapsed = Date.now() - parseInt(lastActivity, 10);
    return elapsed > SESSION_INACTIVITY_TIMEOUT_MS;
  } catch {
    return false;
  }
}

export function checkAndEnforceSessionLifecycle(): { hasReset: boolean } {
  try {
    if (isSessionExpired()) {
      recordUserActivity();
      return { hasReset: true };
    }

    const activeInstance = sessionStorage.getItem(SESSION_START_KEY);
    if (!activeInstance) {
      sessionStorage.setItem(SESSION_START_KEY, String(Date.now()));
      recordUserActivity();
    } else {
      recordUserActivity();
    }
    return { hasReset: false };
  } catch {
    return { hasReset: false };
  }
}

export function performFullAppCacheClean(): { success: boolean; freedItems: number } {
  let freedCount = 0;
  try {
    // Preserve authentication, theme, language preferences and chat store
    const keysToPreserve = new Set(["m7_auth_user", "m7_theme", "m7_lang", "i18nextLng", "m7_chats", "m7_cached_conversations"]);
    const allKeys = Object.keys(localStorage);

    for (const key of allKeys) {
      if (!keysToPreserve.has(key)) {
        localStorage.removeItem(key);
        freedCount++;
      }
    }

    sessionStorage.clear();
    recordUserActivity();
    return { success: true, freedItems: freedCount };
  } catch (err) {
    console.warn("Failed to clean app cache:", err);
    return { success: false, freedItems: 0 };
  }
}
