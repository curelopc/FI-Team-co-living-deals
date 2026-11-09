// Pure parsing/filter/sort logic for the deals sheet. No I/O, no framework.

export interface DealRow {
  /** 1-based row number in the sheet (header is row 1). Used for "Open in sheet" links. */
  rowNumber: number;
  /** Cells keyed BY HEADER NAME. Columns may move in the sheet; never index by position. */
  cells: Record<string, string>;
}

export interface DealsTable {
  headers: string[];
  deals: DealRow[];
}

/**
 * Parse raw sheet values (row 1 = headers) into a DealsTable.
 * Rows with an empty "Deal ID" are skipped. Blank cells stay blank;
 * values are kept exactly as they appear in the sheet.
 */
export function parseSheet(values: string[][]): DealsTable {
  const headers = (values[0] ?? []).map((h) => String(h ?? "").trim());
  const deals: DealRow[] = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i] ?? [];
    const cells: Record<string, string> = {};
    headers.forEach((h, idx) => {
      if (h) cells[h] = String(row[idx] ?? "").trim();
    });
    if (!cells["Deal ID"]) continue;
    deals.push({ rowNumber: i + 1, cells });
  }
  return { headers, deals };
}

/** Parse a sheet value like "$1,250,000" or "8.5%" into a number. Returns null when not numeric. */
export function parseNumber(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[$,%\s,]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Sheet percentages may be percent strings or decimal fractions. */
export function formatCashOnCash(raw: string | undefined): string | null {
  const value = parseNumber(raw);
  if (value == null) return null;
  const percent = !raw?.includes("%") && Math.abs(value) <= 1 ? value * 100 : value;
  return `${percent.toFixed(1)}%`;
}

/** Parse a date string into a timestamp. Returns null when unparseable. */
export function parseDate(raw: string | undefined): number | null {
  if (!raw) return null;
  const t = Date.parse(raw);
  return Number.isNaN(t) ? null : t;
}

export interface DealFilters {
  /** Empty array = all verdicts. */
  verdicts: string[];
  priceMin: number | null;
  priceMax: number | null;
  /** Minimum Post-Conversion Rooms. */
  minRooms: number | null;
}

export type SortKey = "Cash-on-Cash" | "Cash Flow/mo" | "Date Found";
export interface DealSort {
  key: SortKey;
  dir: "asc" | "desc";
}

/** Distinct non-empty Verdict values present in the data, sorted. */
export function verdictOptions(deals: DealRow[]): string[] {
  return [...new Set(deals.map((d) => d.cells["Verdict"]).filter((v): v is string => Boolean(v)))].sort();
}

/**
 * Apply filters. Non-numeric Price / Post-Conversion Rooms values are only
 * excluded when the corresponding min/max is actually set.
 */
export function applyFilters(deals: DealRow[], f: DealFilters): DealRow[] {
  return deals.filter((d) => {
    if (f.verdicts.length > 0 && !f.verdicts.includes(d.cells["Verdict"] ?? "")) return false;
    if (f.priceMin != null || f.priceMax != null) {
      const p = parseNumber(d.cells["Price"]);
      if (p == null) return false;
      if (f.priceMin != null && p < f.priceMin) return false;
      if (f.priceMax != null && p > f.priceMax) return false;
    }
    if (f.minRooms != null) {
      const r = parseNumber(d.cells["Post-Conversion Rooms"]);
      if (r == null || r < f.minRooms) return false;
    }
    return true;
  });
}

/** Sort by a numeric column or Date Found. Blank/non-numeric values always sort last. */
export function applySort(deals: DealRow[], s: DealSort): DealRow[] {
  const val = (d: DealRow): number | null =>
    s.key === "Date Found" ? parseDate(d.cells[s.key]) : parseNumber(d.cells[s.key]);
  return [...deals].sort((a, b) => {
    const va = val(a);
    const vb = val(b);
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    return s.dir === "asc" ? va - vb : vb - va;
  });
}

// ---- Deal pitch page helpers ----

/** A row from a secondary tab (RentRoll, CapEx, Callouts), keyed by header name. */
export interface TabRow {
  rowNumber: number;
  cells: Record<string, string>;
}

/** Parse a secondary tab (header row 1). Rows with an empty "Deal ID" are skipped. */
export function parseTab(values: string[][]): TabRow[] {
  const headers = (values[0] ?? []).map((h) => String(h ?? "").trim());
  const rows: TabRow[] = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i] ?? [];
    const cells: Record<string, string> = {};
    headers.forEach((h, idx) => {
      if (h) cells[h] = String(row[idx] ?? "").trim();
    });
    if (!cells["Deal ID"]) continue;
    rows.push({ rowNumber: i + 1, cells });
  }
  return rows;
}

