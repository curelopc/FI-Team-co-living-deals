import { expect, it } from 'vitest';
import { portalBundle } from '../lib/portal-bundles';
import { portalDeals } from '../lib/portal-catalog';
import { calculateAnalysis } from '../lib/underwriting';
import { modelSummary } from '../lib/deal-intake';
import { drawnRoomInventory } from '../lib/room-inventory';

const expected = [
  { id: 'topeka-4725', rooms: 11, private: 0, rent: 7370, cashFlow: 1135.53, invested: 179481.93, coc: 7.6 },
  { id: 'poppy-892', rooms: 13, private: 1, rent: 8870, cashFlow: 1378.06, invested: 262341.69, coc: 6.3 },
  { id: 'ventura-3582', rooms: 10, private: 1, rent: 6860, cashFlow: 974.16, invested: 191194.49, coc: 6.1 },
  { id: 'dawson-2418', rooms: 10, private: 1, rent: 6860, cashFlow: 857.73, invested: 204127.34, coc: 5.0 },
  { id: '21st-255', rooms: 10, private: 1, rent: 6860, cashFlow: 643.55, invested: 219055.7, coc: 3.5 },
  { id: 'eldorado-19299', rooms: 10, private: 1, rent: 6860, cashFlow: 458.16, invested: 194326.48, coc: 2.8 },
  { id: 'perry-5246', rooms: 12, private: 1, rent: 8200, cashFlow: 514.37, invested: 276884.06, coc: 2.2 },
  { id: 'rose-825', rooms: 12, private: 1, rent: 8200, cashFlow: 327.35, invested: 262036.1, coc: 1.5 },
  { id: 'yale-4585', rooms: 10, private: 2, rent: 7020, cashFlow: 250.27, invested: 220675.06, coc: 1.4 },
  { id: 'adams-12218', rooms: 10, private: 1, rent: 6860, cashFlow: -252.81, invested: 216448.42, coc: -1.4 },
];

it('adds all ten portal deals through the shared scenario', () => {
  expect(portalDeals).toHaveLength(10);
  for (const row of expected) {
    const bundle = portalBundle(row.id);
    const inputs = bundle?.analysis?.inputs;
    expect(inputs, row.id).toBeTruthy();
    if (!inputs || !bundle?.analysis) continue;
    const result = calculateAnalysis(inputs);
    const home = modelSummary(inputs, bundle.analysis.inputs);
    const inventory = drawnRoomInventory(row.id);
    expect(inventory).toHaveLength(row.rooms);
    expect(inputs.rooms).toHaveLength(row.rooms);
    expect(inputs.rooms.map(room => room.number)).toEqual(inventory?.map(room => room.number));
    expect(inputs.downPercent).toBe(20);
    expect(result.loan).toBeCloseTo((inputs.price ?? 0) * 0.8, 6);
    expect(inputs.rooms.filter(room => /private/i.test(room.bath)).every(room => room.rent === 830)).toBe(true);
    expect(inputs.rooms.filter(room => !/private/i.test(room.bath)).every(room => room.rent === 670)).toBe(true);
    expect(inputs.rooms.filter(room => room.rent === 830)).toHaveLength(row.private);
    expect(result.grossRent).toBe(row.rent);
    expect(home.grossRent).toBe(result.grossRent);
    expect(home.roomCount).toBe(row.rooms);
    expect(result.cashInvested).toBeCloseTo(row.invested, 2);
    expect(result.monthlyCashFlow).toBeCloseTo(row.cashFlow, 2);
    expect(result.cocPercent).toBeCloseTo(row.coc, 1);
    expect(home.cocPercent).toBe(result.cocPercent);
    expect(home.cashInvested).toBe(result.cashInvested);
    expect(result.missing).toEqual([]);
    expect(inputs.expenses.some(expense => /padsplit|padslpit/i.test(expense.name))).toBe(false);
    expect(inputs.holding).toBeGreaterThan(0);
    const cells = bundle?.research.cells;
    if (!cells) continue;
    expect(cells['site_eligibility']).toBe('ELIGIBLE_ACTIVE');
    if (row.id === 'dawson-2418') expect(cells['photo_url']).toBe('');
    else {
      expect(cells['photo_url']).toMatch(/^\/listing-photos\//);
      expect(cells['photo_gallery']?.split('\n')).toHaveLength(12);
    }
    expect(cells['sqft']).toBe(String(portalDeals.find(deal => deal.id === row.id)?.sqft));
  }
});
