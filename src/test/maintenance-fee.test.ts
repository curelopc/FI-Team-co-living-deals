import { expect, it } from 'vitest';
import { seedAnalysis, addRoom, calculateAnalysis } from '../lib/underwriting';
import { standardScenario } from '../lib/standard-scenario';

const seed = () => seedAnalysis({ Price: '724100' }, [], [], { converted_beds: '9', coliving_pro_rent_per_room: '750' });

it('maintenance/security is a flat 150 per property per month, never multiplied by modeled rooms', () => {
  const source = seed();
  source.inputs.taxes = 280.5; source.inputs.otherIncome = 0;
  source.inputs.expenses = source.inputs.expenses.map(e => ['HOA', 'Private money', 'Septic', 'Pest'].includes(e.name) ? { ...e, amount: 0 } : e);
  let v = standardScenario(source, { id: '6', coliving_pro_rent_per_room: '770', coliving_pro_util_fee: '80' }).inputs;
  const fee = v.expenses.find(e => e.name === 'Maintenance / security');
  expect(fee?.amount).toBe(150);
  expect(fee?.perRoom).toBeFalsy();
  expect(v.expenses.filter(e => e.name === 'Maintenance / security')).toHaveLength(1);
  expect(v.expenses.some(e => e.name === 'Maint. & Security Fee by PMC')).toBe(false);
  const r10 = calculateAnalysis(v);
  for (let i = 0; i < 6; i++) v = addRoom(v);
  const r16 = calculateAnalysis(v);
  // 10->16 adds only rent+tenant-fee-driven management/vacancy and per-room utilities: 6*(770+80)*(0.16+0.05) + 6*80 = 1551
  expect(r16.operatingExpenses! - r10.operatingExpenses!).toBeCloseTo(1551, 6);
});

it('removes every PadSplit variant from the modeled scenario even when the old source line is nonzero', () => {
  const source = seedAnalysis({ Price: '525000' }, [], [], { converted_beds: '8' }, [['10 Day PadSlpit Fee (Caltd. Monthly)', '500']]);
  expect(source.inputs.expenses.find(e => e.name === '10 Day PadSlpit Fee (Caltd. Monthly)')?.amount).toBe(500);
  const v = standardScenario(source, { id: '6', coliving_pro_rent_per_room: '770', coliving_pro_util_fee: '80' }).inputs;
  expect(v.expenses.some(e => /pads?l?plit/i.test(e.name))).toBe(false);
  const r = calculateAnalysis(v);
  expect(r.missing.some(m => /pads?l?plit/i.test(m))).toBe(false);
  // Tenant utility income is separate and preserved.
  expect(v.tenantUtilityFee).toBe(80);
});

it('Elmira becomes a complete estimated scenario with the 150 fee: CF -610.01, annual -7320.12, CoC -3.5918%, NOI 41284.8', () => {
  const source = seed();
  source.inputs.price = 724100; source.inputs.downPercent = 20; source.inputs.rate = 7.5; source.inputs.termYears = 30;
  source.inputs.closingCosts = 14482; source.inputs.reno = 44500; source.inputs.holding = 0; source.inputs.invoiceCredit = 0;
  source.inputs.taxes = 280.5; source.inputs.otherIncome = 0;
  source.inputs.expenses = source.inputs.expenses.map(e => ['HOA', 'Private money', 'Septic', 'Pest'].includes(e.name) ? { ...e, amount: 0 } : e);
  const room = source.inputs.rooms[0]; if (room) room.bath = 'Primary-accessed ensuite';
  const v = standardScenario(source, { id: '40', coliving_pro_rent_per_room: '950' }).inputs;
  const r = calculateAnalysis(v);
  expect(r.missing).toEqual([]);
  expect(r.grossIncome).toBe(7660);
  expect(r.monthlyNoi).toBeCloseTo(3440.4, 6);
  expect(r.monthlyNoi! * 12).toBeCloseTo(41284.8, 4);
  expect(r.monthlyCashFlow).toBeCloseTo(-610.01, 1);
  expect(r.annualCashFlow).toBeCloseTo(-7320.12, 0);
  expect(r.cocPercent).toBeCloseTo(-3.5918, 3);
  expect(r.cashInvested).toBe(203802);
});

it('negative rent still blocks complete and provisional income-dependent returns', () => {
  const v = standardScenario(seed(), { id: '40' }).inputs;
  v.downPercent = 20; v.rate = 7.5; v.termYears = 30; v.closingCosts = 14482; v.reno = 44500; v.holding = 0; v.invoiceCredit = 0;
  const room = v.rooms[0]; if (room) room.rent = -5;
  const r = calculateAnalysis(v);
  expect(r.monthlyCashFlow).toBeNull();
  expect(r.provisionalCashFlow).toBeNull();
  expect(r.provisionalCoc).toBeNull();
  expect(r.missing).toContain('Modeled room 1 rent must be 0 or greater');
});
