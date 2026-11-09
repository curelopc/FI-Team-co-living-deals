import { portalCapex } from './portal-rooms';
import { portalDeal, portalDeals, type PortalDeal } from './portal-catalog';
import { researchPitchRow, type ResearchDeal } from './research';
import { seedAnalysis } from './underwriting';
import { standardScenario } from './standard-scenario';

export function portalResearch(deal: PortalDeal): ResearchDeal {
  const cells: Record<string, string> = {
    id: deal.id,
    site_eligibility: 'ELIGIBLE_ACTIVE',
    listing_status: 'ACTIVE',
    address_raw: deal.address,
    address_normalized: deal.address,
    city: deal.city,
    latitude: String(deal.latitude),
    longitude: String(deal.longitude),
    purchase_list_price: String(deal.price),
    status_source: `Active $${deal.price.toLocaleString('en-US')}`,
    sqft: String(deal.sqft),
    current_beds: String(deal.beds),
    current_baths: deal.bathsLabel,
    converted_beds: String(deal.rooms.length),
    converted_baths: String(deal.baths + deal.addedBaths),
    photo_url: deal.photoUrl,
    listing_url: deal.listingUrl,
    shared_rent_estimate: '670',
    private_rent_estimate: '830',
  };
  return {
    id: deal.id,
    address: deal.address,
    city: deal.city,
    latitude: deal.latitude,
    longitude: deal.longitude,
    coordinateProvenance: 'OpenStreetMap Nominatim address lookup, Nov 9, 2026',
    displayPrice: deal.price,
    fiPrice: deal.price,
    rooms: deal.rooms.length,
    rowNumber: 0,
    cells,
  };
}

export function portalBundle(id: string) {
  const deal = portalDeal(id);
  if (!deal) return null;
  const research = portalResearch(deal);
  const capexRows = portalCapex(deal).map((item, index) => ({
    rowNumber: index + 2,
    cells: { Item: item.name, Cost: String(item.cost) },
  }));
  const sourceAnalysis = seedAnalysis({ Price: String(deal.price) }, [], capexRows, research.cells);
  const analysis = standardScenario(sourceAnalysis, research.cells);
  return {
    deal: researchPitchRow(research, undefined),
    research,
    overlayId: null,
    rentRoll: [],
    capex: capexRows,
    callouts: [],
    analysis,
    sourceAnalysis,
    sheetUrl: deal.listingUrl,
  };
}

export function mergePortalDeals<T extends { deals: ResearchDeal[]; analyses: Record<string, unknown>; bundles: Record<string, unknown> }>(payload: T): T {
  const deals = [...payload.deals];
  const bundles = { ...payload.bundles };
  const analyses = { ...payload.analyses };
  for (const deal of portalDeals) {
    if (bundles[deal.id]) continue;
    const bundle = portalBundle(deal.id);
    if (!bundle) continue;
    deals.push(bundle.research);
    bundles[deal.id] = bundle;
    analyses[deal.id] = bundle.analysis;
  }
  return { ...payload, deals, bundles, analyses };
}
