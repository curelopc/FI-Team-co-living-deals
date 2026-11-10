import type { AnalysisInputs, AnalysisRoom, AnalysisSeed } from './underwriting';
import { calculateAnalysis, MAX_ROOMS } from './underwriting';

export interface ProposalInventory {
  source: string;
  rooms: Omit<AnalysisRoom, 'rent'>[];
}
/** Explicit evidence intake, never infer physical rooms from a listing count. */
export function validateProposal(proposal: ProposalInventory | null | undefined) {
  if (!proposal?.source.trim() || !proposal.rooms.length || proposal.rooms.length > MAX_ROOMS) return null;
  const numbers = proposal.rooms.map(room => room.number);
  if (new Set(numbers).size !== numbers.length || numbers.some(n => n == null || !Number.isInteger(n) || n < 1)) return null;
  if (proposal.rooms.some(room => !room.evidence?.trim() || !room.level.trim() || /^(unclear|unknown)$/i.test(room.level))) return null;
  return proposal.rooms.map(room => ({ ...room, drawn: true }));
}
export function modelSummary(inputs: AnalysisInputs, original = inputs) {
  const result = calculateAnalysis(inputs);
  const drawnCount = original.rooms.filter(room => room.drawn === true).length;
  const proposalMissing = drawnCount === 0;
  return { ...result, roomCount: inputs.rooms.length, drawnCount: proposalMissing ? null : drawnCount,
    status: proposalMissing ? 'Needs review' : result.missing.length ? 'Provisional' : 'Estimated',
    // Without a supported proposal, financial arithmetic is still a scenario, never final returns.
    monthlyCashFlow: proposalMissing ? null : result.monthlyCashFlow,
    annualCashFlow: proposalMissing ? null : result.annualCashFlow,
    cocPercent: proposalMissing ? null : result.cocPercent,
    missing: [...new Set([...result.missing, ...(proposalMissing ? ['Supported numbered proposal'] : [])])],
  };
}
export function intakeAudit(seed: AnalysisSeed, inputs = seed.inputs) {
  const summary = modelSummary(inputs);
  return { status: summary.status, roomCount: summary.roomCount, drawnCount: summary.drawnCount,
    grossRent: summary.grossRent, grossIncome: summary.grossIncome, missing: summary.missing,
    rooms: inputs.rooms.map(room => ({ number: room.number ?? null, level: room.level, bath: room.bath,
      drawn: room.drawn === true, rent: room.rent, evidence: room.evidence ?? null })),
    sourceBudget: inputs.reno, calculatedBudget: summary.capexTotal, insuranceEstimate: inputs.insuranceEstimate === true };
}
