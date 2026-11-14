import dailyRaw from './daily-2026-11-10.json';
import { layoutConceptRooms, type ConceptLayoutRoom } from './concept-layout';
import { listingPhotos } from './listing-photos';
import { locationEvidence } from './location-evidence';
import { portalDeal } from './portal-catalog';
import { drawnRoomInventory } from './room-inventory';
import { evidenceWithRent } from './room-rent-text';
import { researchPitchRow, type ResearchDeal } from './research';
import { calculateAnalysis, type AnalysisInputs, type AnalysisRoom, type AnalysisSeed } from './underwriting';

type DailyRoom = { level: string; space: string; work: string; bath: string; rent: number | null; rent_basis: string; window?: boolean };
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
const nov11Slugs = ['beth-216','oregon-12055','york-7751','crown-4860','ceylon-4317','perth-4965','pacific-17004','fillmore-12357','ouray-3404'];
const nov12Slugs = ['w96th-565','clarkson-7911','kalispell-1157','del-mar-179','zuni-2807','lakeview-6974','waco-3668','ammons-1805','radcliffe-8901'];
const nov13Slugs = ['16th-avdr-120','mineral-1522','99th-17066','green-meadows-5901','52nd-6799','52nd-6641','canosa-6896','93rd-20076','26th-14606','67th-1652'];
const nov14Slugs = ['cherrywood-1288','elmira-15780','zephyr-8238','chaparral-7928','lomand-16065','35th-24376','oak-3119','akron-3413','meade-9801','zang-6015'];
const newSlugs = new Set([...nov11Slugs, ...nov12Slugs, ...nov13Slugs, ...nov14Slugs]);
const pendingSlugs = new Set(['oregon-12055', 'ouray-3404']);
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
  'w96th-565': { lat: 39.870748489656, lon: -104.994303197592, note: 'US Census Geocoder Public_AR_Current address match for 565 W 96th Avenue, Thornton, CO 80260, Nov 12, 2026' },
  'clarkson-7911': { lat: 39.840328229142, lon: -104.976813880257, note: 'US Census Geocoder Public_AR_Current address match for 7911 Clarkson Court, Denver, CO 80229, Nov 12, 2026' },
  'kalispell-1157': { lat: 39.695290634338, lon: -104.802006368696, note: 'US Census Geocoder Public_AR_Current address match for 1157 S Kalispell Way, Aurora, CO 80017, Nov 12, 2026' },
  'del-mar-179': { lat: 39.722555056685, lon: -104.845538967866, note: 'US Census Geocoder Public_AR_Current address match for 179 Del Mar Circle, Aurora, CO 80011, Nov 12, 2026' },
  'zuni-2807': { lat: 39.665212280151, lon: -105.01582786548, note: 'US Census Geocoder Public_AR_Current address match for 2807 S Zuni Street, Denver, CO 80236, Nov 12, 2026' },
  'lakeview-6974': { lat: 39.592608526635, lon: -104.998792866338, note: 'US Census Geocoder Public_AR_Current address match for 6974 S Lakeview Street, Littleton, CO 80120, Nov 12, 2026' },
  'waco-3668': { lat: 39.650536048432, lon: -104.777392399403, note: 'US Census Geocoder Public_AR_Current address match for 3668 S Waco Street, Aurora, CO 80013, Nov 12, 2026' },
  'ammons-1805': { lat: 39.684150345127, lon: -105.087355928437, note: 'US Census Geocoder Public_AR_Current address match for 1805 S Ammons Street, Denver, CO 80232, Nov 12, 2026' },
  'radcliffe-8901': { lat: 39.636644845435, lon: -105.096856911577, note: 'US Census Geocoder Public_AR_Current address match for 8901 W Radcliffe Place, Littleton, CO 80123, Nov 12, 2026' },
  '16th-avdr-120': { lat: 39.985084881132, lon: -104.802569743214, note: 'US Census Geocoder Public_AR_Current address match for 120 S 16th Avenue, Brighton, CO 80601, Nov 13, 2026. The portal street name 120 S 16th Avdr Drive did not match, so this pin is the Avenue match and the parcel is not verified.' },
  'mineral-1522': { lat: 39.572947033353, lon: -104.971108271257, note: 'US Census Geocoder Public_AR_Current address match for 1522 E Mineral Place, Centennial, CO 80122, Nov 13, 2026' },
  '99th-17066': { lat: 39.877870865398, lon: -104.787390194071, note: 'US Census Geocoder Public_AR_Current address match for 17066 E 99th Place, Commerce City, CO 80022, Nov 13, 2026' },
  'green-meadows-5901': { lat: 39.677721959037, lon: -105.061135690582, note: 'US Census Geocoder Public_AR_Current address match for 5901 W Green Meadows Place, Denver, CO 80227, Nov 13, 2026' },
  '52nd-6799': { lat: 39.791117329099, lon: -105.072974398457, note: 'US Census Geocoder Public_AR_Current address match for 6799 W 52nd Avenue, Arvada, CO 80002, Nov 13, 2026' },
  '52nd-6641': { lat: 39.791126188843, lon: -105.071102049051, note: 'US Census Geocoder Public_AR_Current address match for 6641 W 52nd Avenue, Arvada, CO 80002, Nov 13, 2026' },
  'canosa-6896': { lat: 39.821719189521, lon: -105.020051699812, note: 'US Census Geocoder Public_AR_Current address match for 6896 Canosa Street, Denver, CO 80221, Nov 13, 2026' },
  '93rd-20076': { lat: 39.865509402547, lon: -105.226366658318, note: 'US Census Geocoder Public_AR_Current address match for 20076 W 93rd Avenue, Arvada, CO 80007, Nov 13, 2026' },
  '26th-14606': { lat: 39.755402369909, lon: -104.817892431833, note: 'US Census Geocoder Public_AR_Current address match for 14606 E 26th Place, Aurora, CO 80011, Nov 13, 2026' },
  '67th-1652': { lat: 39.817786467562, lon: -105.007233319488, note: 'Estimated pin on the Census Public_AR_Current address range between 1500 and 1700 W 67th Avenue, Denver, CO 80221, Nov 13, 2026. 1652 itself did not return an address match. Not a surveyed point.' },
  'cherrywood-1288': { lat: 39.997778451373, lon: -104.806686208575, note: 'US Census Geocoder Public_AR_Current address match for 1288 Cherrywood Drive, Brighton, CO 80601, Nov 14, 2026' },
  'elmira-15780': { lat: 39.982748804079, lon: -104.872512379834, note: 'US Census Geocoder Public_AR_Current address match for 15780 Elmira Street, Brighton, CO 80602, Nov 14, 2026' },
  'zephyr-8238': { lat: 39.846844926581, lon: -105.085437870316, note: 'US Census Geocoder Public_AR_Current address match for 8238 Zephyr Street, Arvada, CO 80005, Nov 14, 2026' },
  'chaparral-7928': { lat: 39.550344127202, lon: -104.896744607434, note: 'US Census Geocoder Public_AR_Current address match for 7928 Chaparral Road, Lone Tree, CO 80124, Nov 14, 2026' },
  'lomand-16065': { lat: 39.987294677981, lon: -104.878050942882, note: 'US Census Geocoder Public_AR_Current address match for 16065 Lomand Circle, Brighton, CO 80602, Nov 14, 2026' },
  '35th-24376': { lat: 39.7662543, lon: -104.7039025, note: 'Estimated pin on the OpenStreetMap East 35th Drive residential segment near longitude -104.704, Aurora, Nov 14, 2026. Census Public_AR_Current did not match 24376 E 35th Drive in 80019 or 80249. Not a surveyed point. The listing zip is 80019.' },
  'oak-3119': { lat: 39.932716102073, lon: -105.104534437537, note: 'US Census Geocoder Public_AR_Current address match for 3119 N Oak Circle, Broomfield, CO 80020, Nov 14, 2026' },
  'akron-3413': { lat: 39.654545128601, lon: -104.882341193039, note: 'US Census Geocoder Public_AR_Current address match for 3413 S Akron Street, Denver, CO 80231, Nov 14, 2026' },
  'meade-9801': { lat: 39.875017484479, lon: -105.03522137198, note: 'US Census Geocoder Public_AR_Current address match for 9801 Meade Circle, Westminster, CO 80031, Nov 14, 2026' },
  'zang-6015': { lat: 39.806119926924, lon: -105.144197871092, note: 'US Census Geocoder Public_AR_Current address match for 6015 Zang Way, Arvada, CO 80004, Nov 14, 2026' },
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
  'w96th-565': 2025, 'clarkson-7911': 2025, 'kalispell-1157': 2025, 'del-mar-179': 2025,
  'zuni-2807': 2025, 'lakeview-6974': 2025, 'waco-3668': 2025, 'ammons-1805': 2025,
  'radcliffe-8901': 2024,
  '16th-avdr-120': 2025, 'mineral-1522': 2025, '99th-17066': 2025, 'green-meadows-5901': 2025,
  '52nd-6799': 2025, '52nd-6641': 2025, 'canosa-6896': 2025, '93rd-20076': 2025,
  '26th-14606': 2025, '67th-1652': 2025,
  'cherrywood-1288': 2025, 'elmira-15780': 2025, 'zephyr-8238': 2025, 'chaparral-7928': 2025,
  'lomand-16065': 2025, '35th-24376': 2026, 'oak-3119': 2025, 'akron-3413': 2025,
  'meade-9801': 2025, 'zang-6015': 2025,
};

