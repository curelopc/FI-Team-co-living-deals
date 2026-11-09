// Authoritative PDF transcriptions supplied by Craig, keyed by report document.
export interface ReportEvidence {
  price: number; down: number; loan: number; rate: number; rehab: number; closing: number;
  rents: number[]; parking: number; principal: number; interest: number;
  reserve: number; repairs: number; vacancy: number; sourceIncome: number;
  sourceCashFlow: number; sourceCoc: number; displayedExpenses: number;
  renovations: { name: string; cost: number }[]; statedItemTotal?: number; notes: string[];
}
export const reportEvidence: Record<string, ReportEvidence> = {
  '1qzFeYBe00iBzZYRPssvQPw9r9y0BmqBZ': {
    price:540000, down:20, loan:432000, rate:6.75, rehab:24300, closing:15000,
    rents:[800,800,1100,700,900,850,800,900], parking:200, principal:371.94, interest:2430,
    reserve:282, repairs:282, vacancy:3, sourceIncome:7050, sourceCashFlow:3384, sourceCoc:27.57, displayedExpenses:3666, statedItemTotal:24900,
    renovations:[{name:'New bedroom: two walls + door',cost:4000},{name:'Egress',cost:15000},{name:'Kitchen furnishings',cost:2500},{name:'Living furnishings',cost:2500},{name:'Smart locks',cost:600},{name:'Photos',cost:300}],
    notes:['Fraser original PDF p8: historical $540,000 price, 20% down, $432,000 loan, 6.75%, 30 years. Self-managed: management blank, source scenario 0%. Optional payments source-explicit $0; PMI blank.', 'Displayed vacancy $211.50 (3% of $7,050 income) is omitted from reported expenses $3,666. Correcting vacancy lowers the historical known-input cash flow; utilities and recurring cleaning were not provided.', 'Fraser listed renovation costs total $24,900 versus source stated rehab $24,300: $600 source discrepancy. Displayed rehab retained once, no invented area allocation.', 'Fraser pp4–6 are authentic proposed annotated plans, not current drawings. Composite main rooms 1 dining conversion and 2 existing; upper rooms 3 primary, 4, 5; basement room 6 existing and 7–8 rec conversions. Room 3 private shower access supported; room 6 bath access unclear.'],
  },
  '1nerAZNgXruEliTuS9j1KbrJeHRxDGouk': {
    price:565000, down:6.5, loan:528275, rate:6.25, rehab:16300, closing:10000,
    rents:[850,850,900,1100,850,750,800], parking:200, principal:501.25, interest:2751.43,
    reserve:252, repairs:252, vacancy:3, sourceIncome:6300, sourceCashFlow:2243, sourceCoc:42.71, displayedExpenses:4057,
    renovations:[{name:'Bedroom: two walls + door',cost:6000},{name:'Kitchen furnishings',cost:2500},{name:'Living furnishings',cost:2500},{name:'Smart locks',cost:600},{name:'Washer/dryer',cost:1200},{name:'Postconstruction cleaning (one-time)',cost:300},{name:'Photos',cost:300},{name:'Junk removal',cost:500},{name:'Buffer',cost:3000}],
    notes:['Grove original PDF p7: historical $565,000 price. Heading says INVESTOR 20% SELF MANAGE but the old report calculator down is 6.50% ($36,725), loan $528,275, 6.25%, 30 years. That 6.50% stays in this old report only. The live scenario uses the FI Team standard 20% down. Source management blank/self-managed 0%.', 'Displayed vacancy $189 (3% of $6,300 income) is omitted from reported expenses $4,057. Corrected scenario includes vacancy. Utilities and recurring cleaning not provided, not verified zero.', 'Grove p8 renovation items total $16,900 versus displayed rehab $16,300: $600 discrepancy. Keep displayed total once; area allocations unprovided. $300 postconstruction cleaning is one-time, not monthly cleaning.', 'Grove pp4–5 are authentic annotated proposed plans. Main rooms 1 living conversion, 2–3 existing, 4 primary with visible Primary Bathroom ensuite. Basement room 5 partition, 6–7 existing; bath hall/shared. Current drawings missing.'],
  },
};
export function historicalSummary(report: ReportEvidence) {
  const roomRent = report.rents.reduce((s,n)=>s+n,0);
  const pi = report.principal + report.interest;
  const expensesWithoutVacancy = pi + 150 + 150 + report.reserve + report.repairs;
  const omittedVacancy = report.sourceIncome * report.vacancy / 100;
  const cashInvested = report.price * report.down / 100 + report.rehab + report.closing;
  const reproducedCashFlow = report.sourceIncome - expensesWithoutVacancy;
  const correctedKnownCashFlow = reproducedCashFlow - omittedVacancy;
  const itemTotal = report.renovations.reduce((s,item)=>s+item.cost,0);
  return {roomRent, pi, expensesWithoutVacancy, omittedVacancy, cashInvested, reproducedCashFlow, correctedKnownCashFlow, correctedKnownCoc:correctedKnownCashFlow*12/cashInvested*100, itemTotal, discrepancy:itemTotal-report.rehab};
}
