import { createServerFn } from "@tanstack/react-start";
import { parseSheet, parseTab, rowsForDeal } from "./deals";
import { parseResearch, normalizeAddress, researchPitchRow, seedAnalysis, RESEARCH_SHEET_URL, ANALYST_SHEET_URL, type ResearchDeal } from './research';

import { latestDeals, latestRooms, capexLines } from './underwriting';
import { standardScenario } from './standard-scenario';

// Anonymous preview reads use server-only connector credentials, never a visitor session.
export const getDeals = createServerFn({ method: "GET" })
  .inputValidator((data: { refresh?: boolean } = {}) => data)
  .handler(async ({data}) => {
    try {
      const snapshot = await readSnapshot(data?.refresh);
      const deals = parseResearch(snapshot[0] ?? []);
      const bundles: Awaited<ReturnType<typeof resolveDeal>>[] = [];
      for(let i=0;i<deals.length;i+=6) bundles.push(...await Promise.all(deals.slice(i,i+6).map(deal => resolveDeal(deal.id, snapshot, data?.refresh))));
      return { deals, analyses:Object.fromEntries(bundles.map((bundle,i)=>[deals[i]?.id,bundle.analysis])), bundles:Object.fromEntries(bundles.map((bundle,i)=>[deals[i]?.id,bundle])) };
    } catch (error) {
      // Live reads need the Lovable Sheets connector. Without those keys, serve the
      // published export so the pages still render the same three deals.
      if (data?.refresh || !sheetsUnlinked(error)) throw error;
      return publishedPayload();
    }
  });

export const getDeal = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    try {
      return await resolveDeal(data.id);
    } catch (error) {
      if (!sheetsUnlinked(error)) throw error;
      const payload = await publishedPayload();
      return payload.bundles[data.id] ?? emptyDeal();
    }
  });

function sheetsUnlinked(error: unknown): boolean {
  return error instanceof Error && error.message.includes("not linked");
}

async function publishedPayload() {
  const mod = await import("./published-deals.json");
  return ("default" in mod ? mod.default : mod) as {
    deals: ResearchDeal[];
    analyses: Record<string, Awaited<ReturnType<typeof resolveDeal>>["analysis"]>;
    bundles: Record<string, Awaited<ReturnType<typeof resolveDeal>>>;
  };
}

function emptyDeal(): Awaited<ReturnType<typeof resolveDeal>> {
  return { deal: null, research: null, overlayId: null, rentRoll: [], capex: [], callouts: [], analysis: null, sourceAnalysis: null, sheetUrl: "" };
}

async function readSnapshot(refresh = false) {
    const { readDealsSheet, readOptionalTab, readResearchDealList, readResearchCallouts } = await import("./sheets.server");
    return Promise.all([
      readResearchDealList(refresh),
      readDealsSheet(refresh),
      readOptionalTab("RentRoll", undefined, refresh),
      readOptionalTab("CapEx", undefined, refresh),
      readOptionalTab("Callouts", undefined, refresh),
      readResearchCallouts(refresh),
    ]);
}
async function resolveDeal(id: string, snapshot?: string[][][], refresh = false) {
    const {readOptionalTab} = await import('./sheets.server');
    const [researchValues=[],dealsValues=[],rentRollValues=[],capexValues=[],calloutValues=[],researchCalloutValues=[]] = snapshot ?? await readSnapshot(refresh);
    const table = parseSheet(dealsValues);
    const research = parseResearch(researchValues).find(d => d.id === id);
    // Ineligible Research IDs are never available through direct navigation.
    const overlay = research ? latestDeals(table.deals).reverse().find(d => normalizeAddress(d.cells['Address'] ?? '') === normalizeAddress(research['address']))
      : id.startsWith('DEN-') ? latestDeals(table.deals).reverse().find(d => d.cells['Deal ID'] === id) : undefined;
    const deal = research ? researchPitchRow(research, overlay) : overlay ?? null;
    const analystId = overlay?.cells['Deal ID'] ?? '';
    const rentRoll = latestRooms(rowsForDeal(parseTab(rentRollValues), analystId));
    const capex = capexLines(rowsForDeal(parseTab(capexValues), analystId));
    // Keep callout coordinates paired with the same source as the plan images.
    const callouts = overlay ? rowsForDeal(parseTab(calloutValues), analystId)
      : research ? rowsForDeal(parseTab(researchCalloutValues), research['id']) : [];
    const sourceId = (research?.cells['property_report_url'] || overlay?.cells['Detail Link'] || '').match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)?.[1];
    const sourceRows = sourceId ? await readOptionalTab('Inputs', sourceId, refresh) : [];
    const sourceAnalysis = deal ? seedAnalysis(deal.cells, rentRoll, capex, research?.cells, sourceRows) : null;
    return { deal, research: research ?? null, overlayId: analystId || null, rentRoll, capex, callouts,
      analysis: sourceAnalysis && research ? standardScenario(sourceAnalysis, research.cells) : sourceAnalysis, sourceAnalysis,
      sheetUrl: overlay ? `${ANALYST_SHEET_URL}&range=A${overlay.rowNumber}` : RESEARCH_SHEET_URL,
    };
  }
