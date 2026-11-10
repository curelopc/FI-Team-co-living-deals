export interface PropertyReview {
  photosInspected: number;
  observations: string[];
  windowStatus: string;
  accessStatus: string;
  parkingStatus: string;
}
/** Property-specific visual review, not a generic compliance verdict or new financial input. */
export const propertyReviews: Record<string, PropertyReview> = {
  '6': {
    photosInspected: 23,
    observations: ['Fresh review of23 current feed photos and both annotated After plans. Main1–2, upper3–5, basement6–8 are labeled; no clean Before fabricated.', 'Photos9/13/20 show the existing basement rec/wet-bar area with a small high window. These are tentative area matches, not proof of proposed room7/8 opening suitability.', 'Upper/main bedrooms and baths appear in photos1/4/5/7/15/18/21; exact bedroom-number matches are not established. Photo8 is an upper plan and14 a main plan, not basement Before evidence.'],
    windowStatus: 'Basement7/8 new or upgraded window work remains conditional, placement not reviewed reliably enough for W coordinates. Room6 window suitability unknown. No upstairs proposed work by owner scope.',
    accessStatus: 'Source stair landing appears inside room6 before the shared bath/rec area. A reserved common landing/route is not demonstrated by this After. Eight source concept rows are estimates, not completed access approval; needs review before construction. Source door arcs also meet solid red lines; actual door gaps require concept correction before construction.',
    parkingStatus: 'Own attributed aerial inspected: single apron illustration, shared curb estimates. Neighbor cuts, corner restrictions and pedestrian clearance not certified; no measured dimensions or legal total.',
  },
  '8': {
    photosInspected: 30,
    observations: ['Fresh review of30 current feed photos, authentic public current main/basement and same-level annotated After. Owner-directed t57 concept: main1–5 (dining becomes5), basement6–9 (rec area becomes two total bedrooms6/7).', 'Photos21–27 show existing bedroom windows and closets, but room-number/level associations remain uncertain. Current selected30 stop before a reliable basement rec photo match; no copied Elmira window proof.'],
    windowStatus: 'Plain W marks at the north exterior walls of basement rooms6 and7 (new or upgraded window); no matching photo or opening specification, so egress is not verified. Existing basement8/9 window suitability unknown. No upstairs proposed work by owner scope.',
    accessStatus: 'Common basement hall connects stairs, kitchenette, utility, bath and bedrooms6–9; each new room has a deliberate door gap off common space and a closet C. Main dining room5 opens to the common kitchen; living room1 to the foyer hall. Needs review; do not claim funded/constructed or compliant.',
    parkingStatus: 'Own attributed aerial inspected, narrow apron and shared curb only. W67th corner and neighbor cuts excluded conceptually; clearances/garage capacity unknown. Historical StreetView blurred, no fresh StreetView claim.',
  },
  '40': {
    photosInspected: 30,
    observations: ['Fresh review of30 durable actual listing photos and approved current/redline main/basement. Main1–6 and basement7–11 remain unchanged.', 'Photos26/27 are sunroom,28/29 rear exterior, not basement-bedroom window proof. Existing room-by-room historical photo audit remains conditional.'],
    windowStatus: 'Four standalone basement W marks at8/9/10/11, no upstairs work. Conditional matches and opening/sill dimensions remain unresolved; owner-directed scope is not legal egress certification.',
    accessStatus: 'Approved blue shared hall route and red gaps/closets preserved. Eleven is conceptual inventory, not onsite or legal certification.',
    parkingStatus: 'Own attributed aerial inspected;2 observed plus2 tandem estimates distinguished from shared curb. Neighbor909 driveway excluded; neighbor-cut/egress clearance and legal capacity remain unverified.',
  },
};
export function propertyReview(id?: string): PropertyReview {
  return propertyReviews[id ?? ''] ?? { photosInspected: 0, observations: ['Property-specific photos and numbered plan associations not reviewed.'], windowStatus: 'Unreviewed; no invented window markers. Owner scope excludes upstairs work.', accessStatus: 'Common access, door gaps and closets unreviewed; proposal evidence needed.', parkingStatus: 'Property-specific parking evidence unreviewed, no legal capacity or dimension claim.' };
}
