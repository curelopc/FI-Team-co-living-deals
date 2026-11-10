import dailyRaw from './daily-2026-11-10.json';
import { listingPhotos } from './listing-photos';
import { locationEvidence } from './location-evidence';
import { portalDeal } from './portal-catalog';
import { drawnRoomInventory } from './room-inventory';
import { evidenceWithRent } from './room-rent-text';
import { researchPitchRow, type ResearchDeal } from './research';
import { calculateAnalysis, type AnalysisInputs, type AnalysisRoom, type AnalysisSeed } from './underwriting';

type DailyRoom = { level: string; space: string; work: string; bath: string; rent: number | null; rent_basis: string };
type DailyModel = {
  rent: number | null; tenant_utility_income: number | null; gross: number | null;
  cash_flow: number | null; coc_pct: number | null; cap_rate_pct: number | null;
  invested: number | null; holding: number | null; down: number | null; closing: number | null;
  reno: number | null; pi: number | null; loan: number | null;
  expenses: Record<string, number>; rent_assumption: string;
};
type DailyDeal = {
  slug: string; addr: string; city: string; mls: string; price: number; sqft: number;
  beds: number; baths: string; baths_n: number; added_baths: number; listing_url: string;
  risks: string[]; heuristic: string; common: string; rooms_source: string; parking_note: string;
  clp_status: string; clp_note: string; shared_conf: string; private_conf: string;
  shared_rent: number | null; private_rent: number | null;
  rooms: DailyRoom[]; model: DailyModel;
};

const dailyDeals = dailyRaw as DailyDeal[];

/** Keep the live URLs. Fraser stays /deal/6 and Elmira stays /deal/40. */
const siteIdBySlug: Record<string, string> = { 'fraser-1584': '6', 'elmira-911': '40' };
const newSlugs = new Set(['beth-216','oregon-12055','york-7751','crown-4860','ceylon-4317','perth-4965','macon-2069','pacific-17004','fillmore-12357','ouray-3404']);
const lowConfidence = new Set(['beth-216','21st-255','rose-825','poppy-892']);

const extraCoords: Record<string, { lat: number; lon: number; note: string }> = {
  'beth-216': { lat: 40.0820119, lon: -104.8017458, note: 'OpenStreetMap Nominatim address lookup, Nov 10, 2026' },
  'oregon-12055': { lat: 39.68671, lon: -104.8479936, note: 'OpenStreetMap Nominatim address lookup, Nov 10, 2026' },
  'york-7751': { lat: 39.856, lon: -104.965, note: 'ZIP 80229 centroid. The geocoder did not match 7751 York Street, so this pin is approximate.' },
  'crown-4860': { lat: 39.7831589, lon: -104.8316214, note: 'OpenStreetMap Nominatim address lookup, Nov 10, 2026' },
  'ceylon-4317': { lat: 39.7746378, lon: -104.764494, note: 'OpenStreetMap Nominatim address lookup, Nov 10, 2026' },
  'perth-4965': { lat: 39.7844842, lon: -104.7360974, note: 'OpenStreetMap Nominatim address lookup, Nov 10, 2026' },
  'macon-2069': { lat: 39.6790936, lon: -104.8563071, note: 'OpenStreetMap Nominatim address lookup, Nov 10, 2026' },
  'pacific-17004': { lat: 39.6789253, lon: -104.7899516, note: 'OpenStreetMap Nominatim address lookup, Nov 10, 2026' },
  'fillmore-12357': { lat: 39.9201084, lon: -104.9521989, note: 'OpenStreetMap Nominatim address lookup, Nov 10, 2026' },
  'ouray-3404': { lat: 39.6542696, lon: -104.7922024, note: 'OpenStreetMap Nominatim address lookup, Nov 10, 2026' },
};

export function siteIdForSlug(slug: string): string {
  return siteIdBySlug[slug] ?? slug;
}

export function dailyDealById(id: string): DailyDeal | undefined {
  return dailyDeals.find(deal => siteIdForSlug(deal.slug) === id);
}

function coords(id: string, slug: string): { lat: number; lon: number; note: string } {
  const known = locationEvidence[id];
  if (known) return { lat: known.latitude, lon: known.longitude, note: known.provenance };
  const portal = portalDeal(slug) ?? portalDeal(id);
  if (portal) return { lat: portal.latitude, lon: portal.longitude, note: 'OpenStreetMap Nominatim address lookup, Nov 9, 2026' };
  return extraCoords[slug] ?? { lat: 39.74, lon: -104.99, note: 'Map pin not matched to a street address.' };
}

function planMode(id: string, slug: string): 'drawn' | 'concept' | 'unverified' {
  if (id === '6' || id === '40') return 'drawn';
  if (newSlugs.has(slug)) return 'unverified';
  return 'concept';
}

function roomsFor(deal: DailyDeal, id: string): AnalysisRoom[] {
  const drawn = drawnRoomInventory(id);
  if (drawn && drawn.length === deal.rooms.length) {
    return drawn.map((room, index) => {
      const source = deal.rooms[index];
      const rent = source?.rent ?? null;
      return { ...room, rent, evidence: evidenceWithRent([room.evidence, source?.rent_basis].filter(Boolean).join(' '), rent) };
    });
  }
  return deal.rooms.map((room, index) => ({
    number: index + 1,
    drawn: true,
    name: `Bedroom ${index + 1}`,
    level: room.level || 'Unverified',
    bath: /private|ensuite/i.test(room.bath) ? 'Private bath (concept)' : 'Hall/shared',
    rent: room.rent,
    evidence: evidenceWithRent([room.space, room.rent_basis].filter(Boolean).join('. '), room.rent),
  }));
}

