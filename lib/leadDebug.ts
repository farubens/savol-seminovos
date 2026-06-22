const DEBUG_STORAGE_KEY = "savol-debug-leadmob";

function isLocalHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function isLeadDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;

  const params = new URLSearchParams(window.location.search);
  const queryValue = params.get("debug_leadmob");

  if (queryValue) {
    const enabled = queryValue !== "0" && queryValue.toLowerCase() !== "false";
    window.localStorage.setItem(DEBUG_STORAGE_KEY, enabled ? "true" : "false");
    return enabled;
  }

  return isLocalHost(window.location.hostname) || window.localStorage.getItem(DEBUG_STORAGE_KEY) === "true";
}

export function logLeadPayload(label: string, payload: unknown): void {
  if (!isLeadDebugEnabled()) return;

  console.groupCollapsed(`[Leadmob payload] ${label}`);
  console.log(payload);
  console.groupEnd();
}

export async function logLeadmobResponse(label: string, response: Response): Promise<void> {
  if (!isLeadDebugEnabled()) return;

  const payload = await response.clone().json().catch(async () => response.clone().text().catch(() => null));
  console.groupCollapsed(`[Leadmob response] ${label}`);
  console.log(payload);
  console.groupEnd();
}
