import { afterEach, expect, it } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { useState } from 'react';
import { AnalysisSessionProvider, useAnalysisSession } from '../components/AnalysisSession';
import { drawnRoomInventory } from '../lib/room-inventory';
import { elmiraBasementConcept } from '../lib/elmira-basement-concept';
import { standardScenario } from '../lib/standard-scenario';
import { seedAnalysis, calculateAnalysis, addRoom, removeRoom } from '../lib/underwriting';
afterEach(cleanup);
const seed = () => standardScenario(seedAnalysis({Price:'724100'},[],[],{}),{id:'40'});
it.each([['6',8,['Main','Main','Upper','Upper','Upper','Basement','Basement','Basement']],['8',9,['Main','Main','Main','Main','Main','Basement','Basement','Basement','Basement']],['40',11,['Main','Main','Main','Main','Main','Main','Basement','Basement','Basement','Basement','Basement']]])('aligns %s numbered drawn rooms and evidence levels', (id,count,levels)=>{
 const rows=drawnRoomInventory(String(id));expect(rows?.map(r=>r.number)).toEqual(Array.from({length:Number(count)},(_,i)=>i+1));expect(rows?.map(r=>r.level)).toEqual(levels);
 const value=standardScenario(seedAnalysis({},[],[],{}),{id:String(id),coliving_pro_rent_per_room:id==='6'?'770':'830'}).inputs;
 expect(value.rooms).toHaveLength(Number(count));expect(value.rooms.map(r=>r.number)).toEqual(rows?.map(r=>r.number));
 expect(calculateAnalysis(value).grossRent).toBe(id==='40'?7530:id==='6'?6160:7470);
 if(id==='8') expect(value.rooms.every(room=>room.rent===830)).toBe(true);
});
it('Elmira eleven drawn rows have primary830 and ten shared670, same IDs as both drawings',()=>{
 const v=seed().inputs;expect(v.rooms.map(r=>r.number)).toEqual([...elmiraBasementConcept.mainRooms,...elmiraBasementConcept.rooms.map(r=>r.number)]);
 expect(v.rooms[0]?.rent).toBe(830);expect(v.rooms.slice(1).map(r=>r.rent)).toEqual(Array(10).fill(670));expect(v.rooms.slice(1).every(r=>r.bath==='Hall/shared')).toBe(true);
});
it('10/11/16 active scenarios recalculate utilities, fees, vacancy and management without CapEx additions',()=>{
 const base=seed().inputs;let v=removeRoom(base,10);
 for(const count of [10,11,16]){
  while(v.rooms.length<count)v=addRoom(v);
  const r=calculateAnalysis({...v,otherIncome:0});const gross=830+(count-1)*670+count*80;
  expect(r.grossIncome).toBe(gross);expect(r.management).toBeCloseTo(gross*.16);expect(r.vacancy).toBeCloseTo(gross*.05);
  expect(v.expenses.filter(e=>['Water','Gas','Electricity','Internet','Trash'].includes(e.name)).reduce((n,e)=>n+(e.amount??0)*(e.perRoom?count:1),0)).toBe(count*80+170);
  expect(v.expenses.find(e=>e.name==='Maintenance / security')?.amount).toBe(150);expect(v.reno).toBe(base.reno);expect(v.capex).toEqual(base.capex);
 }
 expect(v.rooms.filter(r=>r.drawn===false).every(r=>r.name.includes('not drawn'))).toBe(true);
});
it('root session shares edit/home/back metrics, Reset restores eleven and isolates other deals and visitors',()=>{
 const original=seed().inputs;
 function Views(){const session=useAnalysisSession();const[page,setPage]=useState('detail');const v=session.inputs['40']??original;const result=calculateAnalysis(v);return <><output aria-label="page">{page}</output><output aria-label="rent">{result.grossRent}</output><output aria-label="count">{v.rooms.length}</output><output aria-label="other">{session.inputs['6']?.rooms.length??8}</output><button onClick={()=>session.update('40',{...v,rooms:v.rooms.map((r,i)=>i===10?{...r,rent:900}:r)} )}>Edit</button><button onClick={()=>setPage('home')}>Home</button><button onClick={()=>setPage('detail')}>Back</button><button onClick={()=>session.update('40',original)}>Reset</button></>;}
 render(<AnalysisSessionProvider><Views/></AnalysisSessionProvider>);fireEvent.click(screen.getByText('Edit'));expect(screen.getByLabelText('rent')).toHaveTextContent('7760');fireEvent.click(screen.getByText('Home'));expect(screen.getByLabelText('rent')).toHaveTextContent('7760');fireEvent.click(screen.getByText('Back'));expect(screen.getByLabelText('rent')).toHaveTextContent('7760');expect(screen.getByLabelText('other')).toHaveTextContent('8');fireEvent.click(screen.getByText('Reset'));expect(screen.getByLabelText('rent')).toHaveTextContent('7530');expect(screen.getByLabelText('count')).toHaveTextContent('11');cleanup();render(<AnalysisSessionProvider><Views/></AnalysisSessionProvider>);expect(screen.getByLabelText('rent')).toHaveTextContent('7530');
});
it('generic future proposal session edits share model across views and Reset restores evidence rows',()=>{
 const original=standardScenario(seedAnalysis({},[],[]),{id:'future',coliving_pro_rent_per_room:'900'},{source:'https://example.com/plan',rooms:[{number:1,name:'Bedroom 1',level:'Main',bath:'Unverified',evidence:'Numbered source proposal'},{number:2,name:'Bedroom 2',level:'Basement',bath:'Shared',evidence:'Numbered source proposal'}]}).inputs;
 function Future(){const s=useAnalysisSession();const v=s.inputs['future']??original;const [view,setView]=useState('detail');return <><output aria-label="future rent">{calculateAnalysis(v).grossRent}</output><output aria-label="future view">{view}</output><button onClick={()=>s.update('future',{...v,rooms:v.rooms.map((r,i)=>i===1?{...r,rent:1100}:r)})}>Future edit</button><button onClick={()=>setView('home')}>Future home</button><button onClick={()=>setView('detail')}>Future back</button><button onClick={()=>s.update('future',original)}>Future reset</button></>;}
 render(<AnalysisSessionProvider><Future/></AnalysisSessionProvider>);fireEvent.click(screen.getByText('Future edit'));expect(screen.getByLabelText('future rent')).toHaveTextContent('2000');fireEvent.click(screen.getByText('Future home'));expect(screen.getByLabelText('future rent')).toHaveTextContent('2000');fireEvent.click(screen.getByText('Future back'));expect(screen.getByLabelText('future rent')).toHaveTextContent('2000');fireEvent.click(screen.getByText('Future reset'));expect(screen.getByLabelText('future rent')).toHaveTextContent('1800');expect(original.rooms[1]?.rent).toBe(900);
});
