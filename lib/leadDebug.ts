import { buildLeadmobCodePreview, type LeadmobRuleInput } from "@/lib/leadmobRules";

function enrichLeadPayload(payload: unknown): unknown {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;
  if ("empresa" in payload || "Empresa" in payload || "departamento" in payload || "origem" in payload) return payload;

  const codes = buildLeadmobCodePreview(payload as LeadmobRuleInput);
  return {
    ...payload,
    companyId: codes.companyId,
    departmentId: codes.departmentId,
    originId: codes.originId,
    leadmobPreview: {
      empresa: codes.empresa,
      departamento: codes.departamento,
      origem: codes.origem
    }
  };
}

export function logLeadPayload(label: string, payload: unknown): void {
  console.group(`[Leadmob payload] ${label}`);
  console.log(enrichLeadPayload(payload));
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
