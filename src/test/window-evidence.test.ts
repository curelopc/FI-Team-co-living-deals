import { expect, it } from 'vitest';
import { elmiraWindowAudit as audit, windowEvidence } from '../lib/window-evidence';
import { elmiraBasementConcept as concept } from '../lib/elmira-basement-concept';
it('audits eleven unique approved bedrooms without changing their count', () => {
  expect(audit.rooms.map(room => room.room)).toEqual([1,2,3,4,5,6,7,8,9,10,11]);
  expect(windowEvidence('main')).toHaveLength(6);
  expect(windowEvidence('basement')).toHaveLength(5);
  expect(concept.totalRooms).toBe(11);
  expect(concept.modeledRooms).toBe(11);
});
it('limits owner-directed window work to four standalone basement W marks, keeping room 9 once', () => {
  expect(audit.rooms.filter(room => room.mark === 'W').map(room => room.room)).toEqual([8,9,10,11]);
  expect(audit.rooms.filter(room => room.room === 9 && room.mark === 'W')).toHaveLength(1);
  expect(audit.rooms.filter(room => room.conditionalNeed).map(room => room.room)).toEqual([8,10,11]);
  expect(audit.rooms.every(room => ['W',''].includes(room.mark))).toBe(true);
  expect(audit.counts).toEqual({W:4,unmarked:7});
  expect(audit.drawingAnnotations.main).toEqual([]);
  expect(audit.drawingAnnotations.basement.map(mark => mark.text)).toEqual(['W','W','W','W']);
  expect(audit.drawingAnnotations.basement.map(mark => mark.room)).toEqual([8,9,10,11]);
  expect(windowEvidence('main').every(room => !room.proposedWindowScope && room.mark === '')).toBe(true);
  expect(audit.rooms.find(room => room.room === 7)?.proposedWindowScope).toBe(false);
});
it('records all thirty actual indexed photos and preserves missing associations', () => {
  expect(audit.reviewedPhotos.map(photo => photo.galleryIndex)).toEqual(Array.from({length:30},(_,i)=>i));
  expect(audit.rooms.find(room => room.room === 7)?.photoIndexes).toEqual([]);
  expect(audit.rooms.find(room => room.room === 10)?.photoIndexes).toEqual([]);
  expect(audit.rooms.find(room => room.room === 11)?.photoIndexes).toEqual([25]);
});
it('keeps photo 18 room matching tentative and never substitutes the sunroom for bedroom 10', () => {
  expect(audit.rooms.find(room => room.room === 3)?.confidence).toBe('medium, tentative room match');
  expect(audit.rooms.find(room => room.room === 1)?.confidence).toBe('high room match; window suitability unverified');
  expect(audit.rooms.find(room => room.room === 10)?.photos).toEqual([]);
  expect(audit.excludedBedroomAssociations.map(photo => photo.galleryIndex)).toEqual([26,27,28,29]);
});
it('puts candidate marks on exterior source boundaries and never adds their costs to underwriting', () => {
  expect(audit.rooms.find(room => room.room === 9)?.exteriorWall).toBe('west');
  expect(audit.rooms.find(room => room.room === 10)?.exteriorWall).toBe('south');
  expect(audit.rooms.find(room => room.room === 11)?.exteriorWall).toBe('north');
  expect(audit.allowances.confirmedConceptW9).toBe(4000);
  expect(audit.allowances.automaticCapExAddition).toBe(0);
  expect(concept.windows).toHaveLength(1);
  expect(concept.newExistingWallCuts).toBe(0);
});
