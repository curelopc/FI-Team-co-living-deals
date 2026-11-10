import { historicalSummary, type ReportEvidence } from '@/lib/report-evidence';
const money=(n:number)=>n.toLocaleString('en-US',{style:'currency',currency:'USD'});
export function HistoricalUnderwrite({report}:{report:ReportEvidence}) {
  const s=historicalSummary(report);
  return <section className="border-y border-hc-border py-6" aria-label="Historical source baseline">
    <h2 className="text-xl font-bold">Historical original report · self-managed</h2>
    <p className="mt-2 text-sm text-muted-foreground">Old report only, not the live scenario. The live scenario uses the FI Team standard assumption of 20% down. These figures keep the old report's own price, down payment, loan, and returns.</p>
    <p className="mt-2 text-sm text-muted-foreground">Historical price/rents and source-reported results, not current returns. No embedded calculator hyperlink in the original PDF. Source screenshots omit displayed vacancy in their totals. Missing utilities, recurring cleaning and PMI are not verified zero.</p>
    <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
      <dt>Original price / down payment</dt><dd>{money(report.price)} / {report.down}% ({money(report.price*report.down/100)})</dd>
      <dt>Original loan / financing</dt><dd>{money(report.loan)} · {report.rate}% · 30 years</dd>
      <dt>Room rents / month</dt><dd>{report.rents.map(money).join(' + ')} = {money(s.roomRent)}</dd>
      <dt>Garage parking / total income</dt><dd>{money(report.parking)} / {money(report.sourceIncome)} monthly</dd>
      <dt>P&amp;I / tax / insurance</dt><dd>{money(s.pi)} / $150 / $150 monthly</dd>
      <dt>Management / reserve / maintenance</dt><dd>Self-managed 0% / {money(report.reserve)} / {money(report.repairs)} monthly (4% each)</dd>
      <dt>Reported expenses / reproduced subtotal</dt><dd>{money(report.displayedExpenses)} / {money(s.expensesWithoutVacancy)} monthly</dd>
      <dt>Reported cash flow / CoC</dt><dd>{money(report.sourceCashFlow)} monthly / {report.sourceCoc.toFixed(2)}%</dd>
      <dt>Reproduced known-input cash flow</dt><dd>{money(s.reproducedCashFlow)} monthly, before omitted vacancy</dd>
      <dt>Cash invested</dt><dd>{money(s.cashInvested)} = down + {money(report.rehab)} rehab + {money(report.closing)} closing</dd>
      <dt>Omitted vacancy correction</dt><dd>{money(s.omittedVacancy)} monthly ({report.vacancy}% of gross income)</dd>
      <dt>Vacancy-corrected historical known-input result</dt><dd>{money(s.correctedKnownCashFlow)} monthly / {s.correctedKnownCoc.toFixed(2)}% CoC. Incomplete owner expenses.</dd>
    </dl>
    <h3 className="mt-5 font-bold">Historical renovation evidence</h3>
    <ul className="mt-2 text-sm">{report.renovations.map(item=><li key={item.name}>{item.name}: {money(item.cost)}</li>)}</ul>
    <p className="mt-2 text-sm text-destructive">Item sum {money(s.itemTotal)} versus displayed rehab {money(report.rehab)}: {money(s.discrepancy)} discrepancy. Displayed rehab retained once, no invented area allocation.</p>
  </section>;
}
