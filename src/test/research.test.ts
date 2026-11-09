import { describe, expect, it } from 'vitest';
import { parseResearch, filterResearch, monthlyPayment, calculateAnalysis, seedAnalysis, normalizeAddress, researchPitchRow, safeExternalUrl } from '../lib/research';

describe('Research eligibility and prices', () => {
  const headers = ['id', 'site_eligibility', 'latitude', 'longitude', 'purchase_list_price', 'status_source', 'converted_beds', 'city', 'listing_status'];
  it('admits only exact ELIGIBLE_ACTIVE rows with numeric coordinates, never sold', () => {
    const rows = parseResearch([headers,
      ['6', 'ELIGIBLE_ACTIVE', '39.6874845', '-104.8113616', '540000', 'Active $525,000. FI Team $540,000', '8', 'Aurora', 'ACTIVE'],
      ['8', 'ELIGIBLE_ACTIVE', '39.7293323', '-105.026508', '565000', 'Active $534,999.', '7', 'Denver', 'ACTIVE'],
      ['3', 'HOLD_STATUS_UNKNOWN', '39', '-104'], ['5', 'ELIGIBLE_ACTIVE', 'UNKNOWN', '-104'],
      ['9', 'ELIGIBLE_ACTIVE', '39', '-104', '', '', '', '', 'SOLD'], ['10', 'eligible_active', '39', '-104']]);
    expect(rows.map(r => r.id)).toEqual(['6', '8']);
    expect(rows[0]?.displayPrice).toBe(525000); expect(rows[1]?.displayPrice).toBe(534999);
    expect(rows[0]?.fiPrice).toBe(540000);
    expect(filterResearch(rows, { city: 'Aurora', priceMax: 530000, priceMin: 500000, minRooms: 8 }).map(r => r.id)).toEqual(['6']);
    expect(filterResearch(rows, { city: '', priceMax: 500000, priceMin: null, minRooms: null })).toHaveLength(0);
  });
  it('falls back to purchase list and reads moved headers', () => {
    expect(parseResearch([['longitude', 'id', 'purchase_list_price', 'latitude', 'site_eligibility'], ['-104', '6', '540000', '39', 'ELIGIBLE_ACTIVE']])[0]?.displayPrice).toBe(540000);
  });
});

describe('session model math', () => {
  const fraser = { converted_beds: '8', coliving_pro_rent_per_room: '770', coliving_pro_util_fee: '80', coliving_pro_total_per_room: '850' };
  const grove = { converted_beds: '7', coliving_pro_rent_per_room: '830', coliving_pro_util_fee: '80', coliving_pro_total_per_room: '910' };
  it('uses 30-year amortization at 7.24%', () => {
    expect(monthlyPayment(7.24, 360, 420000)).toBeCloseTo(2862.292182, 4);
    expect(monthlyPayment(0, 360, 420000)).toBeCloseTo(1166.666667, 4);
  });
  it('seeds Fraser live rent but refuses invented financing and expenses', () => {
    const seed = seedAnalysis({ Price: '525000' }, [], [], fraser);
    expect(seed.inputs.rooms).toHaveLength(8);
    expect(seed.inputs.rooms.every(r => r.rent === 770)).toBe(true);
    expect(seed.inputs.managementPercent).toBe(16);
    expect(seed.inputs.utilities).toBeNull();
    expect(seed.inputs.downPercent).toBeNull();
    expect(seed.inputs.rate).toBeNull();
    expect(seed.inputs.closingCosts).toBeNull();
    expect(calculateAnalysis(seed.inputs).monthlyCashFlow).toBeNull();
    expect(calculateAnalysis(seed.inputs).cashInvested).toBeNull();
  });
  it('seeds Grove 7 rooms at 830 and 80 utilities each', () => {
    const seed = seedAnalysis({ Price: '534999' }, [], [], grove);
    expect(seed.inputs.rooms).toHaveLength(7); expect(seed.inputs.rooms.every(r => r.rent === 830)).toBe(true);
    expect(seed.inputs.utilities).toBeNull(); expect(calculateAnalysis(seed.inputs).grossRent).toBe(5810);
  });
  it('prefers sheet rooms and CapEx; edits line items update cash invested and CoC', () => {
    const seed = seedAnalysis({ Price: '525000', 'Down Payment': '105000', 'Closing Costs': '10000', 'Holding Costs': '0', 'Invoice Authorization': '0' }, [{ rowNumber: 2, cells: { Room: 'A', 'Rent/mo': '900' } }], [{ rowNumber: 2, cells: { Item: 'Reno', Cost: '25000' } }], fraser);
    expect(seed.modelOnly).toBe(false); expect(seed.inputs.rooms[0]?.rent).toBe(900);
    expect(seed.inputs.rooms).toHaveLength(1);
    expect(calculateAnalysis(seed.inputs).capexTotal).toBe(25000);
    const changed = structuredClone(seed.inputs); changed.capex[0] = { name: 'Reno', cost: 30000 };
    expect(calculateAnalysis(changed).cashInvested).toBe(145000);
    const zero = { ...seed.inputs, downPercent: 0, closingCosts: 0, capex: [], reno: 0 };
    expect(calculateAnalysis(zero).cocPercent).toBeNull();
  });
  it('uses changed live headers for any eligible ID, even when columns move', () => {
    const row = parseResearch([
      ['coliving_pro_util_fee', 'longitude', 'converted_beds', 'id', 'coliving_pro_total_per_room', 'site_eligibility', 'coliving_pro_rent_per_room', 'latitude'],
      ['95', '-104', '4', 'new-id', '1020', 'ELIGIBLE_ACTIVE', '925', '39'],
    ])[0];
    if (!row) throw new Error('Expected eligible row');
    const seed = seedAnalysis(researchPitchRow(row, undefined).cells, [], [], row.cells);
    expect(seed.inputs.rooms).toHaveLength(4);
    expect(seed.inputs.rooms.map(room => room.rent)).toEqual([925, 925, 925, 925]);
    expect(seed.inputs.utilities).toBeNull();
    expect(calculateAnalysis(seed.inputs).grossRent).toBe(3700);
  });
  it('never substitutes combined charges for missing rent or utility fields', () => {
    const seed = seedAnalysis({ Price: '525000' }, [], [], { converted_beds: '8', coliving_pro_rent_per_room: 'unknown', coliving_pro_util_fee: '', coliving_pro_total_per_room: '850' });
    expect(seed.inputs.rooms.map(room => room.rent)).toEqual(Array(8).fill(null));
    expect(seed.inputs.utilities).toBeNull();
    expect(calculateAnalysis(seed.inputs).grossRent).toBeNull();
  });
  it.each(['', 'unknown', '-1', '2.5'])('does not invent a room count for %s', converted_beds => {
    const seed = seedAnalysis({}, [], [], { ...fraser, converted_beds });
    expect(seed.inputs.rooms).toHaveLength(0);
    expect(seed.inputs.utilities).toBeNull();
  });
  it('keeps an explicit live zero instead of substituting rent assumptions', () => {
    const seed = seedAnalysis({}, [], [], { ...fraser, coliving_pro_rent_per_room: '0', coliving_pro_util_fee: '0' });
    expect(seed.inputs.rooms).toHaveLength(8);
    expect(seed.inputs.rooms.every(room => room.rent === 0)).toBe(true);
    expect(seed.inputs.utilities).toBeNull();
  });
});

