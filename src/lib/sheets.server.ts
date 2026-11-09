// Server-only, READ-ONLY access to Craig's deals Google Sheet via the
// connector gateway. This module never writes to the sheet.

const SPREADSHEET_ID = "1GtUJW18nNs3na6Ebq-kJBU-RUfcIc1c6UHI5iAIcgAU";
const RESEARCH_SPREADSHEET_ID = '1OHPhVzGSBeGOkc-IStZyTzJoXeZL1c6DdnVR_h-M7VA';
const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";

export const SHEET_EDIT_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit#gid=0`;

const cache = new Map<string, { expires: number; value: Promise<string[][]> }>();
async function fetchTab(tab: string, spreadsheetId = SPREADSHEET_ID, refresh = false): Promise<string[][]> {
  const key = `${spreadsheetId}:${tab}`;
  const hit = cache.get(key);
  if (!refresh && hit && hit.expires > Date.now()) return hit.value;
  const value = fetchTabUncached(tab, spreadsheetId);
  cache.set(key, { expires: Date.now() + 60000, value });
  try { return await value; } catch (error) { cache.delete(key); throw error; }
}

async function fetchTabUncached(tab: string, spreadsheetId = SPREADSHEET_ID): Promise<string[][]> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["GOOGLE_SHEETS_API_KEY"];
  if (!lovableKey || !connectionKey) {
    throw new Error("Google Sheets connection is not linked to this project");
  }
  const url = `${GATEWAY}/spreadsheets/${spreadsheetId}/values/'${tab}'!A1:AZ1000`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": connectionKey,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Sheets read failed [${res.status}] for tab ${tab}: ${body}`);
    throw new Error(`Could not read the deals sheet [${res.status}]`);
  }
  const data = (await res.json()) as { values?: string[][] };
  return data.values ?? [];
}

/** Fetch raw values from the 'Deals' tab (header row 1). GET only. */
export function readDealsSheet(refresh = false): Promise<string[][]> {
  return fetchTab("Deals", SPREADSHEET_ID, refresh);
}

/** PRIMARY acquisition feed; same private connector, GET only. */
export function readResearchDealList(refresh = false): Promise<string[][]> {
  return fetchTab('Deal List', RESEARCH_SPREADSHEET_ID, refresh);
}

/** Research Callouts use Research route IDs, not denser DEN deal IDs. */
export function readResearchCallouts(refresh = false): Promise<string[][]> {
  return readOptionalTab('Callouts', RESEARCH_SPREADSHEET_ID, refresh);
}

/**
 * Fetch an optional tab (RentRoll, CapEx, Callouts). A missing tab answers
 * 400 from the Sheets API; that is an expected empty state, not an error,
 * so it returns []. Any other failure still throws.
 */
export async function readOptionalTab(tab: string, spreadsheetId = SPREADSHEET_ID, refresh = false): Promise<string[][]> {
  try {
    return await fetchTab(tab, spreadsheetId, refresh);
  } catch (e) {
    if (e instanceof Error && e.message.includes("[400]")) return [];
    throw e;
  }
}
