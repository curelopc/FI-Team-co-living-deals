import { describe, expect, it } from 'vitest';
import { dailyFigures, dailyPayload, siteIdForSlug } from '../lib/daily-deals';

const expected = [
  ['fraser-1584', '6'], ['elmira-911', '40'], ['topeka-4725', 'topeka-4725'], ['poppy-892', 'poppy-892'],
  ['ventura-3582', 'ventura-3582'], ['dawson-2418', 'dawson-2418'], ['21st-255', '21st-255'], ['eldorado-19299', 'eldorado-19299'],
  ['perry-5246', 'perry-5246'], ['rose-825', 'rose-825'], ['yale-4585', 'yale-4585'], ['adams-12218', 'adams-12218'],
  ['beth-216', 'beth-216'], ['oregon-12055', 'oregon-12055'], ['york-7751', 'york-7751'], ['crown-4860', 'crown-4860'],
  ['ceylon-4317', 'ceylon-4317'], ['perth-4965', 'perth-4965'], ['macon-2069', 'macon-2069'], ['pacific-17004', 'pacific-17004'],
  ['fillmore-12357', 'fillmore-12357'], ['ouray-3404', 'ouray-3404'],
] as const;

describe('2026-11-10 publish', () => {
  it('lists 22 deals, keeps Fraser and Elmira URLs, and drops Grove', async () => {
    const home = dailyPayload();
    expect(home.deals.map(deal => deal.id)).toEqual(expected.map(([, id]) => id));
    expect(home.deals.some(deal => deal.id === '8' || /grove/i.test(deal.address))).toBe(false);
    expect(dailyFigures('8')).toBeNull();
  });

  it('uses the CoLivingPro Fraser rent, not a missing-rent blank', () => {
    const figures = dailyFigures('6');
    expect(siteIdForSlug('fraser-1584')).toBe('6');
    expect(figures?.rooms).toBe(8);
    expect(figures?.model?.rent).toBe(4960);
    expect(figures?.result.grossRent).toBe(4960);
    expect(figures?.result.tenantUtilityIncome).toBe(640);
    expect(figures?.result.monthlyCashFlow).toBeCloseTo(-643.76, 2);
    expect(figures?.result.cashInvested).toBeCloseTo(155555.52, 2);
    expect(figures?.result.cocPercent).toBeCloseTo(-5, 1);
    expect(figures?.model?.cap_rate_pct).toBe(5.14);
    expect(figures?.result.missing).toEqual([]);
  });

  it('matches every deal file total for rent, cash flow, cash invested, and room count', () => {
    const payload = dailyPayload();
    for (const deal of payload.deals) {
      const figures = dailyFigures(deal.id);
      expect(figures?.result.grossRent, deal.address).toBe(figures?.model?.rent);
      expect(figures?.result.monthlyCashFlow, deal.address).toBeCloseTo(figures?.model?.cash_flow ?? NaN, 2);
      expect(figures?.result.cashInvested, deal.address).toBeCloseTo(figures?.model?.invested ?? NaN, 2);
      expect(figures?.rooms, deal.address).toBe(figures?.model ? payload.bundles[deal.id]?.analysis?.inputs.rooms.length : 0);
      expect(figures?.result.cocPercent, deal.address).toBeCloseTo(figures?.model?.coc_pct ?? NaN, 1);
    }
  });
});
