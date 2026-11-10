import { parseNumber } from './deals';
import { listingFinancialEvidence } from './listing-financial-evidence';
import type { AnalysisSeed } from './underwriting';
import { drawnRoomInventory } from './room-inventory';
import { validateProposal, type ProposalInventory } from './deal-intake';
import { fillFinancialAssumptions } from './financial-assumptions';
import { portalDeal } from './portal-catalog';
import { evidenceWithRent } from './room-rent-text';

/** Craig-authorized modeled scenario, deliberately separate from source reproduction. */
export function standardScenario(seed: AnalysisSeed, research: Record<string, string>, proposal?: ProposalInventory | null): AnalysisSeed {
  const value = structuredClone(seed);
  const original = value.inputs.rooms;
  const serviceRent = research['id'] === '40' ? null : parseNumber(research['coliving_pro_rent_per_room']);
  const elmira = research['id'] === '40';
  value.inputs.serviceRent = serviceRent;
  value.inputs.rentBasis = elmira ? 'historical-comparable' : 'research';
  value.inputs.sharedRentEstimate = elmira ? 670 : parseNumber(research['shared_rent_estimate']);
  value.inputs.privateRentEstimate = elmira ? 830 : parseNumber(research['private_rent_estimate']);
  const splitRent = value.inputs.sharedRentEstimate != null && value.inputs.privateRentEstimate != null;
  value.inputs.tenantUtilityFee = elmira ? 80 : parseNumber(research['coliving_pro_util_fee']) ?? 80;
  const approved = proposal === undefined ? drawnRoomInventory(research['id'] ?? '', research) : validateProposal(proposal);
  const inventory = approved ?? original.filter(room => room.evidence !== 'Co-Living Pro assumption; drawing not verified').map((room, i) => ({ ...room, number: room.number ?? i + 1, drawn: false, name: `Scenario room ${room.number ?? i + 1} (not drawn)`, level: room.level || 'Unverified' }));
  value.inputs.rooms = inventory.map(room => {
    const rent = splitRent ? (/private|ensuite/i.test(room.bath) ? value.inputs.privateRentEstimate ?? 830 : value.inputs.sharedRentEstimate ?? 670) : (() => { const source = original.find(row => row.number === room.number && row.evidence !== 'Co-Living Pro assumption; drawing not verified'); return source ? source.rent : serviceRent; })();
    return { ...room, rent, evidence: evidenceWithRent(room.evidence, rent) };
  });
  value.inputs.managementBase = 'gross';
  value.inputs.managementPercent = 16;
  value.inputs.vacancyPercent = 5;
  const portal = portalDeal(research['id']);
  const listing = listingFinancialEvidence[research['id'] ?? ''] ?? (portal ? {
    annualTax: portal.taxAnnual,
    taxLabel: `Listed tax ${portal.taxYear} / mo $`,
    sourceUrl: portal.listingUrl,
    retrieved: '2026-11-09',
    septicNotApplicable: true,
    noAssociation: true,
    audit: `Listing tax $${portal.taxAnnual.toLocaleString('en-US')} for ${portal.taxYear}. Insurance is monthly tax plus $200, an estimate. HOA and septic are $0 estimates unless a source amount appears.`,
  } : undefined);
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
  // Historical PDFs and the approved current-property scenarios retain the labeled convention.
  const actualInsurance = !seed.historical && !['6','8','40'].includes(research['id'] ?? '') && value.inputs.insurance != null;
  if (!actualInsurance) value.inputs.insurance = value.inputs.taxes == null ? null : value.inputs.taxes + 200;
  value.inputs.insuranceEstimate = !actualInsurance;
  const actualExpenses = value.inputs.expenses.filter(e => e.amount != null && /actual|original inputs|source input/i.test(e.evidence));
  const generic = !['6','8','40'].includes(research['id'] ?? '');
  const actualUtilities = generic && value.inputs.utilities != null && value.inputs.utilities > 0;
  if (!actualUtilities) value.inputs.utilities = 0; // Itemized below, not an invented missing expense.
  const replaced = new Set(['Sewer & Water','Gas','Electricity','Internet','Trash','Lawn Care','Lawn care','Cleaning','Monthly CapEx reserve','Repairs / maintenance']);
  // Craig Nov7: no PadSplit service; remove every PadSplit variant from the modeled scenario entirely (not hidden, not zeroed).
  const removed = new Set(['10 Day PadSlpit Fee (Caltd. Monthly)','PadSplit']);
  value.inputs.expenses = value.inputs.expenses.filter(e => !replaced.has(e.name) && !removed.has(e.name) && !/pad\s*s?l?plit|padslpit/i.test(e.name));
  // Craig Nov7: one combined maintenance/security allowance per property per month; flat, never per modeled room.
  const maint = { name: 'Maintenance / security', amount: 150, evidence: 'Estimated $150/property/mo combined; Craig Nov7, editable' };
  value.inputs.expenses = value.inputs.expenses.filter(e => e.name !== 'Maint. & Security Fee by PMC');
  value.inputs.expenses.push(maint);
  value.inputs.expenses.push(
    ...[['Water',20],['Gas',10],['Electricity',50]].map(([name,amount]) => ({name:String(name),amount:Number(amount),perRoom:true,evidence:'Estimated $/modeled room/mo; Youngfield/Fremont Inputs, Craig inspected Nov7'})),
    ...[['Internet',100],['Trash',70],['Lawn care',80],['Cleaning',150],['Monthly CapEx reserve',250],['Repairs / maintenance',250]].map(([name,amount]) => ({name:String(name),amount:Number(amount),evidence:'Estimated monthly allowance; Craig supplied Acquisitions models Nov7'})),
  );
  if (generic) {
    const canonical = (name: string) => ({'Sewer & Water':'Water','Lawn Care':'Lawn care','Maint. & Security Fee by PMC':'Maintenance / security'}[name] ?? name);
    for (const source of actualExpenses) {
      if (/pad\s*s?l?plit|padslpit/i.test(source.name)) continue;
      const name = canonical(source.name);
      value.inputs.expenses = value.inputs.expenses.filter(e => e.name !== name);
      value.inputs.expenses.push({ ...source, name });
    }
    if (actualUtilities) value.inputs.expenses = value.inputs.expenses.filter(e => !['Water','Gas','Electricity','Internet','Trash'].includes(e.name));
  }
  delete value.inputs.reservePercent;
  delete value.inputs.repairsPercent;
  fillFinancialAssumptions(value, research);
  value.modelAssumptions.push('Drawing-aligned proposed bedrooms, not verified/legal bedrooms. Extra session bedrooms are scenarios, not drawn. Missing financial values use editable declared planning assumptions; original source values remain separate. Holding uses source cash when supplied, otherwise two pre-lease months of debt and carry, never a universal $12,000. Maintenance/security remains $150/property/month flat.');
  return value;
}
