import type { AnalysisCapex, AnalysisRoom } from './underwriting';
import { portalDeal, type PortalDeal, type PortalRoom } from './portal-catalog';

/** Numbered concept rooms for the shared inventory. Rents are applied later by the standard scenario. */
export function portalRoomInventory(id: string): Omit<AnalysisRoom, 'rent'>[] | null {
  const deal = portalDeal(id);
  if (!deal) return null;
  return deal.rooms.map((room, index) => portalAnalysisRoom(room, index + 1));
}

function portalAnalysisRoom(room: PortalRoom, number: number): Omit<AnalysisRoom, 'rent'> {
  const conversion = room.work !== 'existing';
  const closet = conversion || room.closet;
  const window = room.window && room.level === 'Basement';
  const parts = [
    conversion
      ? 'Concept conversion: straight wall and a door gap to common space. No bedroom pass-through.'
      : 'Existing bedroom. Door to common space. No bedroom pass-through.',
    closet ? 'Closet C.' : '',
    window ? 'Plain W for a basement new or egress window. Egress is not verified.' : '',
    room.bath === 'private' ? 'Private bath. Rent estimate $830.' : 'Shared bath. Rent estimate $670.',
    room.space,
  ].filter(Boolean);
  return {
    number,
    drawn: true,
    name: `Bedroom ${number}`,
    level: room.level,
    bath: room.bath === 'private' ? 'Private bath (concept)' : 'Hall/shared',
    evidence: parts.join(' '),
  };
}

/** Standing renovation allowances for a portal concept. Zero lines are omitted. */
export function portalCapex(deal: PortalDeal): AnalysisCapex[] {
  const count = deal.rooms.length;
  const conversions = deal.rooms.filter(room => room.work !== 'existing').length;
  const closets = deal.rooms.filter(room => room.work !== 'existing' || room.closet).length;
  const egress = deal.rooms.filter(room => room.window && room.level === 'Basement').length;
  const fridges = Math.max(0, Math.ceil(count / 4) - (deal.fridgeConveys ? 1 : 0));
  const items: [string, number][] = [
    ['Conversions', conversions * 3000],
    ['Closets', closets * 1000],
    ['Basement egress windows', egress * 4000],
    ['Added full baths', deal.addedBaths * 10000],
    ['Fridges', fridges * 1000],
    ['Washer and dryer', deal.washerDryerConveys ? 0 : 1500],
    ['Basement finish', deal.finishSqft * 35],
    ['Deferred maintenance', deal.deferred],
    ['Co-living setup', 2500],
    ['Consultation', 2500],
    ['Contingency', 10000],
    ['Furnishings', 6000],
  ];
  return items.filter(([, cost]) => cost > 0).map(([name, cost]) => ({ name, cost }));
}
