export interface LocationEvidence {
  latitude: number; longitude: number; provenance: string; sourceUrl: string;
  cars: { x: number; y: number; width: number; kind?: 'street'|'drive'; vertical?: boolean }[]; observation: string; breakdown?: string;
}
const provenance='App-side Google Maps address resolution, Nov 7, 2026; source sheet unchanged';
export const locationEvidence: Record<string, LocationEvidence> = {
  '6': {latitude:39.6874711,longitude:-104.8113607,provenance,
    sourceUrl:'https://www.google.com/maps/place/1584+S+Fraser+Way,+Aurora,+CO+80012/@39.6874711,-104.8113607,123m/data=!3m1!1e3',
    cars:[{x:44,y:49,width:1.8,kind:'drive'},{x:41,y:55.7,width:1.8,kind:'street',vertical:true},{x:37.7,y:52.1,width:1.8,kind:'street',vertical:true}],
    breakdown:'Driveway1 estimated · own curb1 possible · opposite curb1 possible. Conditional own space near curb cut excluded. Apparent garage1 is tandem-blocked, not independent.',
    observation:'Human StreetView inspection: May 2026 view shows paved driveway, front curb cut and garage. Public curb opportunities are estimates, shared and not reserved; conditional curb-cut space not counted.'},
  '8': {latitude:39.8185563,longitude:-105.0272394,provenance,
    sourceUrl:'https://www.google.com/maps/place/6704+Grove+St,+Denver,+CO+80221/@39.8185563,-105.0272394,123m/data=!3m1!1e3',
    cars:[{x:42.6,y:46.3,width:1.8,kind:'drive'},{x:38,y:52.3,width:1.8,kind:'street',vertical:true},{x:35.5,y:52.3,width:1.8,kind:'street',vertical:true}],
    breakdown:'Apron1 estimated · own curb1 possible · opposite curb1 possible, aerial-only low confidence. Garage unverified; avoid W67th corner and curb cuts.',
    observation:'Human StreetView inspection: October 2011 view fully blurred. Narrow apron and possible public curb illustrations only. Potential space pending onsite inspection; access and legality unverified, not total capacity.'},
  '40': {latitude:39.6996391,longitude:-104.8732734,provenance,
    sourceUrl:'https://www.google.com/maps/place/911+S+Elmira+St,+Denver,+CO+80247/@39.6996391,-104.8732734,246m/data=!3m1!1e3',
    cars:[{x:51.2,y:54.3,width:1.8,kind:'drive'},{x:51.2,y:56,width:1.8,kind:'drive'},{x:49.6,y:54.3,width:1.8,kind:'drive'},{x:49.6,y:56,width:1.8,kind:'drive'},{x:54,y:51.5,width:1.8,kind:'street',vertical:true},{x:55.8,y:51.5,width:1.8,kind:'street',vertical:true}],
    breakdown:'Driveway pad: 2 observed (May 2026 StreetView) + 2 tandem positions behind them estimated from the aerial · own curb1 possible · opposite curb1–2 possible (one illustrated conservatively). Garage unverified. Report claimed8 remains unverified, not confirmed capacity.',
    observation:'Human StreetView inspection: May 2026 view shows two cars on paved driveway; gravel-edge van excluded. Human magnification of the original aerial identified the paved driveway east/southeast of the roof, below canopy; two tandem positions behind the observed pair are estimated illustrations only — no dimension measurement is claimed, and neighbor curb-cut clearance is not verified. Street illustrations are conservative public opportunities, not reserved. Suggested51.3%,46–48% identifies neighboring909 driveway and was rejected after inspecting actual911 aerial. Own curb center moved from53.4 to54% to remain on road, not sidewalk.'},
};
