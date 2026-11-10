import { Explanation } from './Explanation';
import { portalDeal } from '@/lib/portal-catalog';
import { dailyBundle } from '@/lib/daily-deals';
import { roomRentText } from '@/lib/room-rent-text';
import type { Amount } from '@/lib/underwriting';

const levelOrder = ['Upper', 'Main', 'Lower', 'Basement'];

/** Concept only. Rooms come from the listing room list, not a measured drawing. */
export function ConceptPlan({ id, rooms }: { id: string; rooms?: Array<{ rent: Amount }> }) {
  const deal = portalDeal(id);
  if (!deal) return null;
  const rents = rooms ?? dailyBundle(id)?.analysis?.inputs.rooms ?? [];
  const levels = [...new Set(deal.rooms.map(room => room.level))].sort((a, b) => {
    const ai = levelOrder.indexOf(a);
    const bi = levelOrder.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
  return (
    <section className="py-7" aria-label="Concept plan">
      <h2 className="mb-4 border-l-[5px] border-hc-amber pl-3 text-xl font-extrabold text-hc-navy">Concept plan</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Concept only, not a measured floor plan. {deal.rooms.length} bedrooms, numbered by floor. Red marks a conversion. Navy marks an existing bedroom. Each room is planned with a door gap to common space, with no bedroom pass-through. C is a closet. Plain W is only a basement new or egress window, and egress is not verified.
      </p>
      <p className="mb-4 text-sm">Common space kept: {deal.common}</p>
      <div className="grid gap-4">
        {levels.map(level => (
          <div key={level} className="rounded-xl border border-hc-border bg-card p-4">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">{level}</h3>
            <ol className="grid gap-2 sm:grid-cols-2">
              {deal.rooms.map((room, index) => {
                if (room.level !== level) return null;
                const rentText = roomRentText(rents[index]?.rent);
                return (
                <li key={`${level}-${index + 1}`} className={`rounded-lg border px-3 py-2 text-sm ${room.work === 'existing' ? 'border-hc-navy text-hc-navy' : 'border-destructive text-destructive'}`}>
                  <span className="font-extrabold">{index + 1}</span>
                  <span className="ml-2 text-hc-navy">{room.space}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {room.work === 'existing' ? 'Existing' : 'Conversion'}
                    {room.work !== 'existing' || room.closet ? ' · C' : ''}
                    {room.window && room.level === 'Basement' ? ' · W' : ''}
                    {room.bath === 'private' ? ' · private bath' : ' · shared bath'}
                    {rentText ? ` · ${rentText}` : ''}
                  </span>
                </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>
      <Explanation>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>{deal.floorPlanInListing ? 'The listing includes a floor plan photo. This concept is still taken from the room list, not a traced survey.' : 'No floor plan was in the listing. Levels come from the MLS room list and photos.'}</p>
          <p>{deal.heuristic}</p>
          <p>Listed tax ${deal.taxAnnual.toLocaleString('en-US')} for {deal.taxYear}. {deal.taxYear < 2025 ? 'That tax figure is older than 2025.' : 'Tax is the listing figure, not a county bill.'}</p>
          <p>Parking: {deal.garageObserved} garage space{deal.garageObserved === 1 ? '' : 's'} observed. Driveway {deal.drivewayEstimated} and street {deal.streetEstimated} are estimates. {deal.parkingNote}</p>
          {deal.risks.map(risk => <p key={risk}>{risk}</p>)}
        </div>
      </Explanation>
    </section>
  );
}
