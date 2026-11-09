import { reportEvidence, type ReportEvidence } from './report-evidence';
import { parseNumber, type DealRow, type TabRow } from './deals';

export type Amount = number | null;
export interface AnalysisRoom { name: string; rent: Amount; level: string; bath: string; evidence?: string }
export interface AnalysisCapex { name: string; cost: Amount }
export interface Expense { name: string; amount: Amount; evidence: string; perRoom?: boolean }
export interface AnalysisInputs {
  price: Amount; rate: Amount; termYears: Amount; downPercent: Amount; closingCosts: Amount;
  taxes: Amount; insurance: Amount; utilities: Amount; managementPercent: number; vacancyPercent: Amount;
  reno: Amount; holding: Amount; invoiceCredit: Amount; otherIncome: Amount;
  rooms: AnalysisRoom[]; capex: AnalysisCapex[]; expenses: Expense[]; reservePercent?: Amount; repairsPercent?: Amount;
  serviceRent?: Amount; managementBase?: 'gross' | 'collected'; tenantUtilityFee?: Amount; rentBasis?: 'historical-comparable' | 'research'; sharedRentEstimate?: Amount; privateRentEstimate?: Amount; insuranceEstimate?: boolean; taxLabel?: string;
}
export interface AnalysisSeed { inputs: AnalysisInputs; modelOnly: boolean; estimates: string[]; modelAssumptions: string[]; sourceUrl: string; sourceCashFlow: Amount; sourceCoc: Amount; historical?: ReportEvidence | undefined }
export const MAX_ROOMS = 16;
export function addRoom(input: AnalysisInputs): AnalysisInputs {
  return input.rooms.length >= MAX_ROOMS ? input : { ...input, rooms: [...input.rooms, { name: `Modeled room ${input.rooms.length + 1}`, rent: input.rentBasis==='historical-comparable' ? input.sharedRentEstimate ?? null : input.serviceRent ?? null, level: 'Unclear', bath: 'Unclear', evidence: 'Session addition, drawing not verified' }] };
}
export function removeRoom(input: AnalysisInputs, index: number): AnalysisInputs {
  return input.rooms.length <= 1 ? input : { ...input, rooms: input.rooms.filter((_, i) => i !== index) };
}
export function latestDeals(rows: DealRow[]): DealRow[] {
  return [...new Map(rows.map(row => [row.cells['Deal ID'], row])).values()];
}
export function latestRooms(rows: TabRow[]): TabRow[] {
  return [...new Map(rows.map(row => [row.cells['Room']?.match(/\b(?:room|bedroom)\s*(\d+)/i)?.[1] ?? row.cells['Room'], row])).values()];
}
export function capexLines(rows: TabRow[]): TabRow[] {
  const items = rows.filter(row => !/^(?:grand\s+)?total\b/i.test(row.cells['Item']?.trim() ?? ''));
  return items.length ? [...new Map(items.map(row => [row.cells['Item'], row])).values()] : rows.slice(-1);
}
const sum = (values: Amount[]): Amount => values.some(n => n == null) ? null : values.reduce<number>((s, n) => s + (n ?? 0), 0);
const pct = (raw: string | undefined) => { const n = parseNumber(raw); return n == null ? null : !raw?.includes('%') && Math.abs(n) <= 1 ? n * 100 : n; };
export function monthlyPayment(annualPercent: number, months: number, loan: number): number {
  if (loan <= 0 || months <= 0) return 0;
  const r = annualPercent / 100 / 12;
  return r === 0 ? loan / months : loan * r / (1 - Math.pow(1 + r, -months));
}
export function calculateAnalysis(input: AnalysisInputs) {
  const missing: string[] = [];
  const require = (n: Amount, label: string) => { if (n == null) missing.push(label); return n; };
  if (input.rooms.length < 1 || input.rooms.length > MAX_ROOMS) missing.push('Room count (1–16)');
  const grossRent = input.rooms.length ? sum(input.rooms.map(r => require(r.rent!=null&&(!Number.isFinite(r.rent)||r.rent<0)?null:r.rent, r.rent!=null&&r.rent<0?`${r.name} rent must be 0 or greater`:`${r.name} rent`))) : null;
  const tenantUtilityIncome = input.tenantUtilityFee === undefined ? 0 : input.tenantUtilityFee == null ? null : input.tenantUtilityFee * input.rooms.length;
  const grossIncome = sum([grossRent, require(input.otherIncome, 'Other income'), require(tenantUtilityIncome, 'Tenant utility income')]);
  const capexTotal = input.capex.length ? sum(input.capex.map(c => require(c.cost, c.name))) : require(input.reno, 'Upfront renovation');
  const price = require(input.price, 'Purchase price');
  const down = require(input.downPercent, 'Down payment %');
  const downPayment = price == null || down == null ? null : price * down / 100;
  const loan = price == null || downPayment == null ? null : price - downPayment;
  const rate = require(input.rate, 'Rate'); const term = require(input.termYears, 'Loan term');
  const principalInterest = loan == null || rate == null || term == null ? null : monthlyPayment(rate, term * 12, loan);
  const vacancy = grossIncome == null || input.vacancyPercent == null ? null : grossIncome * input.vacancyPercent / 100;
  const management = grossIncome == null ? null : input.managementBase === 'collected' ? vacancy == null ? null : (grossIncome - vacancy) * input.managementPercent / 100 : grossIncome * input.managementPercent / 100;
  require(input.vacancyPercent, 'Vacancy %');
  const expenseAmount = (e: Expense) => {
    const percent = e.name==='Monthly CapEx reserve' ? input.reservePercent : e.name==='Repairs / maintenance' ? input.repairsPercent : undefined;
    return percent === undefined ? e.amount == null ? null : e.amount * (e.perRoom ? input.rooms.length : 1) : percent == null || grossIncome == null ? null : grossIncome * percent / 100;
  };
  const operatingExpenses = sum([management, vacancy, require(input.taxes, 'Monthly property tax'), require(input.insurance, 'Monthly insurance'), require(input.utilities, 'Monthly utilities'), ...input.expenses.map(e => require(expenseAmount(e), e.name))]);
  const monthlyNoi = grossIncome == null || operatingExpenses == null ? null : grossIncome - operatingExpenses;
  const monthlyCashFlow = monthlyNoi == null || principalInterest == null ? null : monthlyNoi - principalInterest;
  const annualCashFlow = monthlyCashFlow == null ? null : monthlyCashFlow * 12;
  const cash = sum([downPayment, require(input.closingCosts, 'Closing costs'), capexTotal, require(input.holding, 'Holding costs')]);
  const credit = require(input.invoiceCredit, 'Invoice authorization credit');
  const cashInvested = cash == null || credit == null ? null : cash - credit;
  // Source SUM formulas skip a blank Maint/security cell. Keep a partial comparison without treating it as a verified zero.
  const knownOperatingExpenses = [management, vacancy, input.taxes, input.insurance, input.utilities, ...input.expenses.map(expenseAmount)].reduce<number>((s, n) => s + (n ?? 0), 0);
  const sourceComparableCashFlow = grossIncome == null || principalInterest == null ? null : grossIncome - knownOperatingExpenses - principalInterest;
  // Partial sums never mutate unknown cells. Required room rents/debt cannot be omitted.
  const knownGrossIncome = grossRent == null ? null : grossRent + (input.otherIncome ?? 0) + (tenantUtilityIncome ?? 0);
  const knownManagement = knownGrossIncome == null ? null : input.managementBase === 'collected' ? input.vacancyPercent == null ? null : knownGrossIncome * (1-input.vacancyPercent/100) * input.managementPercent/100 : knownGrossIncome * input.managementPercent/100;
  const knownVacancy = knownGrossIncome == null || input.vacancyPercent == null ? null : knownGrossIncome * input.vacancyPercent/100;
  const partialExpenses = input.expenses.map(e=>{
    const percent=e.name==='Monthly CapEx reserve'?input.reservePercent:e.name==='Repairs / maintenance'?input.repairsPercent:undefined;
    return percent===undefined?e.amount==null?null:e.amount*(e.perRoom?input.rooms.length:1):percent==null||knownGrossIncome==null?null:knownGrossIncome*percent/100;
  });
  const provisionalCashFlow = knownGrossIncome == null || principalInterest == null ? null : knownGrossIncome - [knownManagement,knownVacancy,input.taxes,input.insurance,input.utilities,...partialExpenses].reduce<number>((n,x)=>n+(x??0),0) - principalInterest;
  const knownCapex = input.capex.length ? input.capex.reduce((n,c)=>n+(c.cost??0),0) : input.reno;
  const investedSubtotal = [downPayment,input.closingCosts,knownCapex,input.holding].every(n=>n==null) ? null : [downPayment,input.closingCosts,knownCapex,input.holding].reduce<number>((n,x)=>n+(x??0),0)-(credit??0);
  const provisionalCoc = cashInvested != null && cashInvested>0 && provisionalCashFlow!=null ? provisionalCashFlow*12/cashInvested*100 : null;
  return { grossRent, grossIncome, tenantUtilityIncome, capexTotal, management, vacancy, downPayment, loan, principalInterest, operatingExpenses, monthlyNoi, monthlyCashFlow, annualCashFlow, cashInvested,
    provisionalCashFlow, investedSubtotal, provisionalCoc,
    cocPercent: cashInvested != null && cashInvested > 0 && annualCashFlow != null ? annualCashFlow / cashInvested * 100 : null,
    missing: [...new Set(missing)], knownOperatingExpenses, sourceComparableCashFlow,
    sourceComparableCoc: cashInvested != null && cashInvested > 0 && sourceComparableCashFlow != null ? sourceComparableCashFlow * 12 / cashInvested * 100 : null };
}
export function seedAnalysis(cells: Record<string, string>, rentRoll: TabRow[], capex: TabRow[], research: Record<string, string> = {}, sourceRows: string[][] = []): AnalysisSeed {
  const sourceUrl = research['property_report_url'] || cells['Detail Link'] || '';
  const reportId = sourceUrl.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1];
  const report = reportId ? reportEvidence[reportId] : undefined;
  const source = new Map(sourceRows.map(row => [row[0]?.trim(), row[1]]));
  const read = (label: string) => { const raw = source.get(label); return raw?.replace(/[$\s]/g, '') === '-' ? 0 : parseNumber(raw); };
  const modelOnly = rentRoll.length === 0;
  const count = parseNumber(research['converted_beds']);
  const rooms = latestRooms(rentRoll).map(row => ({ name: row.cells['Room'] || 'Room', rent: parseNumber(row.cells['Rent/mo']), level: row.cells['Level'] || 'Unclear', bath: row.cells['Bath'] || 'Unclear', evidence: row.cells['Rent Note'] || 'Source label; plan verification incomplete' }));
  if (!rooms.length && count != null && Number.isInteger(count) && count > 0) {
    for (let i = 0; i < Math.min(count, MAX_ROOMS); i++) rooms.push({ name: `Room ${i + 1}`, rent: parseNumber(research['coliving_pro_rent_per_room']), level: 'Unclear', bath: 'Unclear', evidence: 'Co-Living Pro assumption; drawing not verified' });
  }
  const n = (key: string) => parseNumber(cells[key]);
  const costs = capexLines(capex).map(row => ({ name: row.cells['Item'] || 'Renovation', cost: parseNumber(row.cells['Cost']) }));
  const price = n('Price'); const dp = n('Down Payment');
  const hasSource = sourceRows.length > 0;
  const expenses: Expense[] = hasSource ? ['Maint. & Security Fee by PMC', 'Private Money Loan Payment', 'Septic Service', 'Pest Control', 'Trash', 'Sewer & Water', 'Gas', 'Electricity', 'Internet', 'Lawn Care', 'Cleaning', 'Capital Improvments Budget', 'Misc. Repairs', 'HOA', '10 Day PadSlpit Fee (Caltd. Monthly)'].map(name => ({ name: name === 'Capital Improvments Budget' ? 'Monthly CapEx reserve' : name === 'Misc. Repairs' ? 'Repairs / maintenance' : name, amount: read(name), evidence: 'Original Inputs column B, monthly' })) : ['Cleaning', 'Monthly CapEx reserve', 'Repairs / maintenance', 'Maint. & Security Fee by PMC', 'HOA', 'Private money', 'Septic', 'Pest', 'Lawn care', 'PadSplit'].map(name => ({ name, amount: null, evidence: 'Missing source input' }));
  const inputs: AnalysisInputs = { price, rate: hasSource ? pct(source.get('Annual Interest Rate')) : pct(cells['Rate']), termYears: hasSource ? read('Loan Term (Years)') : n('Loan Term (Years)'), downPercent: hasSource ? pct(source.get('Downpayment Percentage')) : dp != null && price ? dp / price * 100 : null,
    closingCosts: hasSource ? read('Estimated Closing Costs') : n('Closing Costs'), taxes: hasSource ? read('Property Tax') : n('Property Tax/mo'), insurance: hasSource ? read('Home Owners Insurance') : n('Insurance/mo'), utilities: hasSource ? 0 : n('Utilities/mo'), managementPercent: 16,
    vacancyPercent: hasSource ? pct(source.get('Annual Vacancy')) : pct(cells['Vacancy %']), reno: hasSource ? read('Estimated CoLiving Renovation') : n('CapEx Total'), holding: hasSource ? read('Temp. Holding Cost') : n('Holding Costs'), invoiceCredit: hasSource ? read('Invoice Authorization') : n('Invoice Authorization'), otherIncome: hasSource ? 0 : n('Other Income/mo'), rooms, capex: costs, expenses };
  if (report && !hasSource) {
    inputs.rate = report.rate; inputs.downPercent = report.down; inputs.termYears = 30; inputs.closingCosts = report.closing;
    inputs.reno = report.rehab; inputs.taxes = 150; inputs.insurance = 150; inputs.vacancyPercent = report.vacancy;
    inputs.reservePercent = 4; inputs.repairsPercent = 4;
    // Unknown utilities/cleaning/holding/credit stay null. Historical $200 parking income is unverified at current listing.
    inputs.expenses = inputs.expenses.map(e => e.name === 'Monthly CapEx reserve' || e.name === 'Repairs / maintenance' ? {...e, amount:null, evidence:'Source 4% of gross income, monthly; dynamically recalculated'} : e);
    rooms.forEach((room, i) => {
      const fraser=reportId==='1qzFeYBe00iBzZYRPssvQPw9r9y0BmqBZ';
      room.level=fraser ? i<2?'Main':i<5?'Upper':'Basement' : i<4?'Main':'Basement';
      room.bath=fraser ? i===2?'Primary-accessed shower ensuite (drawing evidence)':i===5?'Bath access unclear': 'Hall/shared or unclear' : i===3?'Primary Bathroom ensuite (drawing evidence)':i>=4?'Hall/shared':'Access unclear';
      room.evidence=fraser ? i===0?'Dining conversion annotation':i===6||i===7?'Rec conversion annotation':'Existing labeled bedroom in PDF drawing' : i===0?'Living conversion annotation':i===4?'Partition annotation':'Existing labeled bedroom in PDF drawing';
    });
  }
  if (hasSource && (cells['Floorplan Main'] || '').includes('1XfAO8qr_te1wa14C-vaDvSd8f9LjNI2u')) rooms.forEach((room,i)=>{room.level=i===8?'Basement':'Main';room.bath=i===0?'Primary-accessed ensuite (drawing evidence)':i===8?'Hall/shared, not ensuite':'Shared or unclear';room.evidence=i===0?'Primary Bedroom evidence; misplaced source pin omitted':i===8?'Existing basement bedroom; no new conversion':'Proposed main labeled room';});
  return { inputs, modelOnly, historical:report, sourceUrl, sourceCashFlow: report?.sourceCashFlow ?? n('Cash Flow/mo'), sourceCoc: report?.sourceCoc ?? pct(cells['Cash-on-Cash']), estimates: [...(report?.notes ?? []), hasSource ? 'Live original calculator: monthly Inputs B values, not auxiliary weekly-conversion column C. Blank Maint/security is missing, not zero.' : 'Financial source incomplete. Missing inputs must be supplied before complete returns can be calculated.', report ? 'Craig-adjusted current-price scenario: 16% management of gross income, displayed vacancy included. Research room rents, not historical source rents. Historical parking income unverified currently. PDF reserve/repairs are 4% of gross income, not fixed historical dollars.' : 'Current source scenario: 16% management and source vacancy included. Source fixed monthly reserve and repair amounts retained separately from upfront renovation.', 'Monthly reserve is an operating expense; upfront renovation includes furnishings once.'], modelAssumptions: [...(hasSource ? ['Elmira main rooms 1–8; existing basement room 9. Authoritative same-level current/proposed files supplied by Craig. Room 1 source marker misplaced: overlay omitted, correction pending. Room 1 ensuite supported; room 9 bath hall/shared. Main direct scope $20,000; remaining $24,500 project-wide, not allocated. Insurance $280.50/mo source assumption; tax $280.50/mo actual $3,366/year.'] : []), research['coliving_pro_notes'] || cells['Why'] || 'Underwriting evidence incomplete', ...(research['coliving_pro_confidence'] ? [`Research confidence: ${research['coliving_pro_confidence']}`] : []), ...(modelOnly ? ['Research per-room rents are assumptions. Private bath/furnished pricing does not verify room bath access.', `Research utility fee: ${research['coliving_pro_util_fee'] || 'missing'} per room; tenant utility charge is not a verified owner utility expense.`] : [])] };
}
