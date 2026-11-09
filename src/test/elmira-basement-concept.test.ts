import { expect, it } from 'vitest';
import { elmiraBasementConcept as concept } from '../lib/elmira-basement-concept';
it('counts six unchanged upstairs and five unique basement enclosures for the approved eleven concept', () => {
  expect(concept.mainRooms).toEqual([1,2,3,4,5,6]);
  expect(concept.rooms.map(room => room.number)).toEqual([7,8,9,10,11]);
  expect(new Set([...concept.mainRooms,...concept.rooms.map(room => room.number)]).size).toBe(11);
  expect(concept.totalRooms).toBe(11);
});
it('maps two west split rooms and the original bottom-right room independently', () => {
  expect(concept.rooms.filter(room => room.source.includes('prior concept 8')).map(room => room.number)).toEqual([8,9]);
  expect(concept.rooms.find(room => room.number === 10)?.source).toBe('existing bottom-right Room 14 ft 8 in by 12 ft 7 in');
});
it('adds exactly one owner-directed west window at 4000 without automatic CapEx changes', () => {
  expect(concept.windows).toHaveLength(1);
  expect(concept.windows[0].room).toBe(9);
  expect(concept.windows[0].wall).toBe('west exterior wall, south of support-column level');
  expect(concept.windows[0].allowance).toBe(4000);
  expect(concept.allowance.automaticCapExAddition).toBe(0);
});
it('reserves independent common access and shared services without existing-wall cuts', () => {
  expect(concept.rooms.map(room => room.access)).toEqual([
    'existing west door from north common hall',
    'new east partition gap to west common hall',
    'new east partition gap to west common hall',
    'new west partition gap to reserved east common hall; not through bath',
    'new south partition gap directly to north common hall',
  ]);
  expect(concept.newExistingWallCuts).toBe(0);
  expect(concept.sharedDestinations).toEqual(['stairs','bedroom 7 west entrance','utility entrance','laundry','shared bath west door','shared bath east door','storage']);
});
it('places room 11 above the hall with its own south door and leaves the utility below the hall', () => {
  expect(concept.northCentralGeometry.south).toBe(180);
  expect(concept.northCentralGeometry.doorGap).toEqual([480,520]);
  expect(concept.northCentralGeometry.south).toBeLessThan(concept.northCentralGeometry.commonHallTraceY);
  expect(concept.northCentralGeometry.commonHallTraceY).toBeLessThan(concept.northCentralGeometry.utilityApexY);
  expect(concept.rooms.find(room => room.number === 11)?.closet).toBe('proposed C');
});
it('retains separate current listing, historical plan and financial counts', () => {
  expect(concept.currentListingBeds).toBe(4);
  expect(concept.sourcePlannedRooms).toBe(9);
  expect(concept.modeledRooms).toBe(10);
});
