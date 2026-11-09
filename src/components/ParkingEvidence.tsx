import { useState } from 'react';
import fraser from '@/assets/fraser-aerial-nov7.png.asset.json';
import grove from '@/assets/grove-aerial-nov7.png.asset.json';
import elmira from '@/assets/elmira-aerial-nov7.png.asset.json';
import { locationEvidence } from '@/lib/location-evidence';
const images: Record<string,{url:string}>={'6':fraser,'8':grove,'40':elmira};
export function ParkingEvidence({id}:{id:string}) {
  const evidence=locationEvidence[id];const image=images[id];
  const [open,setOpen]=useState(false);
  if(!evidence||!image) return null;
  return <figure aria-label="Human-inspected parking aerial" className="w-full">
    <div className="parking-aerial-frame relative w-full aspect-[1920/1072]" data-parking-aerial={id}>
      <img src={image.url} alt={`Authentic Google Maps aerial for ${id==='6'?'Fraser':id==='8'?'Grove':'Elmira'}, complete original attribution retained`} width={1920} height={1072} className="absolute inset-0 block h-full w-full object-contain"/>
      {evidence.cars.map((car,i)=><svg key={i} role="img" aria-label={`${car.kind==='street'?'Possible public curb':'Estimated driveway'} vehicle illustration, not verified capacity`} data-parking-car={id} viewBox={car.vertical?"0 0 14 30":"0 0 30 14"} className="absolute -translate-x-1/2 -translate-y-1/2 text-destructive" style={{left:`${car.x}%`,top:`${car.y}%`,width:`${car.vertical?car.width*14/30:car.width}%`,height:'auto'}}>
        <g transform={car.vertical?"translate(14 0) rotate(90)":undefined}><rect x="1" y="2" width="28" height="10" rx="3" fill={car.kind==='street'?'none':'currentColor'} stroke="currentColor" strokeWidth="1.5" strokeDasharray={car.kind==='street'?'3 2':undefined}/>
        <path d="M8 3h13v8H8z" fill="var(--hc-navy)"/><path d="M10 3h9v8h-9z" fill="currentColor"/>
        <path d="M2 4v6M28 4v6" stroke="var(--hc-amber)"/><text x="15" y="10" textAnchor="middle" fontSize="7" fill="var(--hc-amber)">{car.kind==='street'?'S':'D'}</text></g>
      </svg>)}
    </div>
    <figcaption className="mt-3 space-y-2 text-sm">
      <p className="font-bold text-hc-navy">Solid D: driveway/apron · dashed S: possible public curb</p>
      {id==='40' && <p>Research/report claimed 8 spaces (unverified). Illustrated: 2 observed + 2 tandem estimated on the paved pad, plus possible public curb — estimated positions, not verified capacity or legal proof.</p>}
      <div className="pt-1">
        <button type="button" aria-expanded={open} onClick={()=>setOpen(o=>!o)} className="rounded-lg border border-hc-border px-3 py-1.5 text-xs font-bold text-hc-blue transition hover:bg-muted">
          {open?'Hide explanation':'Show explanation'}
        </button>
        {open && <div className="mt-2 space-y-2">
          <p>{evidence.breakdown}</p>
          <p>Shared public curb, not reserved. Legal restrictions and total capacity unverified.</p>
          <p className="text-muted-foreground">Google attribution retained · aerial date unknown · parent StreetView {id==='8'?'Oct 2011 blurred, low confidence':'May 2026'}.</p>
          <p className="text-xs text-muted-foreground">{evidence.observation}</p>
        </div>}
        </div>
      <a className="font-semibold text-hc-blue underline" href={evidence.sourceUrl} target="_blank" rel="noreferrer">Google Maps source</a>
      <p className="text-xs text-muted-foreground">{evidence.provenance} · {evidence.latitude}, {evidence.longitude}</p>
    </figcaption>
  </figure>;
}
