import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { conceptRoomsFor, dailyFigures, dailyPayload, publishedMetrics, siteIdForSlug } from '../lib/daily-deals';
import { listingPhotos } from '../lib/listing-photos';
import { modelSummary } from '../lib/deal-intake';
import { listingFacts } from '../lib/research';
import handoff from './handoff-2026-11-14.json';

const expected = [
  ['fraser-1584', '6'], ['elmira-911', '40'], ['topeka-4725', 'topeka-4725'], ['poppy-892', 'poppy-892'],
  ['ventura-3582', 'ventura-3582'], ['dawson-2418', 'dawson-2418'], ['21st-255', '21st-255'], ['eldorado-19299', 'eldorado-19299'],
  ['perry-5246', 'perry-5246'], ['rose-825', 'rose-825'], ['yale-4585', 'yale-4585'], ['adams-12218', 'adams-12218'],
  ['beth-216', 'beth-216'], ['oregon-12055', 'oregon-12055'], ['york-7751', 'york-7751'], ['crown-4860', 'crown-4860'],
  ['ceylon-4317', 'ceylon-4317'], ['perth-4965', 'perth-4965'], ['pacific-17004', 'pacific-17004'],
  ['fillmore-12357', 'fillmore-12357'], ['ouray-3404', 'ouray-3404'],
  ['w96th-565', 'w96th-565'], ['clarkson-7911', 'clarkson-7911'], ['kalispell-1157', 'kalispell-1157'],
  ['del-mar-179', 'del-mar-179'], ['zuni-2807', 'zuni-2807'], ['lakeview-6974', 'lakeview-6974'],
  ['waco-3668', 'waco-3668'], ['ammons-1805', 'ammons-1805'], ['radcliffe-8901', 'radcliffe-8901'],
  ['16th-avdr-120', '16th-avdr-120'], ['mineral-1522', 'mineral-1522'], ['99th-17066', '99th-17066'],
  ['green-meadows-5901', 'green-meadows-5901'], ['52nd-6799', '52nd-6799'], ['52nd-6641', '52nd-6641'],
  ['canosa-6896', 'canosa-6896'], ['93rd-20076', '93rd-20076'], ['26th-14606', '26th-14606'],
  ['67th-1652', '67th-1652'],
  ['cherrywood-1288', 'cherrywood-1288'], ['elmira-15780', 'elmira-15780'], ['zephyr-8238', 'zephyr-8238'],
  ['chaparral-7928', 'chaparral-7928'], ['lomand-16065', 'lomand-16065'], ['35th-24376', '35th-24376'],
  ['oak-3119', 'oak-3119'], ['akron-3413', 'akron-3413'], ['meade-9801', 'meade-9801'],
  ['zang-6015', 'zang-6015'],
] as const;

