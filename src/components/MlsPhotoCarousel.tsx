import { useCallback, useEffect, useState, type MouseEvent, useRef } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { Link } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { elmiraAuthorizedFrontFallback, listingPhotoFallbacks } from '@/lib/listing-photo-evidence';

interface Props { photos: string[]; address: string; dealId?: string; researchId?: string; prominent?: boolean }

export function MlsPhotoCarousel(props: Props) {
  // Reset failed URLs and the selected slide whenever the source photos change.
  return <PhotoSlides key={props.photos.join('|')} {...props} />;
}

function PhotoSlides({ photos, address, dealId, researchId, prominent = false }: Props) {
  const [failed, setFailed] = useState<string[]>([]);
  const live = photos.filter(url => !failed.includes(url));
  const fallback = listingPhotoFallbacks(researchId ?? dealId).filter(url => !failed.includes(url));
  const authorizedFront = (researchId ?? dealId) === '40' && !failed.includes(elmiraAuthorizedFrontFallback) ? [elmiraAuthorizedFrontFallback] : [];
  const sanctioned = (researchId ?? dealId) === '40' && photos.some(url=>url.includes('Key=2057739304'));
  const available = sanctioned ? fallback.length ? fallback : authorizedFront : live.length ? live : fallback.length ? fallback : authorizedFront;
  const down = useRef<{x:number;y:number}|null>(null);
  const dragged = useRef(false);
  const [viewport, api] = useEmblaCarousel({ loop: true, watchDrag: available.length > 1 });
  const [selected, setSelected] = useState(0);
  const current = Math.min(selected, Math.max(0, available.length - 1));
  const sync = useCallback(() => setSelected(api?.selectedScrollSnap() ?? 0), [api]);
  useEffect(() => {
    if (!api) return;
    sync();
    api.on('select', sync).on('reInit', sync);
    return () => { api.off('select', sync).off('reInit', sync); };
  }, [api, sync]);
  const control = (event: MouseEvent, action: () => void) => {
    event.preventDefault();
    event.stopPropagation();
    action();
  };
  const frame = cn('w-full', prominent ? 'aspect-[16/9] max-h-[560px]' : 'aspect-[16/10]');
  if (!available.length) return <div className={cn(frame, 'flex flex-col items-center justify-center gap-2 bg-hc-page text-sm text-muted-foreground')}><svg aria-hidden="true" viewBox="0 0 64 40" className="h-10 w-16 text-hc-navy/30"><rect x="1" y="1" width="62" height="38" rx="4" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M8 30 L22 16 L32 26 L42 14 L56 30" fill="none" stroke="currentColor" strokeWidth="2" /></svg><span className="inline-flex items-center gap-2"><ImageOff className="h-5 w-5" />Listing photos unavailable</span></div>;
  return <div className="relative overflow-hidden bg-hc-navy" role="region" aria-roledescription="carousel" aria-label={`${address} listing photos`}
    data-card-control="carousel" onPointerDown={e=>{down.current={x:e.clientX,y:e.clientY};dragged.current=false;}} onPointerMove={e=>{if(down.current&&Math.hypot(e.clientX-down.current.x,e.clientY-down.current.y)>6)dragged.current=true;}} onClickCapture={e=>{if(dragged.current){e.preventDefault();e.stopPropagation();}}}
    tabIndex={available.length > 1 ? 0 : undefined}
    onKeyDown={event => {
      if (available.length < 2 || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation();
      if (event.key === 'ArrowLeft') api?.scrollPrev(); else api?.scrollNext();
    }}>
    <div ref={viewport} className="overflow-hidden">
      <div className="flex touch-pan-y">
        {available.map((url, index) => {
          const originalIndex = url === elmiraAuthorizedFrontFallback ? 0 : photos.includes(url) ? photos.indexOf(url) : listingPhotoFallbacks(researchId ?? dealId).indexOf(url);
          const near = index===current || index===(current+1)%available.length || index===(current+available.length-1)%available.length;
          const image = <img src={near?url:undefined} data-photo-url={url} alt={`${address}, MLS photo ${originalIndex + 1}${originalIndex === 0 ? ', front exterior' : ''}`}
            loading={index === 0 ? 'eager' : 'lazy'} decoding="async" draggable={false}
            className="h-full w-full object-cover" onError={() => setFailed(previous => previous.includes(url) ? previous : [...previous, url])} />;
          return <div key={url} className={cn(frame, 'min-w-0 shrink-0 basis-full')} role="group" aria-roledescription="slide" aria-label={`Photo ${index + 1} of ${available.length}`} aria-hidden={index !== current}>
            {dealId ? <Link to="/deal/$dealId" params={{ dealId }} tabIndex={index === current ? 0 : -1} className="block h-full w-full" aria-label={`Open ${address}`}>{image}</Link> : image}
          </div>;
        })}
      </div>
    </div>
    {available.length > 1 && <>
      <Button type="button" size="icon" variant="ghost" title="Previous photo" aria-label="Previous photo" className="absolute left-2 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full bg-hc-navy/90 text-hc-amber hover:bg-hc-amber hover:text-hc-navy" onClick={event => control(event, () => api?.scrollPrev())}><ChevronLeft /></Button>
      <Button type="button" size="icon" variant="ghost" title="Next photo" aria-label="Next photo" className="absolute right-2 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full bg-hc-navy/90 text-hc-amber hover:bg-hc-amber hover:text-hc-navy" onClick={event => control(event, () => api?.scrollNext())}><ChevronRight /></Button>
      <div className="absolute inset-x-0 bottom-0 flex h-10 items-center gap-2 bg-hc-navy/90 px-3">
        <div className="carousel-photo-picker flex min-w-0 flex-1 items-center overflow-x-auto" aria-label="Choose photo">
          {available.map((url, index) => <Button key={url} type="button" variant="ghost" size="icon" aria-label={`Show photo ${index + 1}`} aria-current={index === current ? 'true' : undefined} title={`Photo ${index + 1}`} className="h-6 w-5 shrink-0 rounded-none hover:bg-hc-amber/20" onClick={event => control(event, () => api?.scrollTo(index))}><span className={cn('h-1.5 w-1.5 rounded-full', index === current ? 'bg-hc-amber' : 'bg-primary-foreground/60')} /></Button>)}
        </div>
        <span className="shrink-0 text-xs font-semibold tabular-nums text-primary-foreground" aria-live="polite" aria-atomic="true">{current + 1} / {available.length}</span>
      </div>
    </>}
  </div>;
}