/** Rows of a secondary tab belonging to one deal. */
export function rowsForDeal(rows: TabRow[], dealId: string): TabRow[] {
  return rows.filter((r) => r.cells["Deal ID"] === dealId);
}

/**
 * Convert a Google Drive link to a directly viewable image URL.
 * Handles /file/d/ID/..., open?id=ID and uc?id=ID links. Returns null when
 * no file ID can be found; the caller then shows the empty image slot.
 */
export function driveImageUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  const m = raw.match(/\/d\/([a-zA-Z0-9_-]{10,})/) ?? raw.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  return m ? `https://drive.google.com/uc?export=view&id=${m[1]}` : null;
}

/** Browser-safe fallback when Chromium blocks the Drive download response. */
export function driveImageFallbackUrl(raw: string | undefined): string | null {
  const primary = driveImageUrl(raw);
  if (!primary) return null;
  const id = new URL(primary).searchParams.get("id");
  return id ? `https://lh3.googleusercontent.com/d/${id}` : null;
}

export type VerdictKind = "pursue" | "watch" | "pass" | "pending";

/** Case-insensitive verdict bucket. Anything unknown or blank is "pending". */
export function verdictKind(raw: string | undefined): VerdictKind {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "pursue" || v === "watch" || v === "pass") return v;
  return "pending";
}

export interface PitchNumbers {
  /** Down Payment + Closing Costs + CapEx total; null unless all three exist. */
  cashInvested: number | null;
  /** Sum of CapEx tab rows; falls back to Conversion Budget + Furnishing. */
  capexTotal: number | null;
  /** True when the CapEx tab sum and Conversion Budget + Furnishing both exist and differ. */
  capexMismatch: boolean;
  /** Cash Flow/mo x 12; null when Cash Flow/mo is not numeric. */
  annualCashFlow: number | null;
  monthlyCashFlow: number | null;
  /** Sum of RentRoll Rent/mo; null when the deal has no rent roll rows. */
  rentRollTotal: number | null;
}

/**
 * Compute the pitch page numbers from the deal row and its tab rows.
 * Never invents values: anything missing stays null and renders as "n/a".
 */
export function computePitch(
  cells: Record<string, string>,
  rentRoll: TabRow[],
  capexItems: TabRow[],
): PitchNumbers {
  const monthlyCashFlow = parseNumber(cells["Cash Flow/mo"]);
  const annualCashFlow = monthlyCashFlow == null ? null : monthlyCashFlow * 12;

  const conv = parseNumber(cells["Conversion Budget"]);
  const furn = parseNumber(cells["Furnishing"]);
  const budgetTotal = conv != null && furn != null ? conv + furn : null;

  const capexSum =
    capexItems.length > 0
      ? capexItems.reduce((sum, r) => sum + (parseNumber(r.cells["Cost"]) ?? 0), 0)
      : null;

  const capexTotal = capexSum ?? budgetTotal;
  const capexMismatch = capexSum != null && budgetTotal != null && capexSum !== budgetTotal;

  const down = parseNumber(cells["Down Payment"]);
  const closing = parseNumber(cells["Closing Costs"]);
  const cashInvested =
    down != null && closing != null && capexTotal != null ? down + closing + capexTotal : null;

  const rentRollTotal =
    rentRoll.length > 0
      ? rentRoll.reduce((sum, r) => sum + (parseNumber(r.cells["Rent/mo"]) ?? 0), 0)
      : null;

  return { cashInvested, capexTotal, capexMismatch, annualCashFlow, monthlyCashFlow, rentRollTotal };
}
