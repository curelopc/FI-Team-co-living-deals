import { describe, expect, it, vi } from 'vitest';

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

import { getDeal, getDeals } from '../lib/deals.functions';

describe('anonymous read-only preview access', () => {
  it('returns the published deals with no visitor credentials', async () => {
    const home = await getDeals();
    expect(home.deals).toHaveLength(30);
    expect(home.deals[0]?.id).toBe('6');
    expect(home.deals[1]?.id).toBe('40');
  });
  it('returns Fraser at the existing URL and leaves unknown IDs unavailable', async () => {
    const fraser = await getDeal({ data: { id: '6' } });
    expect(fraser.deal?.cells['Deal ID']).toBe('6');
    expect(fraser.analysis?.inputs.rooms).toHaveLength(8);
    expect(fraser.analysis?.inputs.price).toBe(490000);
    expect((await getDeal({ data: { id: '8' } })).deal).toBeNull();
    expect((await getDeal({ data: { id: 'macon-2069' } })).deal).toBeNull();
    expect((await getDeal({ data: { id: 'runyon-lake-4180' } })).deal).toBeNull();
  });
  it('keeps Elmira on its existing URL', async () => {
    const elmira = await getDeal({ data: { id: '40' } });
    expect(elmira.research?.latitude).toBe(39.6996391);
    expect(elmira.analysis?.inputs.rooms).toHaveLength(11);
  });
});

it('rendered deal data cites each room rent and keeps the old blanket $830 copy out', async () => {
  const home = await getDeals();
  const rendered = JSON.stringify(home);
  expect(rendered.includes('$830')).toBe(false);
  for (const deal of home.deals) {
    const blob = JSON.stringify(home.bundles[deal.id]);
    if (deal.id !== 'kalispell-1157') expect(blob.includes('$670'), deal.address).toBe(false);
  }
  for (const deal of home.deals) {
    for (const room of home.analyses[deal.id]?.inputs.rooms ?? []) {
      expect(room.evidence ?? '', `${deal.address} ${room.name}`).toContain(`Rent estimate $${room.rent}.`);
    }
  }
});

it('home and direct detail return the same Fraser inputs', async () => {
  const home = await getDeals();
  const detail = await getDeal({ data: { id: '6' } });
  expect(home.analyses['6']?.inputs).toEqual(detail.analysis?.inputs);
  expect(detail.analysis?.inputs.rooms.every(room => room.rent === 620)).toBe(true);
});
