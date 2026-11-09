import { useState } from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { AnalysisEditor } from '../components/AnalysisEditor';
import { seedAnalysis, calculateAnalysis } from '../lib/underwriting';
afterEach(cleanup);
it('enforces 16 rooms in the actual editor and Reset restores every original field',()=>{
 const seed=seedAnalysis({Price:'724100'},[],[],{converted_beds:'9',coliving_pro_rent_per_room:'750'});
 function Harness(){const [value,setValue]=useState(()=>structuredClone(seed.inputs));return <AnalysisEditor seed={seed} value={value} onChange={setValue} onReset={()=>setValue(structuredClone(seed.inputs))}/>;}
 render(<Harness/>);
 for(let i=0;i<7;i++)fireEvent.click(screen.getByRole('button',{name:'Add room'}));
 expect(screen.getByRole('button',{name:'Add room'})).toBeDisabled();
 fireEvent.change(screen.getByRole('spinbutton',{name:'Modeled room 16 rent'}),{target:{value:'1000'}});
 fireEvent.change(screen.getByRole('spinbutton',{name:'Rate %'}),{target:{value:'6'}});
 fireEvent.click(screen.getByRole('button',{name:'Reset to original'}));
 expect(screen.queryByRole('spinbutton',{name:'Modeled room 16 rent'})).not.toBeInTheDocument();
 expect(screen.getByRole('spinbutton',{name:'Rate %'})).toHaveValue(null);
 expect(screen.getByRole('spinbutton',{name:'Room 1 rent'})).toHaveValue(750);
 expect(screen.getByRole('spinbutton',{name:'Purchase price $'})).toHaveValue(724100);
});
it('retains negative5 visibly, explains the error, blocks return math and Reset restores rent',()=>{
 const seed=seedAnalysis({Price:'724100'},[],[],{converted_beds:'9',coliving_pro_rent_per_room:'750'});
 function Harness(){const[value,setValue]=useState(()=>structuredClone(seed.inputs));return <><AnalysisEditor seed={seed} value={value} onChange={setValue} onReset={()=>setValue(structuredClone(seed.inputs))}/><output aria-label="Gross rent result">{String(calculateAnalysis(value).grossRent)}</output></>;}
 render(<Harness/>);
 fireEvent.change(screen.getByRole('spinbutton',{name:'Room 1 rent'}),{target:{value:'-5'}});
 expect(screen.getByRole('spinbutton',{name:'Room 1 rent'})).toHaveValue(-5);
 expect(screen.getByRole('spinbutton',{name:'Room 1 rent'})).toHaveAttribute('aria-invalid','true');
 expect(screen.getByRole('alert')).toBeInTheDocument();
 expect(screen.getByLabelText('Gross rent result')).toHaveTextContent('null');
 const invalid=structuredClone(seed.inputs);invalid.rooms[0]={name:'Room 1',rent:-5,level:'Main',bath:'Shared'};
 expect(calculateAnalysis(invalid).sourceComparableCashFlow).toBeNull();
 expect(calculateAnalysis(invalid).monthlyCashFlow).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Reset to original'}));
 expect(screen.getByRole('spinbutton',{name:'Room 1 rent'})).toHaveValue(750);
 expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