it('matches normalized street addresses, not city or different streets', () => {
  expect(normalizeAddress('6704 Grove St., Denver, CO')).toBe(normalizeAddress('6704 Grove Street, Denver'));
  expect(normalizeAddress('1584 Fraser Way, Aurora')).not.toBe(normalizeAddress('1584 Grove Street, Denver'));
});
it('never invents plans for a Research pitch, and blocks thefiteam links', () => {
  const r = parseResearch([['id', 'site_eligibility', 'latitude', 'longitude', 'purchase_list_price'], ['6', 'ELIGIBLE_ACTIVE', '39', '-104', '540000']])[0];
  if (!r) throw new Error('Expected eligible deal');
  expect(researchPitchRow(r, undefined).cells['Floorplan Main']).toBeUndefined();
  expect(safeExternalUrl('https://thefiteam.com/analysis')).toBe('');
  expect(safeExternalUrl('javascript:alert(1)')).toBe('');
});

it('maps all five Research image/parking headers even when columns move', () => {
  const images = {
    'Floorplan Main': 'https://drive.google.com/file/d/1ResearchMain123/view',
    'Floorplan Basement': 'https://drive.google.com/file/d/1ResearchBasement123/view',
    'Parking Map': 'https://drive.google.com/file/d/1ResearchParking123/view',
    'Parking Spots': '4', 'Parking Note': 'Alley access',
  };
  const row = parseResearch([
    ['Parking Note', 'longitude', 'Floorplan Basement', 'id', 'Parking Spots', 'site_eligibility', 'Parking Map', 'latitude', 'Floorplan Main'],
    [images['Parking Note'], '-104', images['Floorplan Basement'], '6', '4', 'ELIGIBLE_ACTIVE', images['Parking Map'], '39', images['Floorplan Main']],
  ])[0];
  if (!row) throw new Error('Expected eligible Research row');
  const pitch = researchPitchRow(row, undefined);
  for (const [header, value] of Object.entries(images)) expect(pitch.cells[header]).toBe(value);
  const overlay = researchPitchRow(row, { rowNumber: 2, cells: { 'Floorplan Main': 'denser-main', 'Parking Spots': '5' } });
  expect(overlay.cells['Floorplan Main']).toBe('denser-main');
  expect(overlay.cells['Parking Spots']).toBe('5');
});
