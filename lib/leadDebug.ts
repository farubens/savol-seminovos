export function logLeadPayload(label: string, payload: unknown): void {
  console.group(`[Leadmob payload] ${label}`);
  console.log(payload);
  console.groupEnd();
}

export async function logLeadmobResponse(label: string, response: Response): Promise<void> {
  const payload = await response.clone().json().catch(async () => response.clone().text().catch(() => null));

  if (payload && typeof payload === "object" && "request" in payload) {
    console.group(`[Leadmob final payload] ${label}`);
    console.log((payload as { request?: unknown }).request);
    console.groupEnd();
  }

  console.groupCollapsed(`[Leadmob response] ${label}`);
  console.log(payload);
  console.groupEnd();
}
