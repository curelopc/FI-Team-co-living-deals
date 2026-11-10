// Owner-directed concepts are drawing evidence only, never underwriting inputs.
export const elmiraBasementConcept = {
  mainRooms: [1, 2, 3, 4, 5, 6],
  rooms: [
    { number: 7, source: 'source 9 existing bedroom', access: 'existing west door from north common hall', closet: 'existing WIC', newDoorThroughExistingWall: false },
    { number: 8, source: 'north half of prior concept 8 / source 10 rec conversion', access: 'new east partition gap to west common hall', closet: 'proposed C', newDoorThroughExistingWall: false },
    { number: 9, source: 'south half of prior concept 8 / source 10 rec conversion', access: 'new east partition gap to west common hall', closet: 'proposed C', newDoorThroughExistingWall: false },
    { number: 10, source: 'existing bottom-right Room 14 ft 8 in by 12 ft 7 in', access: 'new west partition gap to reserved east common hall; not through bath', closet: 'proposed C', newDoorThroughExistingWall: false },
    { number: 11, source: 'north-central recreation area above retained common hall', access: 'new south partition gap directly to north common hall', closet: 'proposed C', newDoorThroughExistingWall: false },
  ],
  totalRooms: 11,
  modeledRooms: 11,
  sourcePlannedRooms: 9,
  currentListingBeds: 4,
  windows: [{ room: 9, wall: 'west exterior wall, south of support-column level', label: 'W: proposed egress, compliance not verified', allowance: 4000 }],
  sharedDestinations: ['stairs', 'bedroom 7 west entrance', 'utility entrance', 'laundry', 'shared bath west door', 'shared bath east door', 'storage'],
  newExistingWallCuts: 0,
  northCentralGeometry: { west: 335, east: 650, north: 60, south: 180, doorGap: [480,520], commonHallTraceY: 205, utilityApexY: 220, coordinates: 'registered 1024 by 769 source display' },
  allowance: { window: 4000, conversions: 3, wallDoor: 9000, closets: 4, closet: 4000, automaticCapExAddition: 0 },
} as const;
