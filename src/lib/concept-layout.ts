/** Best-fit concept rooms for deals that have no measured plan. Plain W stays in the basement. */
export interface ConceptLayoutRoom {
  level: 'Main' | 'Basement';
  space: string;
  work: string;
  bath: string;
  window: boolean;
  closet: boolean;
  rent: number | null;
  rent_basis: string;
}

type SourceRoom = { space: string; work: string; bath: string; rent: number | null; rent_basis?: string };

function goesDownstairs(space: string): boolean {
  return /family room|lower rec|basement/i.test(space);
}

/** Handoff rooms marked for a new window: the family room, and lower rec split A. */
function markedWindow(space: string): boolean {
  return /family room|lower rec room split a/i.test(space);
}

export function layoutConceptRooms(rooms: SourceRoom[]): ConceptLayoutRoom[] {
  const placed = rooms.map(room => {
    const downstairs = goesDownstairs(room.space);
    return {
      level: downstairs ? 'Basement' as const : 'Main' as const,
      space: room.space.replace(/\(ASSUMED convertible\)/gi, '(concept)'),
      work: room.work,
      bath: room.bath,
      window: downstairs && markedWindow(room.space),
      closet: room.work !== 'existing',
      rent: room.rent,
      rent_basis: room.rent_basis ?? '',
    };
  });
  return [...placed.filter(room => room.level === 'Main'), ...placed.filter(room => room.level === 'Basement')];
}
