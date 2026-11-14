import { createFileRoute, Link, ClientOnly, useNavigate } from '@tanstack/react-router';
import { useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { lazy, Suspense, useMemo, useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { getDeals } from '@/lib/deals.functions';
import { dealsQuery } from '@/lib/deal-queries';
import { modelSummary } from '@/lib/deal-intake';
import { filterResearch, listingFacts } from '@/lib/research';
import { locationEvidence } from '@/lib/location-evidence';
import { parseMlsPhotos } from '@/lib/mls-photos';
import { MlsPhotoCarousel } from '@/components/MlsPhotoCarousel';
import { Shell } from '@/components/Shell';
import { Button } from '@/components/ui/button';

import { useAnalysisSession } from '@/components/AnalysisSession';
import { publishedMetrics } from '@/lib/daily-deals';

const DealsMap = lazy(() => import('@/components/DealsMap'));
export const Route = createFileRoute('/')({
  head: () => ({ meta: [
    { title: 'Denver Co-Living Deals | The FI Team' },
    { name: 'description', content: 'Active Denver-area acquisition listings and map from The FI Team.' },
    { property: 'og:title', content: 'Denver Co-Living Deals | The FI Team' },
    { property: 'og:description', content: 'Active acquisition listings with session-only co-living analysis from The FI Team.' },
    { name: 'robots', content: 'noindex' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }), loader:({context})=>context.queryClient.ensureQueryData(dealsQuery()), errorComponent:()=> <p>Could not load deals.</p>, notFoundComponent:()=> <p>Deals not found.</p>, component: DealsPage,
});
const dollars = (n: number | null) => n == null ? 'Unavailable' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
const cents = (n: number | null) => n == null ? 'Unavailable' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const inputClass = 'mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm';
function DealsPage() {
  const session = useAnalysisSession();
  const fetchDeals = useServerFn(getDeals);
  const { data, isFetching } = useSuspenseQuery(dealsQuery());
  const cache=useQueryClient(); const navigate=useNavigate();
  const refetch=async()=>{setRefreshing(true);setRefreshError('');try{const fresh=await fetchDeals({data:{refresh:true}});cache.setQueryData(['deals'],fresh);Object.entries(fresh.bundles).forEach(([id,bundle])=>cache.setQueryData(['deal',id],bundle));}catch{setRefreshError('Could not refresh listings. Try again.');}finally{setRefreshing(false);}};
  const open=useCallback((id:string)=>{const bundle=data.bundles[id];if(bundle)cache.setQueryData(['deal',id],bundle);void navigate({to:'/deal/$dealId',params:{dealId:id}});},[data,cache,navigate]);
  const [priceMin, setPriceMin] = useState(''); const [priceMax, setPriceMax] = useState('');
  const [refreshing,setRefreshing]=useState(false);const [refreshError,setRefreshError]=useState('');
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [minRooms, setMinRooms] = useState(''); const [city, setCity] = useState('');
  const rows = useMemo(() => filterResearch(data?.deals ?? [], { priceMin: priceMin === '' ? null : Number(priceMin), priceMax: priceMax === '' ? null : Number(priceMax), minRooms: null, city }).filter(d => minRooms === '' || (session.inputs[d.id] ?? data.analyses[d.id]?.inputs)?.rooms.length != null && ((session.inputs[d.id] ?? data.analyses[d.id]?.inputs)?.rooms.length ?? 0) >= Number(minRooms)), [data, priceMin, priceMax, minRooms, city, session.inputs]);
  const cities = [...new Set(data?.deals.map(d => d.city) ?? [])].sort();
  const pendingCount = data?.deals.filter(deal => (deal.cells['listing_status'] ?? '').toUpperCase() === 'PENDING').length ?? 0;
  const listedCount = data?.deals.length ?? 0;
  return <Shell><div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="mb-2 text-xs font-bold uppercase text-hc-blue">FI Team acquisition</p><h1 className="text-3xl font-extrabold text-hc-navy">Denver co-living deals</h1><p className="mt-2 text-sm text-muted-foreground">{pendingCount ? `${listedCount - pendingCount} active properties · ${pendingCount} pending` : `${listedCount} active properties`}</p></div><Button variant="outline" disabled={isFetching||refreshing} onClick={() => void refetch()}><RefreshCw className={isFetching||refreshing ? 'animate-spin' : ''} />Refresh</Button></div>
    <div className="mb-6 grid gap-3 border-y border-border py-4 sm:grid-cols-4"><label className="text-xs font-semibold">Price min<input type="number" min="0" className={inputClass} value={priceMin} onChange={e => setPriceMin(e.target.value)} placeholder="Any" /></label><label className="text-xs font-semibold">Price max<input type="number" min="0" className={inputClass} value={priceMax} onChange={e => setPriceMax(e.target.value)} placeholder="Any" /></label><label className="text-xs font-semibold">Min rooms<input type="number" min="0" className={inputClass} value={minRooms} onChange={e => setMinRooms(e.target.value)} placeholder="Any" /></label><label className="text-xs font-semibold">City<select className={inputClass} value={city} onChange={e => setCity(e.target.value)}><option value="">All cities</option>{cities.map(c => <option key={c}>{c}</option>)}</select></label></div>
    {refreshError&&<p role="alert">{refreshError}</p>}{<div className="grid items-start gap-6 lg:grid-cols-[1.1fr_1fr]">
      <div><p className="mb-3 text-sm text-muted-foreground">{rows.length} matching properties</p><div className="grid gap-3">{rows.map(d => {
        const seed = data?.analyses[d.id]; const inputs = session.inputs[d.id] ?? seed?.inputs; const result = inputs ? modelSummary(inputs, seed?.inputs ?? inputs) : null; const facts = listingFacts(d.cells,inputs?.rooms.length ?? 0); const metrics = publishedMetrics(d.id);
        return <article key={d.id} data-deal-id={d.id} tabIndex={0} aria-label={`Open ${d.address}`} onClick={e=>{if(!(e.target instanceof Element)||e.target.closest('button,a,[data-card-control]'))return;open(d.id);}} onKeyDown={e=>{if(e.target===e.currentTarget&&e.key==='Enter'){e.preventDefault();open(d.id);}}} onMouseEnter={()=>{setHighlighted(d.id);if(data.bundles[d.id])cache.setQueryData(['deal',d.id],data.bundles[d.id]);}} onMouseLeave={()=>setHighlighted(null)} onFocusCapture={()=>setHighlighted(d.id)} onBlurCapture={e=>{if (!e.currentTarget.contains(e.relatedTarget)) setHighlighted(null);}} className={`grid min-w-0 overflow-hidden rounded-lg border bg-card sm:grid-cols-[190px_1fr] ${highlighted === d.id ? 'border-hc-amber ring-1 ring-hc-amber' : 'border-border'}`}>
          <div className="min-w-0"><MlsPhotoCarousel photos={parseMlsPhotos(d.cells)} address={d.address} dealId={d.id} /></div>
          <div className="min-w-0 p-3"><Link to="/deal/$dealId" params={{dealId:d.id}} className="block"><div className="flex items-center justify-between"><p className="text-xl font-extrabold text-hc-navy">{dollars(d.displayPrice)}</p><span className={`text-xs font-bold ${(d.cells['listing_status'] ?? '').toUpperCase() === 'PENDING' ? 'text-hc-navy' : 'text-hc-pursue'}`}>{(d.cells['listing_status'] ?? '').toUpperCase() === 'PENDING' ? 'Pending · Active Under Contract, unconfirmed' : 'Active'}</span></div><h2 className="mt-1 text-sm font-bold text-hc-navy">{d.address}</h2><p className="mt-1 text-xs text-muted-foreground">{facts.sqft?.toLocaleString('en-US') ?? 'Unverified'} sq ft · {d.city}</p><p className="mt-1 text-xs">Current {facts.currentBeds ?? 'Unverified'} bd · {facts.currentBaths ?? 'Unverified'} ba</p><p className="mt-1 text-xs font-semibold">Future {facts.futureBeds} bd · {facts.futureBaths ?? 'Unverified'} ba · proposed</p></Link>
          <p className="mt-2 text-xs">CoLivingPro estimated rent (furnished; private rate for en-suite rooms, shared for others) <strong>{d.cells['clp_status']==='rent not found' ? 'CoLivingPro rent not found' : cents(result?.grossRent ?? null)}</strong></p>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-xs"><div><dt>Cash flow / mo</dt><dd className="mt-1 font-bold">{result?.monthlyCashFlow==null?'':cents(result.monthlyCashFlow)}</dd></div><div><dt>CoC</dt><dd className="mt-1 font-bold">{result?.cocPercent==null?'':`${result.cocPercent.toFixed(1)}%`}</dd></div><div><dt>Cash invested</dt><dd className="mt-1 font-bold">{cents(result?.cashInvested ?? null)}</dd></div></dl>
          {metrics && <dl className="mt-2 grid grid-cols-3 gap-2 text-xs"><div><dt>Cap rate</dt><dd className="mt-1 font-bold">{metrics.capRate==null?'':`${metrics.capRate.toFixed(2)}%`}</dd></div><div><dt>DSCR</dt><dd className="mt-1 font-bold" title="Debt service coverage ratio">{metrics.dscr==null?'':metrics.dscr.toFixed(2)}</dd></div><div><dt>All-in</dt><dd className="mt-1 font-bold">{cents(metrics.allIn)}</dd></div></dl>}
          {metrics && <p className="mt-2 text-xs text-muted-foreground">{cents(metrics.pricePerSqft)} / sq ft · 8% CoC {cents(metrics.priceFor8)} · 12% CoC {cents(metrics.priceFor12)} · cash flow zero {cents(metrics.priceForCashFlowZero)}</p>}
          {result && <p className="mt-2 text-xs text-muted-foreground">{result.missing.length ? `Returns unavailable · ${result.missing[0]}` : 'Estimated'}</p>}
          </div>
        </article>;
      })}</div>{rows.length === 0 && <p className="py-10 text-muted-foreground">No active deals match these filters.</p>}</div>
      <aside className="overflow-hidden rounded-lg border border-border lg:sticky lg:top-5"><ClientOnly fallback={<div className="h-[420px] bg-hc-page" />}><Suspense fallback={<div className="h-[420px] bg-hc-page" />}><DealsMap deals={rows} activeId={highlighted} onSelect={open} /></Suspense></ClientOnly><p className="border-t border-border bg-card p-3 text-xs text-muted-foreground">{locationEvidence['6']?.provenance}</p></aside>
    </div>}
  </Shell>;
}
