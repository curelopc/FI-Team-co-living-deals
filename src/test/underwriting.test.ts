import { describe, it, expect } from 'vitest';
import { seedAnalysis, calculateAnalysis, latestDeals, latestRooms, capexLines, addRoom, removeRoom } from '../lib/underwriting';
const rows = (obj: Record<string,string>) => Object.entries(obj);
const source = rows({ 'Annual Interest Rate':'7.5%', 'Loan Term (Years)':'30', 'Downpayment Percentage':'20%', 'Estimated Closing Costs':'14482', 'Estimated CoLiving Renovation':'44500', 'Temp. Holding Cost':'0', 'Invoice Authorization':'0', 'Annual Vacancy':'5%', 'Home Owners Insurance':'280.5', 'Property Tax':'280.5', 'Maint. & Security Fee by PMC':'', 'Private Money Loan Payment':'0', 'Septic Service':'0', 'Pest Control':'0', 'Trash':'70', 'Sewer & Water':'180', 'Gas':'90', 'Electricity':'450', 'Internet':'100', 'Lawn Care':'80', 'Cleaning':'150', 'Capital Improvments Budget':'250', 'Misc. Repairs':'250', 'HOA':'0', '10 Day PadSlpit Fee (Caltd. Monthly)':'0' });
const rooms = Array.from({length:9},(_,i)=>({rowNumber:i+2,cells:{Room:`Room ${i+1}`, 'Rent/mo':i===0?'950':'750'}}));
const elmira = ()=>seedAnalysis({Price:'724100', 'Cash Flow/mo':'-740.91','Cash-on-Cash':'-0.0436253'},rooms,[],{},source);
describe('canonical Elmira source comparison',()=>{
 it('matches all canonical source numbers without inventing Maint/security zero',()=>{
  const seed=elmira();const r=calculateAnalysis(seed.inputs);
  expect(r.grossRent).toBe(6950);expect(r.management).toBe(1112);expect(r.vacancy).toBe(347.5);
  expect(r.downPayment).toBe(144820);expect(r.loan).toBe(579280);expect(r.cashInvested).toBe(203802);expect(r.capexTotal).toBe(44500);
  expect(r.principalInterest).toBeCloseTo(4050.409817,4);expect(r.knownOperatingExpenses).toBe(3640.5);
  expect(r.sourceComparableCashFlow).toBeCloseTo(-740.909817,4);expect(r.sourceComparableCoc).toBeCloseTo(-4.3625273,6);
  expect((6950-r.knownOperatingExpenses)*12).toBe(39714);
  expect(r.sourceComparableCashFlow != null ? r.sourceComparableCashFlow*12 : null).toBeCloseTo(-8890.9178,3);
  expect(r.monthlyCashFlow).toBeNull();expect(r.missing).toEqual(['Maint. & Security Fee by PMC']);
 });
 it('separates reserve from renovation and calculates complete returns after an explicit session value',()=>{
  const input=elmira().inputs; input.expenses=input.expenses.map(e=>({...e,amount:e.amount??0}));
  const r=calculateAnalysis(input);expect(r.monthlyCashFlow).toBeCloseTo(-740.909817,4);
  const changed=structuredClone(input);changed.expenses=changed.expenses.map(e=>e.name==='Monthly CapEx reserve'?{...e,amount:500}:e);
  const c=calculateAnalysis(changed);expect(c.cashInvested).toBe(203802);expect(c.monthlyCashFlow).toBeCloseTo(-990.909817,4);
 });
});
describe('duplicate source protection',()=>{
 it('selects corrected Elmira row not stale first row',()=>{expect(latestDeals([{rowNumber:9,cells:{'Deal ID':'DEN-20261105-01','Cash Flow/mo':'-579.91'}},{rowNumber:10,cells:{'Deal ID':'DEN-20261105-01','Cash Flow/mo':'-740.91'}}])[0]?.cells['Cash Flow/mo']).toBe('-740.91');});
 it('selects latest per numeric room despite changed room labels',()=>{const old=rooms.map(r=>({...r,cells:{...r.cells,Room:r.cells.Room+' stale'}}));const updated=rooms.map(r=>({...r,rowNumber:r.rowNumber+9,cells:{...r.cells,Room:r.cells.Room+' corrected'}}));const unique=latestRooms([...old,...updated]);expect(unique).toHaveLength(9);expect(unique[0]?.cells['Room']).toBe('Room 1 corrected');expect(unique.reduce((s,r)=>s+Number(r.cells['Rent/mo']),0)).toBe(6950);});
 it('excludes TOTAL CAPEX from real line items',()=>{const lines=capexLines([{rowNumber:2,cells:{Item:'Conversion',Cost:'38500'}},{rowNumber:3,cells:{Item:'Furnishings',Cost:'6000'}},{rowNumber:4,cells:{Item:'TOTAL CAPEX',Cost:'44500'}}]);expect(lines).toHaveLength(2);expect(lines.reduce((s,r)=>s+Number(r.cells['Cost']),0)).toBe(44500);});
});
describe('room limits and session Reset',()=>{
 it('supports 16 rents and refuses a 17th, removes down to 1 and restores cloned seed',()=>{const seed=elmira();let input=structuredClone(seed.inputs);while(input.rooms.length<16)input=addRoom(input);expect(addRoom(input)).toBe(input);input.rooms=input.rooms.map(r=>({...r,rent:750}));expect(calculateAnalysis(input).grossRent).toBe(12000);while(input.rooms.length>1)input=removeRoom(input,0);expect(removeRoom(input,0)).toBe(input);input=structuredClone(seed.inputs);expect(input).toEqual(seed.inputs);expect(input.rooms).toHaveLength(9);});
});
describe('all-three card/detail shared seed parity',()=>{
 it.each(['6','8','40'])('uses the identical pure seed for %s and source compare',id=>{
  const research = id==='6'?{converted_beds:'8',coliving_pro_rent_per_room:'770',property_report_url:'https://drive.google.com/file/d/1qzFeYBe00iBzZYRPssvQPw9r9y0BmqBZ/view'}:id==='8'?{converted_beds:'7',coliving_pro_rent_per_room:'830',property_report_url:'https://drive.google.com/file/d/1nerAZNgXruEliTuS9j1KbrJeHRxDGouk/view'}:{};
  const seed=id==='40'?elmira():seedAnalysis({Price:id==='6'?'525000':'534999'},[],[],research);
  expect(calculateAnalysis(structuredClone(seed.inputs))).toEqual(calculateAnalysis(seed.inputs));
  if(id==='6'){expect(seed.sourceCashFlow).toBe(3384);expect(seed.inputs.reno).toBe(24300);expect(seed.inputs.rooms).toHaveLength(8);expect(calculateAnalysis(seed.inputs).grossRent).toBe(6160);}
  if(id==='8'){expect(seed.sourceCashFlow).toBe(2243);expect(seed.inputs.downPercent).toBe(6.5);expect(seed.inputs.reno).toBe(16300);expect(calculateAnalysis(seed.inputs).grossRent).toBe(5810);}
 });
});
