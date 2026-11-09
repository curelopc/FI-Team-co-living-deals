import { parseNumber, type DealRow, type TabRow } from './deals';
import { locationEvidence } from './location-evidence';

export const RESEARCH_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1OHPhVzGSBeGOkc-IStZyTzJoXeZL1c6DdnVR_h-M7VA/edit';
export const ANALYST_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1GtUJW18nNs3na6Ebq-kJBU-RUfcIc1c6UHI5iAIcgAU/edit#gid=0';

export function safeExternalUrl(raw: string | undefined): string {
  try {
    const url = new URL(raw ?? '');
    if (!['http:', 'https:'].includes(url.protocol) || /(^|\.)thefiteam\.com$/i.test(url.hostname)) return '';
    return url.href;
  } catch { return ''; }
}

export interface ResearchDeal extends DealRow {
  id: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  coordinateProvenance?: string | undefined;
  displayPrice: number | null;
  fiPrice: number | null;
  rooms: number | null;
}

export function listingFacts(cells: Record<string,string>, futureBedrooms: number) {
  const count = (raw: string | undefined) => { const match=raw?.match(/\d+(?:\.\d+)?/); return match?Number(match[0]):null; };
  const currentBaths=count(cells['current_baths']);
  return {sqft:parseNumber(cells['sqft']),currentBeds:count(cells['current_beds']),currentBaths,futureBeds:futureBedrooms,futureBaths:count(cells['converted_baths']) ?? currentBaths};
}

/** Research id strings are the route keys for /deal/$dealId, not analyst Deal IDs. */
export function parseResearch(values: string[][]): ResearchDeal[] {
  const headers = (values[0] ?? []).map(h => h.trim());
  return values.slice(1).flatMap((row, i) => {
    const cells = Object.fromEntries(headers.map((h, j) => [h, String(row[j] ?? '').trim()]));
    if (cells['site_eligibility'] !== 'ELIGIBLE_ACTIVE' || !cells['id']) return [];
    if (cells['listing_status']?.toUpperCase() === 'SOLD' || cells['sold_date']) return [];
    const latitude = parseNumber(cells['latitude']);
    const longitude = parseNumber(cells['longitude']);
    if (latitude == null || longitude == null || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return [];
    const fiPrice = parseNumber(cells['purchase_list_price']);
    // Only parse the Active clause, never a later historical FI Team price.
    const activeClause = cells['status_source']?.match(/\bactive\b[^.]*?(\$[\d,]+(?:\.\d+)?)/i);
    return [{ id: cells['id'], address: cells['address_normalized'] || cells['address_raw'] || '', city: cells['city'] || '',
      latitude: locationEvidence[cells['id']]?.latitude ?? latitude, longitude: locationEvidence[cells['id']]?.longitude ?? longitude,
      ...(locationEvidence[cells['id']] ? {coordinateProvenance:locationEvidence[cells['id']]?.provenance} : {}),
      displayPrice: parseNumber(activeClause?.[1]) ?? fiPrice, fiPrice,
      rooms: parseNumber(cells['converted_beds']), rowNumber: i + 2, cells }];
  });
}

export function filterResearch(deals: ResearchDeal[], filters: { priceMin: number | null; priceMax: number | null; minRooms: number | null; city: string }): ResearchDeal[] {
  return deals.filter(d => (!filters.city || d.city === filters.city)
    && (filters.priceMin == null || (d.displayPrice != null && d.displayPrice >= filters.priceMin))
    && (filters.priceMax == null || (d.displayPrice != null && d.displayPrice <= filters.priceMax))
    && (filters.minRooms == null || (d.rooms != null && d.rooms >= filters.minRooms)));
}

/** Compare street number/name, ignoring city, punctuation and standard suffix abbreviations. */
export function normalizeAddress(raw: string): string {
  const street = raw.split(',')[0] ?? '';
  const aliases: Record<string, string> = { st: 'street', rd: 'road', ave: 'avenue', ct: 'court', dr: 'drive', ln: 'lane', blvd: 'boulevard', pl: 'place', s: 'south', n: 'north', e: 'east', w: 'west' };
  return street.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().split(/\s+/).map(w => aliases[w] ?? w).join(' ');
}

export function researchPitchRow(research: ResearchDeal, overlay: DealRow | undefined): DealRow {
  const r = research.cells;
  const cells: Record<string, string> = { 'Deal ID': research.id, Address: research.address,
    Price: research.displayPrice == null ? '' : String(research.displayPrice),
    'Post-Conversion Rooms': r['converted_beds'] ?? '', 'Current Rooms': r['current_beds'] ?? '',
    Baths: r['converted_baths'] || r['current_baths'] || '', 'Date Found': r['status_checked_date'] ?? '',
    'Listing URL': safeExternalUrl(r['listing_url']), 'Detail Link': safeExternalUrl(r['property_report_url']) };
  for (const header of ['Floorplan Main', 'Floorplan Basement', 'Parking Map', 'Parking Spots', 'Parking Note']) {
    if (header in r) cells[header] = r[header] ?? '';
  }
  if (overlay) Object.assign(cells, overlay.cells);
  // Acquisition identity and current asking price always come from Research.
  Object.assign(cells, { 'Deal ID': research.id, Address: research.address, Price: research.displayPrice == null ? '' : String(research.displayPrice),
    'Listing URL': safeExternalUrl(r['listing_url']), 'Detail Link': safeExternalUrl(overlay?.cells['Detail Link'] || r['property_report_url']) });
  return { cells, rowNumber: research.rowNumber };
}

export { seedAnalysis, monthlyPayment, calculateAnalysis } from './underwriting';
export type { AnalysisRoom, AnalysisCapex, AnalysisInputs, AnalysisSeed } from './underwriting';
