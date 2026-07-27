/**
 * CSV import for the Finance Hub.
 *
 * Pure functions, deliberately kept out of the page component: React Fast
 * Refresh only works cleanly when a page module exports components alone, and
 * keeping the parsing here makes it directly testable without mounting any UI.
 */

// ── CSV parsing ────────────────────────────────────────────────────────────

/**
 * Parses CSV into a grid of raw strings.
 *
 * Deliberately hand-written rather than split(",") because the exported file
 * quotes every field, and descriptions routinely contain commas, quotes and
 * newlines. Handles doubled quotes ("" inside a quoted field), CRLF from Excel,
 * and the UTF-8 BOM that downloadCSV writes so Excel opens it correctly.
 */
export function parseCSV(text: string): string[][] {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const c = src[i];

    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
      continue;
    }

    if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }

  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/**
 * Money is rejected rather than guessed when the format is ambiguous.
 * "300.000" means three hundred thousand in id-ID and three hundred in en-US;
 * silently picking one would corrupt the client's books. Only the format the
 * exporter produces is accepted, and anything else gets an explicit error.
 */
export function parseAmount(raw: string): number | null {
  const s = raw.trim().replace(/^Rp\s*/i, "").replace(/\s/g, "");
  if (s === "") return null;

  // An integer, or one to two decimal places — exactly what numeric(15,2)
  // exports. Three or more digits after the dot is rejected rather than
  // parsed: "300.000" is three hundred thousand to an Indonesian writer and
  // three hundred to JavaScript, and quietly taking the latter would
  // understate the row a thousandfold.
  if (!/^-?\d+(\.\d{1,2})?$/.test(s)) return null;

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface ImportRow {
  line: number;
  payload: Record<string, unknown>;
  errors: string[];
}

type NamedRef = { id: number; name: string };

/**
 * Turns parsed CSV into create-payloads, validating each row independently so
 * one bad line does not hide the rest. Rows carry their own errors rather than
 * throwing, which lets the dialog show everything wrong at once instead of
 * making the user fix and re-upload one problem at a time.
 *
 * Business units and customers arrive as names (that is what the export
 * writes), so they are resolved back to ids here. An unknown name is an error,
 * never a silently dropped link — a row that quietly loses its business unit
 * would corrupt every per-unit report.
 */
export function buildImportRows(
  grid: string[][],
  kind: "income" | "expenses",
  units: NamedRef[],
  customers: NamedRef[],
): { rows: ImportRow[]; missingColumns: string[] } {
  const header = (grid[0] ?? []).map((h) => h.trim().toLowerCase());

  // Match on the exported labels, case-insensitively, so a file that has been
  // opened and re-saved in Excel still lines up.
  const indexOf = (label: string) => header.indexOf(label.toLowerCase());
  // Everything else is optional; without these two there is no transaction.
  const missingColumns = ["Date", "Amount (IDR)"].filter((label) => indexOf(label) === -1);
  if (missingColumns.length > 0) return { rows: [], missingColumns };

  const byName = (list: NamedRef[]) =>
    new Map(list.map((x) => [x.name.trim().toLowerCase(), x.id]));
  const unitIds = byName(units);
  const customerIds = byName(customers);

  const cell = (r: string[], label: string) => {
    const i = indexOf(label);
    return i === -1 ? "" : (r[i] ?? "").trim();
  };

  const rows = grid.slice(1).map((r, i): ImportRow => {
    const errors: string[] = [];
    const payload: Record<string, unknown> = {};

    const date = cell(r, "Date");
    if (!date) errors.push("Tanggal kosong");
    else if (!ISO_DATE.test(date)) errors.push(`Tanggal "${date}" harus format YYYY-MM-DD`);
    else payload.date = date;

    const rawAmount = cell(r, "Amount (IDR)");
    const amount = parseAmount(rawAmount);
    if (rawAmount === "") errors.push("Jumlah kosong");
    else if (amount === null) errors.push(`Jumlah "${rawAmount}" tidak dikenali — tulis angka polos, contoh 300000 atau 300000.50`);
    else payload.amount = amount;

    const rawTax = cell(r, "Tax (IDR)");
    if (rawTax !== "") {
      const tax = parseAmount(rawTax);
      if (tax === null) errors.push(`Pajak "${rawTax}" tidak dikenali`);
      else payload.tax = tax;
    }

    const buName = cell(r, "Business Unit");
    if (buName) {
      const id = unitIds.get(buName.toLowerCase());
      if (id === undefined) errors.push(`Business unit "${buName}" tidak ditemukan`);
      else payload.businessUnitId = id;
    }

    for (const [label, key] of [["Category", "category"], ["Description", "description"], ["Payment Method", "paymentMethod"]] as const) {
      const v = cell(r, label);
      if (v) payload[key] = v;
    }

    if (kind === "income") {
      const custName = cell(r, "Customer");
      if (custName) {
        const id = customerIds.get(custName.toLowerCase());
        if (id === undefined) errors.push(`Customer "${custName}" tidak ditemukan`);
        else payload.customerId = id;
      }
      const inv = cell(r, "Invoice #");
      if (inv) payload.invoiceNumber = inv;

      const status = cell(r, "Status") || "Received";
      if (!["Pending", "Received", "Cancelled"].includes(status)) {
        errors.push(`Status "${status}" harus Pending, Received, atau Cancelled`);
      } else payload.status = status;
    } else {
      for (const [label, key] of [["Vendor", "vendor"], ["Receipt #", "receiptNumber"]] as const) {
        const v = cell(r, label);
        if (v) payload[key] = v;
      }
    }

    // +2: one for the header row, one because spreadsheets count from 1 — so
    // the number shown matches what the user sees in Excel.
    return { line: i + 2, payload, errors };
  });

  return { rows, missingColumns: [] };
}