function dollars(amount: number | null, digits = 2): string {
  if (amount == null) return 'unavailable';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(amount);
}

function passSummary(deal: DailyDeal): string {
  const model = deal.model;
  const rentDigits = deal.shared_rent != null && Number.isInteger(deal.shared_rent) ? 0 : 2;
  return `Pass. CoLivingPro Shared ${dollars(deal.shared_rent, rentDigits)} plus $80 (confidence ${deal.shared_conf}). CoC ${model.coc_pct}%, cash flow ${dollars(model.cash_flow)}/mo, cash invested ${dollars(model.invested)}, cap ${model.cap_rate_pct}%, DSCR ${model.dscr}. A price near ${dollars(model.price_for_8pct_coc, 0)} would be needed for 8% CoC.`;
}

export function conceptRoomsFor(id: string): ConceptLayoutRoom[] | null {
  const deal = dailyDealById(id);
  if (!deal || !newSlugs.has(deal.slug)) return null;
  return layoutConceptRooms(deal.rooms);
}

function handoffFlags(deal: DailyDeal): string[] {
  const year = taxYearBySlug[deal.slug];
  const flags = [
    'Assumptions, labeled as estimates: 20% down, 7.5% 30-year investor rate, 2% closing, and cash invested includes 2 months of holding. Insurance is set equal to property tax. Repairs and the capex reserve are each 5% of gross. Per room: electric $40.23, water $25, gas $15. Management is 16% of gross and vacancy is 5%.',
    'The public portal returns Active listings only, so a listing missing from it is not proof it was withdrawn.',
    '2026-11-14 upkeep: no deal was removed. 255 S 21st Place is re-underwritten at $455,000. 12055 E Oregon Circle and 3404 S Ouray Way stay on the site as Pending, flagged UNCONFIRMED, Active Under Contract.',
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
  if (deal.slug === '21st-255') {
    flags.push('Price reduced from $475,000 to $455,000 (portal, 2026-11-14). This underwrite uses $455,000. CoLivingPro rents were not re-pulled (2026-11-10). Cash flow is $335.22/mo (was $223.34). CoC is 1.9% (was 1.2%). Cash invested is $214,036.55 (was $218,660.30). Cap rate is 7.6% (was 7.28%). DSCR is 1.13 (was 1.08).');
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
  if (deal.slug === 'rose-825') {
    flags.push('Price reduced from $724,900 to $699,900 on 2026-11-12 (REcolorado public portal card for MLS 7213931, still Active). No Gmail price-reduced alert was found. This underwrite uses $699,900. CoLivingPro rents were not re-pulled (2026-11-10). Cash flow is -$172.46/mo (was -$312.30). CoC is -0.8% (was -1.4%). Cash invested is $255,861.94 (was $261,641.62). Cap rate is 6.42% (was 6.2%). DSCR is 0.96 (was 0.92). All-in is $804,398 (was $829,898). Price per finished sq ft is $184.20 (was $190.80).');
  }
  if (nov12Slugs.includes(deal.slug) && deal.slug !== 'clarkson-7911') {
    flags.push('2026-11-12 handoff: the room-add plan is an unverified concept. No floor plan was reviewed. Egress windows are assumed for 1 of every 3 added rooms. Basement finish and baths were not assessed. Every concept room is a shared bath, so each room uses the CoLivingPro shared furnished rate plus the $80 utility fee. Parking shows the MLS garage count as observed. Driveway and street counts were not found and are not used to remove the deal. The listing photo is the portal cover saved in this repo.');
  }
  if (deal.slug === 'w96th-565') {
    flags.push('Previously kept off the site on 2026-11-11 because there was no verified conversion plan. Published 2026-11-12 as an unverified concept: 5 existing bedrooms plus 5 assumed conversions. CoLivingPro Shared $700 plus $80 was pulled 2026-11-11 (confidence 90%) and was not re-pulled. A same-morning note that the estimator was logged out is not the rent used here, and no default rent was substituted. Estate auction / AS-IS: terms, reserve, and buyer premium were not found, so $736,000 may not be the price paid. The 5-existing-bedroom-only case was Pass at -16.7% CoC. Pass at -2.3% CoC on this 10-room concept, about $427/mo, cash invested $221,278.22, cap 6.02%, DSCR 0.90. About $976/room or a price near $470,000 would be needed for 8% CoC.');
  }
  if (deal.slug === 'clarkson-7911') {
    flags.push('2026-11-13 re-underwrite: the room plan is an unverified concept. No floor plan was reviewed. The listing already has 7 bedrooms. This concept draws 11 rooms (one private ensuite and ten shared rooms), not the earlier 10-room all-shared plan. The private ensuite uses the CoLivingPro private furnished rate. The other rooms use the shared furnished rate plus the $80 utility fee. Parking shows the MLS garage count as observed. Driveway and street counts were not found and are not used to remove the deal. The listing photo is the portal cover saved in this repo.');
    flags.push('Pass. CoLivingPro Shared $720 plus $80 (confidence 89%) and Private $880 plus $80 (confidence 85%). CoC 4.6%, cash flow $780.80/mo, cash invested $205,321.19, cap 8.3%, DSCR 1.24. About $812/room or a price near $508,000 would be needed for 8% CoC.');
  }
  if (deal.slug === 'kalispell-1157') {
    flags.push('Pass. CoLivingPro Shared $670 plus $80 (confidence 91%). CoC 0.7%, cash flow $99.88/mo, cash invested $178,868.24, cap 6.93%, DSCR 1.03. About $828/room or a price near $398,000 would be needed for 8% CoC.');
  }
  if (deal.slug === 'del-mar-179') {
    flags.push('Pass. CoLivingPro Shared $660 plus $80 (confidence 91%). CoC -1.4%, cash flow -$220.09/mo, cash invested $188,192.18, cap 6.26%, DSCR 0.93. About $874/room or a price near $384,000 would be needed for 8% CoC.');
  }
  if (deal.slug === 'zuni-2807') {
    flags.push('Pass. CoLivingPro Shared $710 plus $80 (confidence 87%). CoC 1.1%, cash flow $178.43/mo, cash invested $190,175.13, cap 7.07%, DSCR 1.05. About $868/room or a price near $448,000 would be needed for 8% CoC.');
  }
  if (deal.slug === 'lakeview-6974') {
    flags.push('The listing has 3 bedrooms, so this concept adds 7 rooms. Pass. CoLivingPro Shared $680 plus $80 (confidence 83%). CoC -1.3%, cash flow -$222.96/mo, cash invested $199,373.91, cap 6.26%, DSCR 0.93. About $905/room or a price near $368,000 would be needed for 8% CoC.');
  }
  if (deal.slug === 'waco-3668') {
    flags.push('Pass. CoLivingPro Shared $640 plus $80 (confidence 87%). CoC -2.0%, cash flow -$329.84/mo, cash invested $202,713.69, cap 6.07%, DSCR 0.90. About $884/room or a price near $385,000 would be needed for 8% CoC.');
  }
  if (deal.slug === 'ammons-1805') {
    flags.push("CoLivingPro matched '1805 South Ammons Street, Lakewood, CO' while the listing says Denver 80232. Rent was kept and the city is not verified. 80232 straddles Denver and Lakewood mailing addresses. Likely the same parcel; confirm before treating the rent as verified. This is the home from the underwriting video; this plan is the generic concept, not that video analysis. The listing already has 7 bedrooms, so this concept adds 3 rooms (living, dining, and family). Pass. CoLivingPro Shared $720 plus $80 (confidence 89%). CoC 0.1%, cash flow $20.69/mo, cash invested $190,438.62, cap 6.75%, DSCR 1.01. About $901/room or a price near $461,000 would be needed for 8% CoC.");
  }
  if (deal.slug === 'radcliffe-8901') {
    flags.push('Pass. CoLivingPro Shared $710 plus $80 (confidence 87%). CoC 0.4%, cash flow $71.62/mo, cash invested $201,776.75, cap 6.85%, DSCR 1.02. About $895/room or a price near $437,000 would be needed for 8% CoC.');
  }
  if (deal.slug === 'oregon-12055') {
    flags.push('Pending, flagged UNCONFIRMED. Active Under Contract. Missing from the Active portal for a second day. Accession Real Estate, Feaster Realty, and Gellman Homes syndication show Active Under Contract at $540,000. Accession property history shows a status change on 11/12/2026. Coldwell Banker still says Active. No Gmail alert. Open house still advertised Sat 11/14.');
  }
  if (deal.slug === 'ouray-3404') {
    flags.push('Pending, flagged UNCONFIRMED. Active Under Contract. Missing from the Active portal for a second day. Kenna Group syndication shows Active Under Contract at $535,000, with a status change dated 11/12/2026. Redfin, Compass, Jefferson RE, and Coldwell Banker still show stale Active. No Gmail alert.');
  }
  if (nov13Slugs.includes(deal.slug)) {
    flags.push('2026-11-13 handoff: the room-add plan is an unverified heuristic concept. No floor plan was reviewed. Egress windows are assumed for 1 of every 3 added rooms. Basement finish and baths were not assessed. Every concept room is a shared bath, so each room uses the CoLivingPro shared furnished rate plus the $80 utility fee. Parking shows the MLS garage count as observed. Driveway and street counts were not found and are not used to remove the deal. The parking-spots-per-room rule is suspended. Not found: floor plans, satellite parking, Remine land values, calculator copies, and callouts. The listing photo is the portal cover saved in this repo.');
    flags.push(passSummary(deal));
  }
  if (deal.slug === '16th-avdr-120') {
    flags.push('The portal address reads 120 S 16th Avdr Drive. CoLivingPro matched 120 South 16th Avenue, Brighton. Assumed the same parcel, not verified.');
  }
  if (deal.slug === 'green-meadows-5901') {
    flags.push('Finished area is 2,843 sq ft, so this concept is 9 rooms.');
  }
  if (deal.slug === '67th-1652') {
    flags.push('The map pin is estimated along the Census address range between 1500 and 1700 W 67th Avenue. 1652 itself did not return an address match.');
  }
  if (nov14Slugs.includes(deal.slug)) {
    flags.push('2026-11-14 handoff: room counts are an assumption, an unverified heuristic concept (about 10 beds per 3,000 sq ft). No floor plan was reviewed, so the 2026-11-13 floor-plan sizing rule is not applied yet. Egress windows are an assumption for the basement rooms marked with a plain W. Basement finish and baths were not assessed. Every concept room is shared (no ensuite was identified), so each room uses the CoLivingPro shared furnished rate plus the $80 utility fee. Model confidence was not in the rents file. Parking shows the MLS garage count as observed. Driveway and street counts were not found. The parking-spots-per-room rule is suspended. Not found: floor plans, satellite parking, Remine land values, calculator copies, and callouts. The listing photo is the portal cover saved in this repo.');
    flags.push(passSummary(deal));
  }
  if (deal.slug === 'cherrywood-1288') {
    flags.push('Finished area is 2,664 sq ft, so this concept is 9 rooms.');
  }
  if (deal.slug === 'elmira-15780') {
    flags.push('This listing is 15780 Elmira Street, deal DEN-20261114-02. An older sheet row DEN-20261104-05 is a separate sheet-only record and is not this listing.');
  }
  if (deal.slug === '35th-24376') {
    flags.push('The map pin is estimated on the East 35th Drive street segment. 24376 itself did not return a Census address match.');
  }
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
      name, amount, evidence: `${nov14Slugs.includes(deal.slug) ? '2026-11-14' : deal.slug === 'clarkson-7911' ? '2026-11-13' : nov13Slugs.includes(deal.slug) ? '2026-11-13' : nov12Slugs.includes(deal.slug) ? '2026-11-12' : '2026-11-10'} deal model. Estimate, not a quote.`,
    })),
    tenantUtilityFee: deal.clp_status === 'ok' || deal.clp_status === 'ok_flagged' ? 80 : null,
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
    listing_status: pendingSlugs.has(deal.slug) ? 'PENDING' : 'ACTIVE',
    address_raw: deal.addr,
    address_normalized: deal.addr,
    city: deal.city,
    mls: deal.mls,
    latitude: String(where.lat),
    longitude: String(where.lon),
    purchase_list_price: String(deal.price),
    status_source: pendingSlugs.has(deal.slug) ? `Pending (unconfirmed) $${deal.price.toLocaleString('en-US')}` : `Active $${deal.price.toLocaleString('en-US')}`,
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
