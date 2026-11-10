import { monthlyPayment, type AnalysisSeed } from './underwriting';
import { parseNumber } from './deals';

export interface FinancialBasis { field: string; label?: string; kind: 'Source' | 'Estimated'; value: number; units: string; basis: string }
/** Fill absent financial values in the working scenario, and always apply the FI Team standard 20% down. Never edits the source seed. */
export function fillFinancialAssumptions(seed: AnalysisSeed, research: Record<string, string>) {
  const input = seed.inputs;
  const records: FinancialBasis[] = [];
  const fill = (key: 'price'|'rate'|'termYears'|'downPercent'|'closingCosts'|'taxes'|'insurance'|'reno'|'holding'|'invoiceCredit'|'otherIncome', fallback: number, units: string, basis: string) => {
    const absent = input[key] == null;
    if (absent) input[key] = fallback;
    records.push({ field: key, kind: absent ? 'Estimated' : 'Source', value: input[key] ?? fallback, units, basis: absent ? basis : 'Preserved supplied scenario/source value; no missing-field replacement.' });
  };
  fill('price', parseNumber(research['purchase_list_price']) ?? 500000, '$ purchase', 'Listing price when available; otherwise $500,000 planning placeholder, not a valuation.');
  fill('rate', 7.5, '% annual', '7.5% planning mortgage rate, not a lender quote.');
  fill('termYears', 30, 'years', '30-year amortization planning assumption.');
  // Every live scenario uses 20% down. An old report down payment stays on the historical report.
  input.downPercent = 20;
  records.push({ field: 'downPercent', kind: 'Estimated', value: 20, units: '% purchase price', basis: 'FI Team standard assumption: 20% down on a conventional loan. Loan equals price minus 20%, and principal and interest use that loan. The old report down payment stays in the old report.' });
  fill('closingCosts', (input.price ?? 0)*0.02, '$ upfront', '2% of purchase price closing allowance, excluding renovation and holding.');
  fill('taxes', (input.price ?? 0)*0.006/12, '$ / month', '0.6% of purchase price per year planning tax allowance, not an assessor record.');
  fill('insurance', (input.taxes ?? 0)+200, '$ / month', 'Monthly tax plus $200 insurance convention, not a quote.');
  fill('reno', input.rooms.length*3000+16000, '$ upfront', '$3,000 per proposed bedroom + $6,000 furnishing + $10,000 contingency only when no source budget; no geometry claim.');
  fill('otherIncome', 0, '$ / month', 'Assumed no other income; no unverified parking income.');
  fill('invoiceCredit', 0, '$ upfront credit', 'No verified credit assumed. Zero does not imply invoice authorization or approval.');
  input.expenses = input.expenses.map(expense => {
    if (expense.amount != null) { records.push({field:expense.name,kind:/estimated|allowance/i.test(expense.evidence)?'Estimated':'Source',value:expense.amount,units:expense.perRoom?'$ / bedroom / month':'$ / month',basis:expense.evidence}); return expense; }
    const pest = /pest/i.test(expense.name);
    const noLoan = /private.*money/i.test(expense.name);
    const hoa = /^HOA$/i.test(expense.name);
    const amount = pest ? 35 : noLoan || hoa ? 0 : /septic/i.test(expense.name) ? 50 : 100;
    const basis = pest ? 'Declared $35/month recurring preventive pest allowance ($420/year), no quote.' : noLoan ? 'Assumed no supplemental private financing; primary mortgage remains separate.' : hoa ? 'Assumed no HOA only because no source amount is available; verify association.' : /septic/i.test(expense.name) ? 'Declared $50/month septic maintenance allowance; applicability unverified.' : 'Declared $100/month planning allowance for an otherwise unspecified recurring cost, not a verified zero.';
    records.push({ field: expense.name, kind: 'Estimated', value: amount, units: '$ / month', basis });
    return { ...expense, amount, evidence: `Estimated: ${basis}` };
  });
  const loan = (input.price ?? 0)*(1-(input.downPercent ?? 0)/100);
  const debt = monthlyPayment(input.rate ?? 0,(input.termYears ?? 30)*12,loan);
  const carryNames = new Set(['Water','Gas','Electricity','Internet','Trash','HOA','Pest','Pest Control','Septic','Septic Service','Private money','Private Money Loan Payment']);
  const carry = (input.taxes ?? 0)+(input.insurance ?? 0)+(input.utilities ?? 0)+input.expenses.filter(e=>carryNames.has(e.name)).reduce((sum,e)=>sum+(e.amount ?? 0)*(e.perRoom?input.rooms.length:1),0);
  const holding = Math.round((debt+carry)*2*100)/100;
  fill('holding', holding, input.holding == null ? '$ upfront / 2 pre-lease months' : '$ upfront', `Assumed two months to renovate/lease: 2 × ($${debt.toFixed(2)} monthly mortgage P&I + $${carry.toFixed(2)} tax, insurance, utilities and applicable HOA/pest/septic/private carry). Upfront pre-lease cash only; stabilized monthly cash flow has no additional holding charge. Excludes renovation, closing, management, vacancy, repairs/reserve and furnishing to avoid double counting.`);
  input.rooms = input.rooms.map(room=>{
    if (room.rent != null) return room;
    const rent = input.serviceRent ?? 800;
    records.push({field:`${room.name} rent`,kind:'Estimated',value:rent,units:'$ / bedroom / month',basis:input.serviceRent == null?'Declared $800 planning bedroom rent, not a market quote.':'Available property per-bedroom rent estimate used where numbered source rent is blank.'});
    return {...room,rent};
  });
  input.capex = input.capex.map(item=>{ const absent=item.cost==null; records.push({field:item.name,kind:absent?'Estimated':'Source',value:item.cost??3000,units:'$ upfront',basis:absent?'Declared $3,000 planning allowance for a blank line item, not a verified scope.':'Preserved supplied budget line item, not a new allowance.'}); return absent?{...item,cost:3000}:item; });
  const insurance=records.find(r=>r.field==='insurance'); if(insurance && input.insuranceEstimate){insurance.kind='Estimated';insurance.basis='Preserved editable monthly tax + $200 insurance convention, not an insurance quote.';}
  const tax=records.find(r=>r.field==='taxes'); if(tax && input.taxLabel) tax.basis=input.taxLabel;
  const names: Record<string,string> = {price:'Purchase price',rate:'Mortgage rate',termYears:'Loan term',downPercent:'Down payment',closingCosts:'Closing costs',taxes:'Property tax',insurance:'Insurance',reno:'Upfront renovation',otherIncome:'Other income',invoiceCredit:'Invoice credit',holding:'Holding costs'};
  input.financialBasis = records.map(item=>({...item,label:names[item.field] ?? item.field}));
}