function inputsFor(deal: DailyDeal, rooms: AnalysisRoom[]): AnalysisInputs {
  const exp = deal.model.expenses;
  const lines: [string, number | undefined][] = [
    ['Water', exp['water']],
    ['Gas', exp['gas']],
    ['Electricity', exp['electric']],
    ['Internet', exp['internet']],
    ['Trash', exp['trash']],
    ['Cleaning', exp['cleaning']],
    ['Lawn care', exp['lawn']],
    ['Maintenance / security', exp['maintenance_security']],
    ['Pest', exp['pest']],
    ['HOA', exp['hoa']],
    ['Septic', exp['septic']],
    ['Repairs / maintenance', exp['repairs_5pct_gross']],
    ['Monthly CapEx reserve', exp['capex_reserve_5pct_gross']],
  ];
  return {
    price: deal.price,
    rate: 7.5,
    termYears: 30,
    downPercent: 20,
    closingCosts: deal.model.closing,
    taxes: exp['property_tax'] ?? null,
    insurance: exp['insurance_equals_tax'] ?? null,
    utilities: 0,
    managementPercent: 16,
    vacancyPercent: 5,
    reno: deal.model.reno,
    holding: deal.model.holding,
    invoiceCredit: 0,
    otherIncome: 0,
    rooms,
    capex: deal.model.reno == null ? [] : [{ name: 'Renovation and furnishing', cost: deal.model.reno }],
    expenses: lines.filter((entry): entry is [string, number] => entry[1] != null).map(([name, amount]) => ({
      name, amount, evidence: '2026-11-10 deal model. Estimate, not a quote.',
    })),
    tenantUtilityFee: deal.clp_status === 'ok' ? 80 : null,
    managementBase: 'gross',
    sharedRentEstimate: deal.shared_rent,
    privateRentEstimate: deal.private_rent,
    insuranceEstimate: true,
    taxLabel: 'Listed tax / mo $',
  };
}

export function dailyBundle(id: string) {
  const deal = dailyDealById(id);
  if (!deal) return null;
  const where = coords(id, deal.slug);
  const photos = listingPhotos[id] ?? [];
  const low = lowConfidence.has(deal.slug);
  const cells: Record<string, string> = {
    id,
    site_eligibility: 'ELIGIBLE_ACTIVE',
    listing_status: 'ACTIVE',
    address_raw: deal.addr,
    address_normalized: deal.addr,
    city: deal.city,
    mls: deal.mls,
    latitude: String(where.lat),
    longitude: String(where.lon),
    purchase_list_price: String(deal.price),
    status_source: `Active $${deal.price.toLocaleString('en-US')}`,
    sqft: String(deal.sqft),
    current_beds: String(deal.beds),
    current_baths: deal.baths,
    converted_beds: String(deal.rooms.length),
    converted_baths: String(deal.baths_n + deal.added_baths),
    photo_url: photos[0] ?? '',
    photo_gallery: photos.join('\n'),
    listing_url: deal.listing_url,
    clp_status: deal.clp_status,
    clp_note: deal.clp_note,
    clp_shared_conf: deal.shared_conf,
    clp_private_conf: deal.private_conf,
    clp_low: low ? 'yes' : '',
    plan_mode: planMode(id, deal.slug),
    cap_rate: deal.model.cap_rate_pct == null ? '' : String(deal.model.cap_rate_pct),
    rent_assumption: deal.model.rent_assumption,
    heuristic: deal.heuristic,
    common: deal.common,
    parking_note: deal.parking_note,
    risks: deal.risks.join('\n'),
  };
  const research: ResearchDeal = {
    id, address: deal.addr, city: deal.city,
    latitude: where.lat, longitude: where.lon,
    coordinateProvenance: where.note,
    displayPrice: deal.price, fiPrice: deal.price,
    rooms: deal.rooms.length, rowNumber: 0, cells,
  };
  const inputs = inputsFor(deal, roomsFor(deal, id));
  const analysis: AnalysisSeed = {
    inputs, modelOnly: true, estimates: deal.risks, modelAssumptions: [deal.model.rent_assumption, deal.clp_note].filter(Boolean),
    sourceUrl: deal.listing_url, sourceCashFlow: deal.model.cash_flow, sourceCoc: deal.model.coc_pct,
  };
  return {
    deal: researchPitchRow(research, undefined),
    research, overlayId: null, rentRoll: [], capex: [], callouts: [],
    analysis, sourceAnalysis: analysis, sheetUrl: deal.listing_url,
  };
}

export function dailyPayload() {
  const deals: ResearchDeal[] = [];
  const bundles: Record<string, NonNullable<ReturnType<typeof dailyBundle>>> = {};
  const analyses: Record<string, AnalysisSeed> = {};
  for (const deal of dailyDeals) {
    const id = siteIdForSlug(deal.slug);
    const bundle = dailyBundle(id);
    if (!bundle?.analysis) continue;
    deals.push(bundle.research);
    bundles[id] = bundle;
    analyses[id] = bundle.analysis;
  }
  return { deals, analyses, bundles };
}

export function dailyFigures(id: string) {
  const bundle = dailyBundle(id);
  if (!bundle?.analysis) return null;
  return { model: dailyDealById(id)?.model, result: calculateAnalysis(bundle.analysis.inputs), rooms: bundle.analysis.inputs.rooms.length };
}
