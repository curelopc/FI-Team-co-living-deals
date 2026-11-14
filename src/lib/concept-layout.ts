/** Best-fit concept rooms for deals that have no measured plan. Plain W stays in the basement. */
export interface ConceptLayoutRoom {
  level: 'Upper' | 'Main' | 'Basement';
  space: string;
  work: string;
  bath: string;
  window: boolean;
  closet: boolean;
  rent: number | null;
  rent_basis: string;
}

type SourceRoom = { space: string; work: string; bath: string; rent: number | null; rent_basis?: string; window?: boolean };

function goesDownstairs(space: string): boolean {
  return /family room|lower rec|basement/i.test(space);
}

/** Handoff rooms marked for a new window: the family room, and lower rec split A. */
function markedWindow(space: string): boolean {
  return /family room|lower rec room split a/i.test(space);
}

function floorOf(space: string): ConceptLayoutRoom['level'] {
  if (/\bupper\b/i.test(space)) return 'Upper';
  if (goesDownstairs(space)) return 'Basement';
  return 'Main';
}

const floorOrder: Record<ConceptLayoutRoom['level'], number> = { Upper: 0, Main: 1, Basement: 2 };

export function layoutConceptRooms(rooms: SourceRoom[]): ConceptLayoutRoom[] {
  const placed = rooms.map(room => {
    const level = floorOf(room.space);
    const marked = room.window == null ? markedWindow(room.space) : room.window === true;
    return {
      level,
      space: room.space.replace(/\(ASSUMED convertible\)/gi, '(concept)'),
      work: room.work,
      bath: room.bath,
      window: level === 'Basement' && marked,
      closet: room.work !== 'existing',
      rent: room.rent,
      rent_basis: room.rent_basis ?? '',
    };
  });
  return [...placed].sort((a, b) => floorOrder[a.level] - floorOrder[b.level]);
}
