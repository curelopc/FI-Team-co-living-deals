import { expect, it } from 'vitest';
import { standardScenario } from '../lib/standard-scenario';
import { seedAnalysis, addRoom, calculateAnalysis } from '../lib/underwriting';
import { modelSummary, validateProposal, type ProposalInventory } from '../lib/deal-intake';
const proposal: ProposalInventory = { source: 'https://example.com/authentic-plan', rooms: [
  { number: 1, name: 'Bedroom 1', level: 'Main', bath: 'Hall/shared', evidence: 'Authentic numbered proposal enclosure' },
  { number: 2, name: 'Bedroom 2', level: 'Basement', bath: 'Access unverified', evidence: 'Authentic numbered proposal, common hall candidate' },
] };
const research = { id: 'future-101', converted_beds: '10', coliving_pro_rent_per_room: '900' };
it('future listing ten never invents ten default rooms without a proposal', () => {
  const v = standardScenario(seedAnalysis({}, [], [], research), research).inputs;
  expect(v.rooms).toHaveLength(0);expect(modelSummary(v).status).toBe('Needs review');expect(modelSummary(v).grossRent).toBeNull();expect(modelSummary(v).cocPercent).toBeNull();
});
it('authentic numbered proposal defines default count and property estimate, not listing count', () => {
  const v = standardScenario(seedAnalysis({}, [], [], research), research, proposal).inputs;
  expect(v.rooms).toHaveLength(2);expect(v.rooms.map(r=>r.level)).toEqual(['Main','Basement']);expect(modelSummary(v).drawnCount).toBe(2);expect(modelSummary(v).grossRent).toBe(1800);
  const extra = addRoom(v);expect(extra.rooms[2]?.drawn).toBe(false);expect(extra.rooms[2]?.name).toBe('Scenario room 3 (not drawn)');expect(modelSummary(extra).drawnCount).toBe(2);
});
it('future proposal without rents uses a declared editable planning estimate', () => {
  const v = standardScenario(seedAnalysis({}, [], []), { id: 'future-102' }, proposal).inputs;
  expect(v.rooms.map(r=>r.rent)).toEqual([800,800]);expect(modelSummary(v).grossRent).toBe(1600);expect(v.financialBasis?.find(b=>b.field==='Bedroom 1 rent')?.kind).toBe('Estimated');
});
it('rejects duplicate room numbers or unreviewed level rather than counting them',()=>{
  expect(validateProposal({...proposal,rooms:[proposal.rooms[0],proposal.rooms[0]].filter(r=>r!==undefined)})).toBeNull();
  expect(validateProposal({...proposal,rooms:proposal.rooms.map(r=>({...r,level:'Unclear'}))})).toBeNull();
});
it('future defaults use exact factors, fixed150 and separate80 income without PadSplit',()=>{
  const v=standardScenario(seedAnalysis({},[],[]),research,proposal).inputs;
  expect(v.expenses.filter(e=>e.perRoom).map(e=>[e.name,e.amount])).toEqual([['Water',20],['Gas',10],['Electricity',50]]);
  for(const [name,amount] of [['Internet',100],['Trash',70],['Cleaning',150],['Lawn care',80],['Repairs / maintenance',250],['Monthly CapEx reserve',250],['Maintenance / security',150]]) expect(v.expenses.find(e=>e.name===name)?.amount).toBe(amount);
  expect(v.expenses.some(e=>/pad/i.test(e.name))).toBe(false);expect(v.tenantUtilityFee).toBe(80);expect(v.managementPercent).toBe(16);expect(v.managementBase).toBe('gross');expect(v.vacancyPercent).toBe(5);
});
it('actual source expense and insurance win over future estimates; debt and budget remain intact',()=>{
  const seed=seedAnalysis({Price:'400000',Rate:'6', 'Loan Term (Years)':'30','Down Payment':'80000','Insurance/mo':'175','Property Tax/mo':'300','CapEx Total':'21000'},[],[]);
  seed.inputs.expenses=[{name:'Cleaning',amount:220,evidence:'Actual property source input'},{name:'Water',amount:45,evidence:'Actual monthly source input'},{name:'PadSplit service fee',amount:999,evidence:'Actual source input'}];
  const v=standardScenario(seed,research,proposal).inputs;
  expect(v.insurance).toBe(175);expect(v.insuranceEstimate).toBe(false);expect(v.expenses.find(e=>e.name==='Cleaning')?.amount).toBe(220);expect(v.expenses.find(e=>e.name==='Water')?.amount).toBe(45);expect(v.expenses.find(e=>e.name==='Water')?.perRoom).toBeUndefined();expect(v.rate).toBe(6);expect(v.reno).toBe(21000);expect(v.expenses.some(e=>/pad/i.test(e.name))).toBe(false);
});
it('missing financing never becomes final returns; complete generic inputs yield matching summaries',()=>{
  const seed=seedAnalysis({},[],[]);const v=standardScenario(seed,research,proposal).inputs;
  expect(modelSummary(v).cashInvested).toBeGreaterThan(0);expect(modelSummary(v).cocPercent).not.toBeNull();expect(v.financialBasis?.find(b=>b.field==='rate')?.kind).toBe('Estimated');
  Object.assign(v,{price:400000,rate:6,termYears:30,downPercent:20,closingCosts:10000,reno:21000,holding:0,invoiceCredit:0,otherIncome:0,taxes:300,insurance:500});v.expenses=v.expenses.filter(e=>e.amount!==null);
  const home=modelSummary(v),detail=modelSummary(structuredClone(v));expect(home).toEqual(detail);expect(home.grossRent).toBe(1800);expect(home.cashInvested).toBe(111000);expect(home.monthlyCashFlow).toBe(calculateAnalysis(v).monthlyCashFlow);
  v.rooms[0]={...v.rooms[0],name:'Bedroom 1',level:'Main',bath:'Hall/shared',rent:-1};expect(modelSummary(v).provisionalCashFlow).toBeNull();
});
it('changed current drawing identity invalidates inventory instead of reusing property-ID facts',()=>{
 const v=standardScenario(seedAnalysis({},[],[],{converted_beds:'8'}),{id:'6','Floorplan Main':'https://example.com/replaced-plan','Floorplan Basement':''}).inputs;
 expect(v.rooms).toHaveLength(0);expect(modelSummary(v).drawnCount).toBeNull();
});
it('blank numbered source rent uses property estimate without rewriting source',()=>{
 const seed=seedAnalysis({},[{rowNumber:2,cells:{Room:'Room 1','Rent/mo':'',Level:'Main',Bath:'Shared'}}],[]);
 const v=standardScenario(seed,research,proposal).inputs;expect(v.rooms[0]?.rent).toBe(900);expect(v.rooms[1]?.rent).toBe(900);expect(modelSummary(v).grossRent).toBe(1800);expect(seed.inputs.rooms[0]?.rent).toBeNull();
});
it('drawn proposal count remains stable when session scenario removes a row, Reset clones baseline',()=>{
 const seed=standardScenario(seedAnalysis({},[],[]),research,proposal);const original=structuredClone(seed.inputs);const edited={...original,rooms:original.rooms.slice(0,1)};
 expect(modelSummary(edited,seed.inputs).drawnCount).toBe(2);expect(modelSummary(edited,seed.inputs).roomCount).toBe(1);expect(modelSummary(structuredClone(seed.inputs)).grossRent).toBe(1800);
});
