import type { Amount } from './underwriting';

/** The only rent sentence in a room description. It is built from that room's rent. */
export function roomRentText(rent: Amount | undefined): string {
  if (rent == null || !Number.isFinite(rent)) return '';
  const amount = Number.isInteger(rent) ? String(rent) : String(rent);
  return `Rent estimate $${amount}.`;
}

/** Drop any previous rent sentence, then append the one for this room's current rent. */
export function evidenceWithRent(evidence: string | undefined, rent: Amount | undefined): string {
  const stripped = (evidence ?? '').replace(/\s*Rent estimate \$[\d,]+(?:\.\d+)?\.?/gi, ' ').replace(/\s+/g, ' ').trim();
  const text = roomRentText(rent);
  return [stripped, text].filter(Boolean).join(' ');
}
