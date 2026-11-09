import { parseNumber } from './deals';
import { listingFinancialEvidence } from './listing-financial-evidence';
import type { AnalysisSeed } from './underwriting';

/** Craig-authorized modeled scenario, deliberately separate from source reproduction. */
export function standardScenario(seed: AnalysisSeed, research: Record<string, string>): AnalysisSeed {
  const value = structuredClone(seed);
  const original = value.inputs.rooms;
  const serviceRent = research['id'] === '40' ? null : parseNumber(research['coliving_pro_rent_per_room']);
  const elmira = research['id'] === '40';
  value.inputs.serviceRent = serviceRent;
  value.inputs.rentBasis = elmira ? 'historical-comparable' : 'research';
  value.inputs.sharedRentEstimate = elmira ? 670 : null;
  value.inputs.privateRentEstimate = elmira ? 830 : null;
  value.inputs.tenantUtilityFee = elmira ? 80 : parseNumber(research['coliving_pro_util_fee']);
  value.inputs.rooms = Array.from({ length: 10 }, (_, i) => ({
    name: `Modeled room ${i + 1}`, rent: elmira ? i === 0 && original[i]?.bath.includes('ensuite') ? 830 : 670 : serviceRent,
    level: original[i]?.level ?? 'Unclear', bath: original[i]?.bath ?? 'Unclear',
    evidence: original[i]?.evidence ?? 'Modeled slot only; physical layout/access unverified',
  }));
  value.inputs.managementBase = 'gross';
  value.inputs.managementPercent = 16;
  value.inputs.vacancyPercent = 5;
  const listing = listingFinancialEvidence[research['id'] ?? ''];
  if (listing) {
    value.inputs.taxes = listing.annualTax / 12;
    value.inputs.taxLabel = listing.taxLabel;
    value.inputs.expenses = value.inputs.expenses.map(e => {
      if (listing.septicNotApplicable && /^(Septic|Septic Service)$/.test(e.name)) return { ...e, amount: 0, evidence: 'Not applicable: listed public sewer' };
      if (listing.noAssociation && e.name === 'HOA') return { ...e, amount: 0, evidence: 'Listed no association' };
      return e;
    });
    value.modelAssumptions.push(`${listing.retrieved} ${listing.sourceUrl}: ${listing.audit}`);
  }
  value.inputs.insurance = value.inputs.taxes == null ? null : value.inputs.taxes + 200;
  value.inputs.insuranceEstimate = true;
  value.inputs.utilities = 0; // Itemized below; no additional unitemized utility assumption.
  const replaced = new Set(['Sewer & Water','Gas','Electricity','Internet','Trash','Lawn Care','Lawn care','Cleaning','Monthly CapEx reserve','Repairs / maintenance']);
  // Craig Nov7: no PadSplit service; remove every PadSplit variant from the modeled scenario entirely (not hidden, not zeroed).
  const removed = new Set(['10 Day PadSlpit Fee (Caltd. Monthly)','PadSplit']);
  value.inputs.expenses = value.inputs.expenses.filter(e => !replaced.has(e.name) && !removed.has(e.name));
  // Craig Nov7: one combined maintenance/security allowance per property per month; flat, never per modeled room.
  const maint = { name: 'Maintenance / security', amount: 150, evidence: 'Estimated $150/property/mo combined; Craig Nov7, editable' };
  value.inputs.expenses = value.inputs.expenses.filter(e => e.name !== 'Maint. & Security Fee by PMC');
  value.inputs.expenses.push(maint);
  value.inputs.expenses.push(
    ...[['Water',20],['Gas',10],['Electricity',50]].map(([name,amount]) => ({name:String(name),amount:Number(amount),perRoom:true,evidence:'Estimated $/modeled room/mo; Youngfield/Fremont Inputs, Craig inspected Nov7'})),
    ...[['Internet',100],['Trash',70],['Lawn care',80],['Cleaning',150],['Monthly CapEx reserve',250],['Repairs / maintenance',250]].map(([name,amount]) => ({name:String(name),amount:Number(amount),evidence:'Estimated monthly allowance; Craig supplied Acquisitions models Nov7'})),
  );
  delete value.inputs.reservePercent;
  delete value.inputs.repairsPercent;
  value.modelAssumptions.push('10 modeled slots, not verified/legal bedrooms. Fraser/Grove prior private/furnished service output extrapolated; Elmira unfurnished historical comparable shared670/private830, not current property-specific service result. Tenant utility income80 per modeled slot is separate from owner expenses. Parent watched video27:30:16% gross management,5%vacancy; estimated insurance tax/mo+200, not quote. Executor did not watch video. Holding remains source value or missing, no12000 blanket estimate. Craig Nov7: combined maintenance/security estimated $150/property/mo, flat; no PadSplit service, all PadSplit fee variants removed from the modeled scenario (historical source audit retained offscreen).');
  return value;
}