describe('2026-11-14 publish', () => {
  it('lists 50 deals, keeps Fraser and Elmira URLs, and leaves Grove, Macon, and Runyon Lake off', async () => {
    const home = dailyPayload();
    expect(home.deals.map(deal => deal.id)).toEqual(expected.map(([, id]) => id));
    expect(home.deals.some(deal => deal.id === '8' || /grove/i.test(deal.address))).toBe(false);
    expect(home.deals.some(deal => /macon/i.test(deal.address) || deal.id === 'macon-2069')).toBe(false);
    expect(home.deals.some(deal => deal.id === 'runyon-lake-4180' || /runyon/i.test(deal.address))).toBe(false);
    expect(dailyFigures('8')).toBeNull();
    expect(dailyFigures('macon-2069')).toBeNull();
    expect(dailyFigures('runyon-lake-4180')).toBeNull();
    expect(listingPhotos['macon-2069']).toBeUndefined();
    expect(listingPhotos['runyon-lake-4180']).toBeUndefined();
    expect(existsSync('public/listing-photos/macon-2069')).toBe(false);
    expect(existsSync('public/listing-photos/runyon-lake-4180')).toBe(false);
    const rendered = JSON.stringify(home);
    expect(rendered).not.toMatch(/Macon|7393028|Runyon Lake|6260568|matrixmedia|GetMedia\.ashx/i);
    expect(rendered).not.toMatch(/Needs input|rentable rows/i);
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

  it('publishes the 2026-11-12 Rose re-underwrite to the cent', () => {
    const figures = dailyFigures('rose-825');
    const metrics = publishedMetrics('rose-825');
    const bundle = dailyPayload().bundles['rose-825'];
    const cents = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
    expect(bundle?.research.displayPrice).toBe(699900);
    expect(figures?.rooms).toBe(12);
    expect(figures?.result.grossRent).toBe(7590);
    expect(cents.format(figures?.result.monthlyCashFlow ?? NaN)).toBe('-$172.46');
    expect(cents.format(figures?.result.cashInvested ?? NaN)).toBe('$255,861.94');
    expect(figures?.result.cocPercent?.toFixed(1)).toBe('-0.8');
    expect(bundle?.research.cells['cap_rate']).toBe('6.42');
    expect(metrics).toMatchObject({ pricePerSqft: 184.2, allIn: 804398, dscr: 0.96, capRate: 6.42, priceFor8: 438000, priceFor12: 355000, priceForCashFlowZero: 669000 });
    expect(bundle?.research.cells['flags']).toContain('Price reduced from $724,900 to $699,900');
    expect(bundle?.research.cells['sqft']).toBe('3800');
    expect(bundle?.research.cells['current_beds']).toBe('4');
    expect(bundle?.research.cells['current_baths']).toBe('3 (2 full, 1 three-quarter)');
    expect(bundle?.analysis?.inputs.rooms).toHaveLength(12);
    expect(bundle?.analysis ? modelSummary(bundle.analysis.inputs).roomCount : 0).toBe(12);
  });

  const nov12 = ['w96th-565', 'clarkson-7911', 'kalispell-1157', 'del-mar-179', 'zuni-2807', 'lakeview-6974', 'waco-3668', 'ammons-1805', 'radcliffe-8901'] as const;

  it('draws the 2026-11-12 deals and keeps Runyon Lake unpublished', () => {
    for (const slug of nov12) {
      const rooms = conceptRoomsFor(slug);
      const figures = dailyFigures(slug);
      const bundle = dailyPayload().bundles[slug];
      expect(rooms, slug).toBeTruthy();
      const expectedRooms = slug === 'clarkson-7911' ? 11 : 10;
      expect(rooms?.length, slug).toBe(expectedRooms);
      expect(figures?.rooms, slug).toBe(expectedRooms);
      expect(rooms?.filter(room => room.window).every(room => room.level === 'Basement'), slug).toBe(true);
      expect(rooms?.some(room => room.level === 'Main'), slug).toBe(true);
      expect(rooms?.some(room => room.level === 'Basement' && room.window), slug).toBe(true);
      expect(rooms?.filter(room => room.level !== 'Basement').every(room => !room.window), slug).toBe(true);
      expect(figures?.result.grossRent, slug).toBe(rooms?.reduce((sum, room) => sum + (room.rent ?? 0), 0));
      expect(bundle?.research.cells['photo_url'], slug).toMatch(new RegExp(`^/listing-photos/${slug}/`));
      expect(bundle?.research.cells['photo_gallery'], slug).not.toMatch(/https?:/i);
      expect(existsSync(`public/listing-photos/${slug}`)).toBe(true);
      expect(bundle?.research.cells['flags'], slug).toMatch(/unverified concept/i);
      expect(bundle?.research.cells['current_beds'], slug).toBeTruthy();
      expect(bundle?.research.cells['current_baths'], slug).toBeTruthy();
      expect(bundle?.research.cells['converted_beds'], slug).toBe(slug === 'clarkson-7911' ? '11' : '10');
      const summary = bundle?.analysis ? modelSummary(bundle.analysis.inputs) : null;
      const roomCount = slug === 'clarkson-7911' ? 11 : 10;
      expect(summary?.roomCount, slug).toBe(roomCount);
      expect(summary?.drawnCount, slug).toBe(roomCount);
      expect(summary?.grossRent, slug).toBe(figures?.result.grossRent);
    }
    const ammons = dailyPayload().bundles['ammons-1805'];
    expect(ammons?.research.cells['flags']).toMatch(/Lakewood/);
    expect(ammons?.research.cells['flags']).toMatch(/Denver 80232/);
    expect(dailyPayload().bundles['clarkson-7911']?.research.cells['flags']).toMatch(/7 bedrooms/);
    expect(dailyPayload().bundles['clarkson-7911']?.research.cells['converted_beds']).toBe('11');
    expect(dailyPayload().bundles['clarkson-7911']?.analysis?.inputs.rooms.filter(room => /private/i.test(room.bath))).toHaveLength(1);
    expect(dailyPayload().bundles['w96th-565']?.research.latitude).toBeCloseTo(39.870748489656, 5);
  });

  const nov13 = ['16th-avdr-120', 'mineral-1522', '99th-17066', 'green-meadows-5901', '52nd-6799', '52nd-6641', 'canosa-6896', '93rd-20076', '26th-14606', '67th-1652'] as const;

  it('draws the 2026-11-13 deals and keeps both Oregon and Ouray pending', () => {
    for (const slug of nov13) {
      const rooms = conceptRoomsFor(slug);
      const figures = dailyFigures(slug);
      const bundle = dailyPayload().bundles[slug];
      const expectedRooms = slug === 'green-meadows-5901' ? 9 : 10;
      expect(rooms, slug).toBeTruthy();
      expect(rooms?.length, slug).toBe(expectedRooms);
      expect(figures?.rooms, slug).toBe(expectedRooms);
      expect(rooms?.filter(room => room.window).every(room => room.level === 'Basement'), slug).toBe(true);
      expect(rooms?.some(room => room.level === 'Main'), slug).toBe(true);
      expect(rooms?.some(room => room.level === 'Basement' && room.window), slug).toBe(true);
      expect(rooms?.filter(room => room.level !== 'Basement').every(room => !room.window), slug).toBe(true);
      expect(figures?.result.grossRent, slug).toBe(rooms?.reduce((sum, room) => sum + (room.rent ?? 0), 0));
      expect(bundle?.research.cells['photo_url'], slug).toMatch(new RegExp(`^/listing-photos/${slug}/`));
      expect(bundle?.research.cells['photo_gallery'], slug).not.toMatch(/https?:/i);
      expect(existsSync(`public/listing-photos/${slug}/01.webp`)).toBe(true);
      expect(bundle?.research.cells['flags'], slug).toMatch(/unverified heuristic concept/i);
      expect(bundle?.research.cells['listing_status'], slug).toBe('ACTIVE');
      expect(bundle?.research.cells['current_beds'], slug).toBeTruthy();
      expect(bundle?.research.cells['current_baths'], slug).toBeTruthy();
      expect(bundle?.research.cells['converted_beds'], slug).toBe(String(expectedRooms));
      const summary = bundle?.analysis ? modelSummary(bundle.analysis.inputs) : null;
      expect(summary?.roomCount, slug).toBe(expectedRooms);
      expect(summary?.drawnCount, slug).toBe(expectedRooms);
      expect(summary?.grossRent, slug).toBe(figures?.result.grossRent);
    }
    const oregon = dailyPayload().bundles['oregon-12055'];
    expect(oregon?.research.cells['listing_status']).toBe('PENDING');
    expect(oregon?.research.cells['flags']).toMatch(/UNCONFIRMED/);
    expect(oregon?.research.cells['flags']).toContain('Active Under Contract');
    expect(oregon?.research.cells['flags']).toContain('Feaster Realty');
    const ouray = dailyPayload().bundles['ouray-3404'];
    expect(ouray?.research.cells['listing_status']).toBe('PENDING');
    expect(ouray?.research.cells['flags']).toMatch(/UNCONFIRMED/);
    expect(ouray?.research.cells['flags']).toContain('Active Under Contract');
    expect(ouray?.research.cells['flags']).toContain('Kenna Group');
    const bright = dailyPayload().bundles['16th-avdr-120'];
    expect(bright?.research.cells['flags']).toMatch(/16th Avdr Drive/);
    expect(bright?.research.cells['flags']).toMatch(/120 South 16th Avenue/);
    expect(dailyPayload().bundles['green-meadows-5901']?.research.cells['flags']).toMatch(/2,843 sq ft/);
    expect(dailyPayload().bundles['green-meadows-5901']?.research.cells['sqft']).toBe('2843');
    const rendered = JSON.stringify(dailyPayload());
    expect(rendered).not.toMatch(/Needs input|rentable rows|matrixmedia|GetMedia\.ashx/i);
  });

  it('publishes the 2026-11-14 21st Place re-underwrite to the cent', () => {
    const figures = dailyFigures('21st-255');
    const metrics = publishedMetrics('21st-255');
    const bundle = dailyPayload().bundles['21st-255'];
    const cents = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
    expect(bundle?.research.displayPrice).toBe(455000);
    expect(bundle?.research.cells['listing_status']).toBe('ACTIVE');
    expect(figures?.rooms).toBe(10);
    expect(cents.format(figures?.result.monthlyCashFlow ?? NaN)).toBe('$335.22');
    expect(cents.format(figures?.result.cashInvested ?? NaN)).toBe('$214,036.55');
    expect(figures?.result.cocPercent?.toFixed(1)).toBe('1.9');
    expect(bundle?.research.cells['cap_rate']).toBe('7.6');
    expect(metrics?.dscr).toBe(1.13);
    expect(bundle?.research.cells['flags']).toContain('Price reduced from $475,000 to $455,000');
    expect(bundle?.analysis?.inputs.rooms).toHaveLength(10);
    expect(bundle?.analysis ? modelSummary(bundle.analysis.inputs).roomCount : 0).toBe(10);
  });

  const nov14 = ['cherrywood-1288', 'elmira-15780', 'zephyr-8238', 'chaparral-7928', 'lomand-16065', '35th-24376', 'oak-3119', 'akron-3413', 'meade-9801', 'zang-6015'] as const;

  it('draws the 2026-11-14 deals with hosted covers and unverified concept labels', () => {
    for (const slug of nov14) {
      const rooms = conceptRoomsFor(slug);
      const figures = dailyFigures(slug);
      const bundle = dailyPayload().bundles[slug];
      const expectedRooms = slug === 'cherrywood-1288' ? 9 : 10;
      expect(rooms, slug).toBeTruthy();
      expect(rooms?.length, slug).toBe(expectedRooms);
      expect(figures?.rooms, slug).toBe(expectedRooms);
      expect(rooms?.filter(room => room.window).every(room => room.level === 'Basement'), slug).toBe(true);
      expect(rooms?.some(room => room.level === 'Main'), slug).toBe(true);
      expect(rooms?.some(room => room.level === 'Basement' && room.window), slug).toBe(true);
      expect(rooms?.filter(room => room.level !== 'Basement').every(room => !room.window), slug).toBe(true);
      expect(rooms?.filter(room => room.work !== 'existing').every(room => room.closet), slug).toBe(true);
      expect(figures?.result.grossRent, slug).toBe(rooms?.reduce((sum, room) => sum + (room.rent ?? 0), 0));
      expect(bundle?.research.cells['photo_url'], slug).toBe(`/listing-photos/${slug}/01.webp`);
      expect(bundle?.research.cells['photo_gallery'], slug).not.toMatch(/https?:/i);
      expect(existsSync(`public/listing-photos/${slug}/01.webp`)).toBe(true);
      expect(bundle?.research.cells['flags'], slug).toMatch(/unverified heuristic concept/i);
      expect(bundle?.research.cells['flags'], slug).toMatch(/assumption/i);
      expect(bundle?.research.cells['listing_status'], slug).toBe('ACTIVE');
      expect(bundle?.research.cells['sqft'], slug).toBeTruthy();
      expect(bundle?.research.cells['current_beds'], slug).toBeTruthy();
      expect(bundle?.research.cells['current_baths'], slug).toBeTruthy();
      expect(bundle?.research.cells['converted_beds'], slug).toBe(String(expectedRooms));
      const summary = bundle?.analysis ? modelSummary(bundle.analysis.inputs) : null;
      expect(summary?.roomCount, slug).toBe(expectedRooms);
      expect(summary?.drawnCount, slug).toBe(expectedRooms);
      expect(summary?.grossRent, slug).toBe(figures?.result.grossRent);
      const facts = listingFacts(bundle?.research.cells ?? {}, figures?.rooms ?? 0);
      expect(facts.futureBeds, slug).toBe(expectedRooms);
      expect(facts.sqft, slug).toBe(Number(bundle?.research.cells['sqft']));
      expect(facts.currentBeds, slug).toBe(Number(bundle?.research.cells['current_beds']));
    }
    expect(dailyPayload().bundles['cherrywood-1288']?.research.cells['flags']).toMatch(/2,664 sq ft/);
    expect(dailyPayload().bundles['elmira-15780']?.research.cells['flags']).toContain('DEN-20261114-02');
    expect(dailyPayload().bundles['elmira-15780']?.research.cells['flags']).toContain('DEN-20261104-05');
    expect(dailyPayload().bundles['35th-24376']?.research.cells['flags']).toMatch(/did not return a Census address match/);
    expect(dailyPayload().bundles['35th-24376']?.research.cells['flags']).toMatch(/2026 figure/);
  });

  it('matches every displayed deal to the 2026-11-14 deals.json figures to the cent', () => {
    const payload = dailyPayload();
    const cents = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
    expect(handoff.map(row => row.slug)).toEqual(expected.map(([slug]) => slug));
    expect(payload.deals.map(deal => deal.id)).toEqual(handoff.map(row => siteIdForSlug(row.slug)));
    for (const row of handoff) {
      const id = siteIdForSlug(row.slug);
      const figures = dailyFigures(id);
      const bundle = payload.bundles[id];
      const inputs = bundle?.analysis?.inputs;
      const summary = inputs ? modelSummary(inputs) : null;
      const facts = listingFacts(bundle?.research.cells ?? {}, figures?.rooms ?? 0);
      expect(bundle?.research.displayPrice, row.slug).toBe(row.price);
      expect(cents.format(figures?.result.monthlyCashFlow ?? NaN), row.slug).toBe(cents.format(row.cash_flow));
      expect(cents.format(figures?.result.cashInvested ?? NaN), row.slug).toBe(cents.format(row.invested));
      expect(figures?.result.cocPercent?.toFixed(1), row.slug).toBe(row.coc_pct.toFixed(1));
      expect(bundle?.research.cells['cap_rate'], row.slug).toBe(String(row.cap_rate_pct));
      expect(publishedMetrics(id)?.dscr, row.slug).toBe(row.dscr);
      expect(figures?.rooms, row.slug).toBe(row.rooms);
      expect(inputs?.rooms.length, row.slug).toBe(row.rooms);
      expect(summary?.roomCount, row.slug).toBe(row.rooms);
      expect(summary?.drawnCount, row.slug).toBe(row.rooms);
      expect(bundle?.research.cells['converted_beds'], row.slug).toBe(String(row.rooms));
      expect(facts.futureBeds, row.slug).toBe(row.rooms);
      expect(facts.sqft, row.slug).toBe(row.sqft);
      expect(facts.currentBeds, row.slug).toBe(row.beds);
      expect(bundle?.research.cells['current_baths'], row.slug).toBe(row.baths);
      const concept = conceptRoomsFor(id);
      if (concept) expect(concept.length, row.slug).toBe(row.rooms);
      expect(JSON.stringify(bundle), row.slug).not.toMatch(/Needs input|rentable rows/i);
    }
  });
});
