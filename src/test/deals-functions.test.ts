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
    expect(home.deals).toHaveLength(22);
    expect(home.deals[0]?.id).toBe('6');
    expect(home.deals[1]?.id).toBe('40');
  });
  it('returns Fraser at the existing URL and leaves unknown IDs unavailable', async () => {
    const fraser = await getDeal({ data: { id: '6' } });
    expect(fraser.deal?.cells['Deal ID']).toBe('6');
    expect(fraser.analysis?.inputs.rooms).toHaveLength(8);
    expect(fraser.analysis?.inputs.price).toBe(490000);
    expect((await getDeal({ data: { id: '8' } })).deal).toBeNull();
  });
  it('keeps Elmira on its existing URL', async () => {
    const elmira = await getDeal({ data: { id: '40' } });
    expect(elmira.research?.latitude).toBe(39.6996391);
    expect(elmira.analysis?.inputs.rooms).toHaveLength(11);
  });
});

it('home and direct detail return the same Fraser inputs', async () => {
  const home = await getDeals();
  const detail = await getDeal({ data: { id: '6' } });
  expect(home.analyses['6']?.inputs).toEqual(detail.analysis?.inputs);
  expect(detail.analysis?.inputs.rooms.every(room => room.rent === 620)).toBe(true);
});
