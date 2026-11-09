import { elmiraBasementConcept } from './elmira-basement-concept';
import type { AnalysisRoom } from './underwriting';
/** Approved numbered drawing inventory, independent of financial/source reproduction. */
export function drawnRoomInventory(id: string, research?: Record<string, string>): Omit<AnalysisRoom, 'rent'>[] | null {
 const identities: Record<string, [string,string]> = {
  '6':['1BgaackKdZ4aXywzG4D4uFv3FSmY_V9GE','1DRH3TUnIqc66SeRfMYBsZQKW4RzGT-OI'],
  '8':['1i_FCqsuT7UazBo78gXiV2dNgttVtqFZS','1ng4zlQlQkPASHHg6E-qJL7UyNclRXEaE'],
  '40':['1XfAO8qr_te1wa14C-vaDvSd8f9LjNI2u','17Eyw1NrFHoZXM6tV8NAQnf9AqZOId8Tw'],
 };
 const identity=identities[id];
 // If live drawing headers are present, identity changes invalidate the approved inventory.
 if(identity && research && ('Floorplan Main' in research || 'Floorplan Basement' in research) &&
  (!research['Floorplan Main']?.includes(identity[0]) || !research['Floorplan Basement']?.includes(identity[1]))) return null;
 if(id==='40') return [
 ...elmiraBasementConcept.mainRooms.map(number=>({number,level:'Main',bath:number===1?'Primary-accessed ensuite (drawing evidence)':'Hall/shared',evidence:number<=3?'Existing bedroom on authentic main drawing':'Owner-approved conceptual conversion; common hall access'})),
 ...elmiraBasementConcept.rooms.map(room=>({number:room.number,level:'Basement',bath:'Hall/shared',evidence:`${room.access}; concept, not certified`})),
 ].map(room=>({...room,drawn:true,name:`Bedroom ${room.number}`}));
 if(id!=='6'&&id!=='8') return null;
 const fraser=id==='6';
 return Array.from({length:fraser?8:9},(_,i)=>{const number=i+1;return {number,drawn:true,name:`Bedroom ${number}`,
 level:fraser?number<=2?'Main':number<=5?'Upper':'Basement':number<=5?'Main':'Basement',
 bath:fraser?number===3?'Primary-accessed shower ensuite (drawing evidence)':number===6?'Bath access unclear':'Hall/shared':number===4?'Primary Bathroom ensuite (drawing evidence)':'Hall/shared',
 evidence:fraser?`Annotated proposed drawing bedroom ${number}; current drawing missing; not legal bedroom certification`:`Grove concept bedroom ${number} on matched current drawing (${[1,5,6,7].includes(number)?'proposed conversion, common-hall door gap':'existing bedroom'}); not legal bedroom certification`};});
}
