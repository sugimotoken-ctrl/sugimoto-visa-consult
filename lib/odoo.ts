// Read-only Odoo client over JSON-RPC. Server-only — never import in client code.
// Credentials come from env: ODOO_URL, ODOO_DB, ODOO_LOGIN, ODOO_API_KEY.

const ODOO_URL = process.env.ODOO_URL?.replace(/\/+$/, "");
const ODOO_DB = process.env.ODOO_DB;
const ODOO_LOGIN = process.env.ODOO_LOGIN;
const ODOO_API_KEY = process.env.ODOO_API_KEY;

export function odooConfigured(): boolean {
  return Boolean(ODOO_URL && ODOO_DB && ODOO_LOGIN && ODOO_API_KEY);
}

export class OdooError extends Error {}

async function jsonRpc(service: string, method: string, args: unknown[]) {
  if (!ODOO_URL) throw new OdooError("ODOO_URL is not set.");
  const res = await fetch(`${ODOO_URL}/jsonrpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      params: { service, method, args },
      id: Math.floor(Math.random() * 1e9),
    }),
    // Odoo can be slow; give it room but don't hang forever.
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new OdooError(`Odoo HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) {
    const msg =
      data.error?.data?.message || data.error?.message || "Odoo RPC error";
    throw new OdooError(msg);
  }
  return data.result;
}

let cachedUid: number | null = null;

export async function odooLogin(): Promise<number> {
  if (!odooConfigured())
    throw new OdooError(
      "Odoo is not configured. Set ODOO_URL, ODOO_DB, ODOO_LOGIN, ODOO_API_KEY."
    );
  if (cachedUid) return cachedUid;
  const uid = await jsonRpc("common", "login", [
    ODOO_DB,
    ODOO_LOGIN,
    ODOO_API_KEY,
  ]);
  if (!uid || typeof uid !== "number")
    throw new OdooError("Odoo authentication failed — check login / API key.");
  cachedUid = uid;
  return uid;
}

// Generic model call (search_read, read, etc.).
export async function odooExecute(
  model: string,
  method: string,
  args: unknown[] = [],
  kwargs: Record<string, unknown> = {}
) {
  const uid = await odooLogin();
  return jsonRpc("object", "execute_kw", [
    ODOO_DB,
    uid,
    ODOO_API_KEY,
    model,
    method,
    args,
    kwargs,
  ]);
}

export type OdooStage = { id: number; name: string };
export type OdooTag = { id: number; name: string };

export type OdooLead = {
  id: number;
  name: string;
  contact_name: string | false;
  partner_name: string | false;
  email_from: string | false;
  phone: string | false;
  mobile: string | false;
  description: string | false;
  city: string | false;
  country_id: [number, string] | false;
  tag_ids: number[];
  stage_id: [number, string] | false;
};

export async function getStages(): Promise<OdooStage[]> {
  const rows = await odooExecute("crm.stage", "search_read", [[]], {
    fields: ["id", "name"],
    order: "sequence",
  });
  return rows as OdooStage[];
}

export async function getTags(): Promise<OdooTag[]> {
  const rows = await odooExecute("crm.tag", "search_read", [[]], {
    fields: ["id", "name"],
    order: "name",
  });
  return rows as OdooTag[];
}

export async function getLeadsInStage(stageId: number): Promise<OdooLead[]> {
  const rows = await odooExecute(
    "crm.lead",
    "search_read",
    [[["stage_id", "=", stageId]]],
    {
      fields: [
        "id",
        "name",
        "contact_name",
        "partner_name",
        "email_from",
        "phone",
        "mobile",
        "description",
        "city",
        "country_id",
        "tag_ids",
        "stage_id",
      ],
      limit: 500,
    }
  );
  return rows as OdooLead[];
}

// Quick connectivity check used by the admin page.
export async function testConnection(): Promise<{
  ok: boolean;
  uid?: number;
  error?: string;
}> {
  try {
    cachedUid = null;
    const uid = await odooLogin();
    return { ok: true, uid };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
