import audit from './elmira-window-audit.json';
export const elmiraWindowAudit = audit;
export function windowEvidence(level: 'main' | 'basement') {
  return audit.rooms.filter(room => room.level === level);
}
