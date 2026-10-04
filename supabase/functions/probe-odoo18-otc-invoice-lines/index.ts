import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type JsonRecord = Record<string, unknown>;
type Many2One = [number, string] | false | null;
type AccountMove = {
  id: number;
  move_type?: string;
  state?: string;
  invoice_date?: string;
  company_id?: Many2One;
};
type AccountMoveLine = {
  id: number;
  move_id?: Many2One;
  product_id?: Many2One;
  sale_line_ids?: number[];
  display_type?: string | false | null;
  account_id?: Many2One;
};

const ALLOWED_COMPANIES = [1, 2];

function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing required secret: ${name}`);
  return value;
}

async function rpc<T>(url: string, service: string, method: string, args: unknown[]): Promise<T> {
  const response = await fetch(`${url.replace(/\/$/, "")}/jsonrpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      params: { service, method, args },
      id: crypto.randomUUID(),
    }),
  });
  if (!response.ok) throw new Error(`Odoo HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.error) throw new Error(String(payload.error?.data?.message ?? payload.error?.message ?? "Odoo RPC error"));
  return payload.result as T;
}

async function executeKw<T>(
  url: string,
  db: string,
  uid: number,
  apiKey: string,
  model: string,
  method: string,
  positionalArgs: unknown[] = [],
  keywordArgs: JsonRecord = {},
): Promise<T> {
  return rpc<T>(url, "object", "execute_kw", [db, uid, apiKey, model, method, positionalArgs, keywordArgs]);
}

async function readAll<T>(
  url: string,
  db: string,
  uid: number,
  apiKey: string,
  model: string,
  domain: unknown[],
  fields: string[],
  companyIds: number[],
): Promise<T[]> {
  const rows: T[] = [];
  let offset = 0;
  while (true) {
    const page = await executeKw<T[]>(url, db, uid, apiKey, model, "search_read", [domain], {
      fields,
      limit: 500,
      offset,
      order: "id asc",
      context: { allowed_company_ids: companyIds },
    });
    rows.push(...page);
    if (page.length < 500) break;
    offset += page.length;
  }
  return rows;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Use POST" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({})) as JsonRecord;
    const startDate = typeof body.start_date === "string" && body.start_date ? body.start_date : "2026-09-01";
    const endDate = typeof body.end_date === "string" && body.end_date ? body.end_date : null;
    const requestedCompanies = Array.isArray(body.company_ids) ? body.company_ids.map(Number) : ALLOWED_COMPANIES;
    const companyIds = requestedCompanies.filter((id) => ALLOWED_COMPANIES.includes(id));
    if (!companyIds.length) throw new Error("No allowed company ids");

    const odooUrl = requiredEnv("ODOO_URL");
    const odooDb = Deno.env.get("ODOO_DB")?.trim() || "DB-LIVE";
    const username = requiredEnv("ODOO_USERNAME");
    const apiKey = requiredEnv("ODOO_API_KEY");
    const uid = await rpc<number | false>(odooUrl, "common", "authenticate", [odooDb, username, apiKey, {}]);
    if (!uid) throw new Error("Odoo authentication failed");

    const lineMeta = await executeKw<Record<string, unknown>>(
      odooUrl, odooDb, uid, apiKey, "account.move.line", "fields_get", [], { attributes: ["type"] },
    );
    const displayTypeAvailable = Boolean(lineMeta.display_type);
    const accountIdAvailable = Boolean(lineMeta.account_id);

    const moveDomain: unknown[] = [
      ["move_type", "in", ["out_invoice", "out_refund"]],
      ["state", "=", "posted"],
      ["company_id", "in", companyIds],
      ["invoice_date", ">=", startDate],
    ];
    if (endDate) moveDomain.push(["invoice_date", "<=", endDate]);

    const moves = await readAll<AccountMove>(
      odooUrl,
      odooDb,
      uid,
      apiKey,
      "account.move",
      moveDomain,
      ["id", "move_type", "state", "invoice_date", "company_id"],
      companyIds,
    );
    const moveIds = moves.map((move) => move.id);
    const moveTypeById = new Map(moves.map((move) => [move.id, move.move_type ?? "unknown"]));

    const fields = ["id", "move_id", "product_id", "sale_line_ids"];
    if (displayTypeAvailable) fields.push("display_type");
    if (accountIdAvailable) fields.push("account_id");

    const lines = moveIds.length
      ? await readAll<AccountMoveLine>(
          odooUrl,
          odooDb,
          uid,
          apiKey,
          "account.move.line",
          [["move_id", "in", moveIds], ["product_id", "!=", false]],
          fields,
          companyIds,
        )
      : [];

    const invoiceDisplayTypeCounts: Record<string, number> = {};
    const invoiceDisplayTypeLinkCounts: Record<string, { zero: number; single: number; multi: number }> = {};
    const invoiceMoveTypeDisplayCounts: Record<string, number> = {};
    const noSaleLineSamples: Array<Record<string, unknown>> = [];

    for (const line of lines) {
      const displayType = displayTypeAvailable ? String(line.display_type || "false") : "unavailable";
      const links = line.sale_line_ids ?? [];
      const bucket = links.length === 0 ? "zero" : links.length === 1 ? "single" : "multi";
      invoiceDisplayTypeCounts[displayType] = (invoiceDisplayTypeCounts[displayType] ?? 0) + 1;
      invoiceDisplayTypeLinkCounts[displayType] ??= { zero: 0, single: 0, multi: 0 };
      invoiceDisplayTypeLinkCounts[displayType][bucket] += 1;
      const moveId = Array.isArray(line.move_id) ? Number(line.move_id[0]) : null;
      const moveType = moveId ? moveTypeById.get(moveId) ?? "unknown" : "unknown";
      const moveDisplayKey = `${moveType}:${displayType}`;
      invoiceMoveTypeDisplayCounts[moveDisplayKey] = (invoiceMoveTypeDisplayCounts[moveDisplayKey] ?? 0) + 1;
      if (links.length === 0 && noSaleLineSamples.length < 20) {
        noSaleLineSamples.push({
          line_id: line.id,
          move_id: moveId,
          move_type: moveType,
          product_id: Array.isArray(line.product_id) ? Number(line.product_id[0]) : null,
          display_type: displayType,
          account_id: Array.isArray(line.account_id) ? Number(line.account_id[0]) : null,
        });
      }
    }

    const productLike = lines.filter((line) => String(line.display_type || "false") === "product");
    const productSingle = productLike.filter((line) => (line.sale_line_ids ?? []).length === 1).length;

    return new Response(JSON.stringify({
      success: true,
      mode: "read_only_invoice_line_probe",
      database: odooDb,
      companies: companyIds,
      start_date: startDate,
      end_date: endDate,
      writes_performed: 0,
      diagnostics: {
        display_type_available: displayTypeAvailable,
        account_id_available: accountIdAvailable,
        posted_invoice_credit_moves_count: moves.length,
        product_id_account_lines_count: lines.length,
        invoice_display_type_counts: invoiceDisplayTypeCounts,
        invoice_display_type_link_counts: invoiceDisplayTypeLinkCounts,
        invoice_move_type_display_counts: invoiceMoveTypeDisplayCounts,
        product_display_type_lines_count: productLike.length,
        product_display_type_single_sale_line_count: productSingle,
        product_display_type_single_sale_line_pct: productLike.length ? Number((productSingle / productLike.length * 100).toFixed(2)) : 0,
        no_sale_line_samples: noSaleLineSamples,
      },
    }), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      mode: "read_only_invoice_line_probe",
      writes_performed: 0,
      error: error instanceof Error ? error.message : String(error),
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
