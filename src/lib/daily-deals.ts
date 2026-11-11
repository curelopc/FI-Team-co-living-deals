import dailyRaw from './daily-2026-11-10.json';
import { layoutConceptRooms, type ConceptLayoutRoom } from './concept-layout';
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
  dscr: number | null; price_for_8pct_coc: number | null; price_for_12pct_coc: number | null;
  breakeven_price: number | null;
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
const newSlugs = new Set(['beth-216','oregon-12055','york-7751','crown-4860','ceylon-4317','perth-4965','pacific-17004','fillmore-12357','ouray-3404']);
const lowConfidence = new Set(['beth-216','21st-255','rose-825','poppy-892']);

const extraCoords: Record<string, { lat: number; lon: number; note: string }> = {
  'beth-216': { lat: 40.0820119, lon: -104.8017458, note: 'OpenStreetMap Nominatim address lookup, Nov 10, 2026' },
  'oregon-12055': { lat: 39.68671, lon: -104.8479936, note: 'OpenStreetMap Nominatim address lookup, Nov 10, 2026' },
  'york-7751': { lat: 39.837288691039, lon: -104.95923230826, note: 'US Census Geocoder Public_AR_Current address match for 7751 York Street, Denver, CO 80229, Nov 10, 2026' },
  'crown-4860': { lat: 39.7831589, lon: -104.8316214, note: 'OpenStreetMap Nominatim address lookup, Nov 10, 2026' },
  'ceylon-4317': { lat: 39.7746378, lon: -104.764494, note: 'OpenStreetMap Nominatim address lookup, Nov 10, 2026' },
  'perth-4965': { lat: 39.7844842, lon: -104.7360974, note: 'OpenStreetMap Nominatim address lookup, Nov 10, 2026' },
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

function planMode(id: string, slug: string): 'drawn' | 'concept' {
  if (id === '6' || id === '40') return 'drawn';
  return 'concept';
}

const taxYearBySlug: Record<string, number> = {
  'fraser-1584': 2024, 'elmira-911': 2025, 'topeka-4725': 2025, 'poppy-892': 2025, 'ventura-3582': 2025,
  'dawson-2418': 2025, '21st-255': 2025, 'eldorado-19299': 2025, 'perry-5246': 2025, 'rose-825': 2024,
  'yale-4585': 2025, 'adams-12218': 2025, 'beth-216': 2025, 'oregon-12055': 2025, 'york-7751': 2024,
  'crown-4860': 2025, 'ceylon-4317': 2025, 'perth-4965': 2025, 'pacific-17004': 2021,
  'fillmore-12357': 2025, 'ouray-3404': 2025,
};

export function conceptRoomsFor(id: string): ConceptLayoutRoom[] | null {
  const deal = dailyDealById(id);
  if (!deal || !newSlugs.has(deal.slug)) return null;
  return layoutConceptRooms(deal.rooms);
}

function handoffFlags(deal: DailyDeal): string[] {
  const year = taxYearBySlug[deal.slug];
  const flags = [
    'Assumptions, labeled as estimates: 20% down, 7.5% 30-year investor rate, 2% closing, and cash invested includes 2 months of holding. Insurance is set equal to property tax. Repairs and the capex reserve are each 5% of gross. Per room: electric $40.23, water $25, gas $15. Management is 16% of gross and vacancy is 5%.',
    'The public portal returns Active listings only, so a pending or under-contract status would not appear. No listing was marked Pending today.',
  ];
  if (year != null && year < 2025) flags.push(`Property tax is the portal ${year} figure. That year is older than 2025.`);
  if (year === 2026) flags.push('Property tax is the portal 2026 figure.');
  if (deal.slug === 'fraser-1584') {
    flags.push('Price reduced from $525,000 to $490,000 (portal alert 2026-11-09). This underwrite uses $490,000.');
    flags.push('Portal tax used here is the 2024 amount, $3,240. An earlier listing history showed 2025 tax of $3,553, and that figure is not used here.');
    flags.push('The existing concept drawing marks bedroom 3 as a primary-accessed ensuite. This underwrite counted 0 private-bath rooms, so every room uses the shared furnished rate.');
  }
  if (deal.slug === 'elmira-911') {
    flags.push('Finished area in this underwrite is 3,547 sq ft. The earlier site figure was 3,651 sq ft.');
    flags.push('The existing concept drawing marks bedroom 1 as a primary-accessed ensuite. This underwrite counted 0 private-bath rooms, so every room uses the shared furnished rate.');
  }
  if (deal.slug === 'topeka-4725') {
    flags.push('Price reduced from $499,900 to $494,900 on 2026-11-11 (official REcolorado alert, MLS 6110384, still Active). This underwrite uses $494,900. CoLivingPro rents were not re-pulled. Cash flow is $656.48/mo (was $628.51). CoC is 4.4% (was 4.2%). Cash invested is $177,931.05 (was $179,086.99). Cap rate is 8.3% (was 8.22%). DSCR is 1.24 (was 1.22). All-in is $565,298 (was $570,398). Price per finished sq ft is $143.60 (was $145.10).');
  }
  if (deal.city !== 'Denver' && deal.risks.some(risk => /Denver group-living/i.test(risk))) {
    flags.push(`One note mentions Denver group-living rules. This home is in ${deal.city}. Confirm ${deal.city} occupancy rules before relying on that sentence.`);
  }
  if (newSlugs.has(deal.slug)) {
    flags.push('Concept plan only. No measured floor plan was reviewed. Existing bedrooms and the living, dining, office, and nook rooms are drawn on the main floor. The family room and lower rec split A, which the handoff marked for a new window, are drawn in the basement so plain W stays off the upper floor. Egress is not verified. Basement finish cost is not included.');
  }
  if (lowConfidence.has(deal.slug)) flags.push('CoLivingPro confidence is on the low side for this address. Treat the rent as an estimate.');
  return flags;
}

function describeConcept(room: ConceptLayoutRoom): string {
  const conversion = room.work !== 'existing';
  return [
    conversion
      ? 'Concept conversion: straight wall and a door gap to common space. No bedroom pass-through.'
      : 'Existing bedroom. Door to common space. No bedroom pass-through.',
    conversion ? 'Closet C.' : '',
    room.window ? 'Plain W for a basement new or egress window. Egress is not verified.' : '',
    /private|ensuite/i.test(room.bath) ? 'Private bath.' : 'Shared bath.',
    room.space,
    room.rent_basis,
  ].filter(Boolean).join(' ');
}

function roomsFor(deal: DailyDeal, id: string): AnalysisRoom[] {
  const concept = newSlugs.has(deal.slug) ? layoutConceptRooms(deal.rooms) : null;
  const drawn = concept ? null : drawnRoomInventory(id);
  if (drawn && drawn.length === deal.rooms.length) {
    return drawn.map((room, index) => {
      const source = deal.rooms[index];
      const rent = source?.rent ?? null;
      return { ...room, rent, evidence: evidenceWithRent([room.evidence, source?.rent_basis].filter(Boolean).join(' '), rent) };
    });
  }
  const sourceRooms = concept ?? deal.rooms.map(room => ({ ...room, level: room.level || 'Unverified', window: false, closet: false, rent_basis: room.rent_basis }));
  return sourceRooms.map((room, index) => ({
    number: index + 1,
    drawn: true,
    name: `Bedroom ${index + 1}`,
    level: room.level || 'Unverified',
    bath: /private|ensuite/i.test(room.bath) ? 'Private bath (concept)' : 'Hall/shared',
    rent: room.rent,
    evidence: evidenceWithRent(concept ? describeConcept(room as ConceptLayoutRoom) : [room.space, room.rent_basis].filter(Boolean).join('. '), room.rent),
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
    flags: handoffFlags(deal).join('\n'),
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
    inputs, modelOnly: true, estimates: deal.risks, modelAssumptions: handoffFlags(deal),
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

export function publishedMetrics(id: string) {
  const deal = dailyDealById(id);
  const closing = deal?.model.closing;
  const reno = deal?.model.reno;
  if (!deal?.sqft || closing == null || reno == null) return null;
  return {
    pricePerSqft: Math.round((deal.price / deal.sqft) * 10) / 10,
    allIn: deal.price + closing + reno,
    dscr: deal.model.dscr,
    capRate: deal.model.cap_rate_pct,
    priceFor8: deal.model.price_for_8pct_coc,
    priceFor12: deal.model.price_for_12pct_coc,
    priceForCashFlowZero: deal.model.breakeven_price,
  };
}

export function dailyFigures(id: string) {
  const bundle = dailyBundle(id);
  if (!bundle?.analysis) return null;
  return { model: dailyDealById(id)?.model, result: calculateAnalysis(bundle.analysis.inputs), rooms: bundle.analysis.inputs.rooms.length };
}
