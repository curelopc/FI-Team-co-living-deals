import { useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import type { ResearchDeal } from '@/lib/research';
import type { Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function DealsMap({ deals, activeId, onSelect }: { deals: ResearchDeal[]; activeId: string | null; onSelect: (id: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const navigate = useNavigate();
  const markers = useRef(new Map<string, HTMLElement>());
  const activeRef = useRef(activeId); activeRef.current = activeId;
  useEffect(() => { markers.current.forEach((element,id)=>element.classList.toggle('is-selected',id===activeId)); },[activeId]);
  useEffect(() => {
    let disposed = false;
    void import('leaflet').then(L => {
      if (disposed || !container.current) return;
      const map = L.map(container.current, { scrollWheelZoom: true, zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false }).setView([39.72, -104.95], 10);
      mapRef.current = map;
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors', maxZoom: 19 }).addTo(map);
      deals.forEach(d => {
        const label = d.displayPrice == null ? 'Active' : `$${Math.round(d.displayPrice / 1000)}k`;
        const marker = L.marker([d.latitude, d.longitude], { title: d.address, keyboard: true,
          icon: L.divIcon({ className: 'deal-map-pin', html: `<span>${label}</span>`, iconSize: [76, 32], iconAnchor: [38, 32] }) }).addTo(map);
        marker.on('click', () => onSelect(d.id));
        const element = marker.getElement();
        if (element) { markers.current.set(d.id, element); element.dataset['dealId'] = d.id; element.dataset['latitude']=String(d.latitude);element.dataset['longitude']=String(d.longitude);element.title=`${d.address}${d.coordinateProvenance ? ` · ${d.coordinateProvenance}` : ''}`; element.classList.toggle('is-selected', d.id === activeRef.current);  }
        marker.bindTooltip(d.address);
      });
      if (deals.length) map.fitBounds(L.latLngBounds(deals.map(d => [d.latitude, d.longitude] as [number, number])), { padding: [55, 55], maxZoom: 13 });
      map.invalidateSize();
    });
    return () => { disposed = true; mapRef.current?.stop(); mapRef.current?.remove(); mapRef.current = null; markers.current.clear(); };
  }, [deals, navigate, onSelect]);
  return <div ref={container} aria-label="Active deals map" className="h-[420px] w-full md:h-[650px]" />;
}
