import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { conceptRoomsFor, dailyFigures, dailyPayload, publishedMetrics, siteIdForSlug } from '../lib/daily-deals';
import { listingPhotos } from '../lib/listing-photos';
import { modelSummary } from '../lib/deal-intake';

const expected = [
  ['fraser-1584', '6'], ['elmira-911', '40'], ['topeka-4725', 'topeka-4725'], ['poppy-892', 'poppy-892'],
  ['ventura-3582', 'ventura-3582'], ['dawson-2418', 'dawson-2418'], ['21st-255', '21st-255'], ['eldorado-19299', 'eldorado-19299'],
  ['perry-5246', 'perry-5246'], ['rose-825', 'rose-825'], ['yale-4585', 'yale-4585'], ['adams-12218', 'adams-12218'],
  ['beth-216', 'beth-216'], ['oregon-12055', 'oregon-12055'], ['york-7751', 'york-7751'], ['crown-4860', 'crown-4860'],
  ['ceylon-4317', 'ceylon-4317'], ['perth-4965', 'perth-4965'], ['pacific-17004', 'pacific-17004'],
  ['fillmore-12357', 'fillmore-12357'], ['ouray-3404', 'ouray-3404'],
] as const;

describe('2026-11-11 publish', () => {
  it('lists 21 deals, keeps Fraser and Elmira URLs, and drops Grove and withdrawn Macon', async () => {
    const home = dailyPayload();
    expect(home.deals.map(deal => deal.id)).toEqual(expected.map(([, id]) => id));
    expect(home.deals.some(deal => deal.id === '8' || /grove/i.test(deal.address))).toBe(false);
    expect(home.deals.some(deal => /macon/i.test(deal.address) || deal.id === 'macon-2069' || /96th/i.test(deal.address))).toBe(false);
    expect(dailyFigures('8')).toBeNull();
    expect(dailyFigures('macon-2069')).toBeNull();
    expect(listingPhotos['macon-2069']).toBeUndefined();
    expect(existsSync('public/listing-photos/macon-2069')).toBe(false);
    const rendered = JSON.stringify(home);
    expect(rendered).not.toMatch(/Macon|7393028|96th Avenue|4794692/i);
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
      const cents = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
      expect(cents.format(figures?.result.monthlyCashFlow ?? NaN), deal.address).toBe(cents.format(figures?.model?.cash_flow ?? NaN));
      expect(cents.format(figures?.result.cashInvested ?? NaN), deal.address).toBe(cents.format(figures?.model?.invested ?? NaN));
      const rendered = JSON.stringify(deal);
      expect(rendered, deal.address).not.toMatch(/Needs input|rentable rows/i);
      const analysis = payload.bundles[deal.id]?.analysis;
      expect(analysis, deal.address).toBeTruthy();
      if (!analysis) continue;
      const summary = modelSummary(analysis.inputs);
      expect(summary.roomCount, deal.address).toBe(figures?.rooms);
      expect(summary.drawnCount, deal.address).toBe(figures?.rooms);
      expect(summary.grossRent, deal.address).toBe(analysis.inputs.rooms.reduce((sum, room) => sum + (room.rent ?? 0), 0));
      const metrics = publishedMetrics(deal.id);
      expect(metrics?.dscr, deal.address).not.toBeNull();
      expect(metrics?.allIn, deal.address).toBe((figures?.model?.loan != null && figures.model.down != null && figures.model.closing != null && figures.model.reno != null) ? (figures.model.down + figures.model.loan) + figures.model.closing + figures.model.reno : NaN);
    }
  });

  it('publishes the 2026-11-11 Topeka re-underwrite to the cent', () => {
    const figures = dailyFigures('topeka-4725');
    const metrics = publishedMetrics('topeka-4725');
    const bundle = dailyPayload().bundles['topeka-4725'];
    const cents = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
    expect(bundle?.research.displayPrice).toBe(494900);
    expect(figures?.rooms).toBe(11);
    expect(figures?.result.grossRent).toBe(6820);
    expect(cents.format(figures?.result.monthlyCashFlow ?? NaN)).toBe('$656.48');
    expect(cents.format(figures?.result.cashInvested ?? NaN)).toBe('$177,931.05');
    expect(figures?.result.cocPercent?.toFixed(1)).toBe('4.4');
    expect(bundle?.research.cells['cap_rate']).toBe('8.3');
    expect(metrics).toMatchObject({ pricePerSqft: 143.6, allIn: 565298, dscr: 1.24, capRate: 8.3, priceFor8: 422000, priceFor12: 354000, priceForCashFlowZero: 612000 });
    expect(cents.format(metrics?.pricePerSqft ?? NaN)).toBe('$143.60');
    expect(cents.format(metrics?.allIn ?? NaN)).toBe('$565,298.00');
    expect(bundle?.research.cells['flags']).toContain('Price reduced from $499,900 to $494,900');
    expect(bundle?.research.cells['flags']).not.toMatch(/Needs input/i);
    const inputs = bundle?.analysis?.inputs;
    expect(inputs?.rooms).toHaveLength(11);
    expect(inputs ? modelSummary(inputs).roomCount : 0).toBe(11);
  });

  it('draws the new deals on main and basement, with plain W only downstairs', () => {
    for (const slug of ['beth-216', 'oregon-12055', 'york-7751', 'crown-4860', 'ceylon-4317', 'perth-4965', 'pacific-17004', 'fillmore-12357', 'ouray-3404']) {
      const rooms = conceptRoomsFor(slug);
      const figures = dailyFigures(slug);
      expect(rooms, slug).toBeTruthy();
      expect(rooms?.length, slug).toBe(figures?.rooms);
      expect(rooms?.filter(room => room.window).every(room => room.level === 'Basement'), slug).toBe(true);
      expect(rooms?.some(room => room.level === 'Main'), slug).toBe(true);
      expect(rooms?.some(room => room.level === 'Basement' && room.window), slug).toBe(true);
      expect(figures?.result.grossRent, slug).toBe(rooms?.reduce((sum, room) => sum + (room.rent ?? 0), 0));
    }
    expect(dailyPayload().deals.find(deal => deal.id === 'york-7751')?.latitude).toBeCloseTo(39.837288691039, 5);
  });
});
