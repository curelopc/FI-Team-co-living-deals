import { describe, expect, it, vi } from 'vitest';

// Execute handlers without an RPC transport or any visitor session. Reintroducing
// auth middleware must fail here instead of silently bypassing it in the test.
vi.mock('@tanstack/react-start', () => ({
  createServerFn: ({ method }: { method: string }) => {
    if (method !== 'GET') throw new Error('Sheet access must remain GET-only');
    const builder = {
      middleware: () => { throw new Error('Preview reads must not require visitor auth'); },
      inputValidator: () => builder,
      handler: (handler: (input: { data?: { id: string } }) => unknown) =>
        (input: { data?: { id: string } } = {}) => handler(input),
    };
    return builder;
  },
}));
vi.mock('../lib/sheets.server', () => ({
  readResearchDealList: async () => [
    ['id', 'site_eligibility', 'latitude', 'longitude', 'converted_beds', 'coliving_pro_rent_per_room', 'coliving_pro_util_fee', 'Floorplan Main'],
    ['6', 'ELIGIBLE_ACTIVE', '39', '-104', '8', '770', '80', 'https://drive.google.com/file/d/1ResearchMain123/view'],
    ['8', 'ELIGIBLE_ACTIVE', '39', '-105', '7', '830', '80'],
    ['40', 'ELIGIBLE_ACTIVE', '39.6996165', '-104.8733216', '9', '', '', 'https://drive.google.com/file/d/1XfAO8qr_te1wa14C-vaDvSd8f9LjNI2u/view'],
    ['3', 'HOLD_STATUS_UNKNOWN', '39', '-104'],
  ],
  readDealsSheet: async () => [['Deal ID', 'Address']],
  readOptionalTab: async () => [],
  readResearchCallouts: async () => [
    ['Y%', 'Label', 'Deal ID', 'Plan', 'X%', '#'],
    ['40', 'Fraser room', '6', 'main', '25', '1'],
    ['75', 'Fraser basement', '6', 'basement', '60', '2'],
    ['50', 'Grove room', 8, 'main', '35', '3'],
    ...Array.from({ length: 9 }, (_, index) => ['50', `Room ${index + 1}`, '40', index < 8 ? 'main' : 'basement', '25', String(index + 1)]),
  ],
}));

import { getDeal, getDeals } from '../lib/deals.functions';
import { portalDeals } from '../lib/portal-catalog';

describe('anonymous read-only preview access', () => {
  it('returns eligible home listings with no visitor credentials', async () => {
    expect((await getDeals()).deals.map(deal => deal.id)).toEqual(['6', '8', '40', ...portalDeals.map(deal => deal.id)]);
  });
  it('returns Research analysis without login, while ineligible IDs stay unavailable', async () => {
    const result = await getDeal({ data: { id: '6' } });
    expect(result.deal?.cells['Deal ID']).toBe('6');
    expect(result.analysis?.inputs.rooms).toHaveLength(0); // Changed/unknown plan cannot borrow Fraser's approved inventory.
    expect((await getDeal({ data: { id: '3' } })).deal).toBeNull();
  });
  it('selects Research Callouts by numeric/string deal ID and preserves coordinates by moved header', async () => {
    const fraser = await getDeal({ data: { id: '6' } });
    expect(fraser.deal?.cells['Floorplan Main']).toBe('https://drive.google.com/file/d/1ResearchMain123/view');
    expect(fraser.callouts.map(row => row.cells)).toEqual([
      { 'Y%': '40', Label: 'Fraser room', 'Deal ID': '6', Plan: 'main', 'X%': '25', '#': '1' },
      { 'Y%': '75', Label: 'Fraser basement', 'Deal ID': '6', Plan: 'basement', 'X%': '60', '#': '2' },
    ]);
    const grove = await getDeal({ data: { id: '8' } });
    expect(grove.callouts).toHaveLength(1);
    expect(grove.callouts[0]?.cells['Deal ID']).toBe('8');
    expect((await getDeal({ data: { id: '3' } })).callouts).toEqual([]);
  });
  it('preserves Elmira Research id 40 rooms 1-8 on main and room 9 on basement without mixing other deals', async () => {
    const elmira = await getDeal({ data: { id: '40' } });
    expect(elmira.research?.latitude).toBe(39.6996391);
    expect(elmira.research?.longitude).toBe(-104.8732734);
    expect(elmira.callouts).toHaveLength(9);
    expect(elmira.callouts.filter(row => row.cells['Plan'] === 'main').map(row => row.cells['#'])).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
    expect(elmira.callouts.filter(row => row.cells['Plan'] === 'basement').map(row => row.cells['#'])).toEqual(['9']);
    expect(elmira.callouts.every(row => row.cells['Deal ID'] === '40' && row.cells['X%'] === '25' && row.cells['Y%'] === '50')).toBe(true);
  });
});
it('home and direct detail return identical modeled inputs and preserve original source count',async()=>{const home=await getDeals();const detail=await getDeal({data:{id:'6'}});expect(home.analyses['6']?.inputs).toEqual(detail.analysis?.inputs);expect(detail.sourceAnalysis?.inputs.rooms).toHaveLength(8);expect(detail.analysis?.inputs.rooms).toHaveLength(0);});
