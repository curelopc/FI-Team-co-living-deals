import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type ReactNode } from "react";
import { AnalysisEditor } from '@/components/AnalysisEditor';
import { dealQuery } from '@/lib/deal-queries';
import { ParkingEvidence } from '@/components/ParkingEvidence';
import { locationEvidence } from '@/lib/location-evidence';
import { planEvidence } from '@/lib/plan-evidence';
import { useAnalysisSession } from '@/components/AnalysisSession';
import { modelSummary } from '@/lib/deal-intake';
import { Explanation } from '@/components/Explanation';
import { propertyReview } from '@/lib/property-review';
import { WindowEvidenceTable } from '@/components/WindowEvidenceTable';
import fiTeamLogo from '@/assets/the-fi-team-logo.png.asset.json';
import { MlsPhotoCarousel } from '@/components/MlsPhotoCarousel';
import { parseMlsPhotos } from '@/lib/mls-photos';
import { calculateAnalysis, safeExternalUrl } from '@/lib/research';
import { getDeal } from "@/lib/deals.functions";
import {
  computePitch,
  driveImageUrl,
  driveImageFallbackUrl,
    parseNumber,
  verdictKind,
  type TabRow,
  type VerdictKind,
} from "@/lib/deals";

export const Route = createFileRoute("/deal/$dealId")({
  head: ({ params }) => ({
    meta: [
      { title: `Deal ${params.dealId} | The FI Team Co-Living Deal` },
      { name: "description", content: `Listing, numbered proposal and session estimates for The FI Team co-living deal ${params.dealId}.` },
      { property: "og:title", content: `Deal ${params.dealId} | The FI Team Co-Living Deal` },
      { property: "og:description", content: `Listing, numbered proposal and session estimates for The FI Team co-living deal ${params.dealId}.` },
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader:({context,params})=>context.queryClient.ensureQueryData(dealQuery(params.dealId)),
  errorComponent:()=> <p>Could not load this deal.</p>,
  notFoundComponent:()=> <p>Deal not found.</p>,
  component: PitchPage,
});

const fmtMoney = (n: number) => `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;
const fmtPct = (n: number) => `${n.toFixed(1)}%`;

const STRIPES = {
  background:
    "repeating-linear-gradient(45deg, var(--hc-page), var(--hc-page) 12px, var(--hc-border) 12px, var(--hc-border) 24px)",
};

const VERDICT_STYLES: Record<VerdictKind, { label: string; className: string }> = {
  pursue: { label: "Pursue", className: "bg-hc-pursue text-primary-foreground" },
  watch: { label: "Watch", className: "bg-hc-amber text-hc-navy" },
  pass: { label: "Pass", className: "bg-hc-pass text-primary-foreground" },
  pending: { label: "Pending", className: "bg-hc-border text-hc-navy" },
};

/** A number value, or a gray "Unavailable" when missing. Negative money renders red. */
function Num({ value, money = false, pct = false }: { value: number | null; money?: boolean; pct?: boolean }) {
  if (value == null) return <span className="text-muted-foreground">Unavailable</span>;
  const text = money ? fmtMoney(value) : pct ? fmtPct(value) : String(value);
  return <span className={money && value < 0 ? "text-destructive" : undefined}>{text}</span>;
}

function StatCard({
  label,
  highlight = false,
  sub,
  children,
}: {
  label: string;
  highlight?: boolean;
  sub?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-xl p-5 shadow-sm ${highlight ? "bg-hc-navy" : "bg-card"}`}>
      <div
        className={`text-xs font-semibold uppercase tracking-wider ${
          highlight ? "text-hc-navy-muted" : "text-muted-foreground"
        }`}
      >
        {label}
      </div>
      <div className={`mt-1.5 text-2xl font-extrabold ${highlight ? "text-hc-amber" : "text-hc-navy"}`}>
        {children}
      </div>
      {sub && (
        <div className={`mt-1 text-xs ${highlight ? "text-hc-navy-muted" : "text-muted-foreground"}`}>{sub}</div>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-4 border-l-[5px] border-hc-amber pl-3 text-xl font-extrabold text-hc-navy">{children}</h2>
  );
}

function Pin({ n, x, y }: { n: string; x: number; y: number }) {
  return (
    <span
      className="absolute grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-card bg-hc-blue text-xs font-extrabold text-primary-foreground"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      {n}
    </span>
  );
}

function PlanSection({
  title,
  imageUrl,
  callouts,
  placeholder,
  evidence,
  reviewId,
}: {
  title: string;
  imageUrl: string | null;
  callouts: TabRow[];
  placeholder: string;
  evidence: ReturnType<typeof planEvidence>;
  reviewId?: string | undefined;
}) {
  const [failed, setFailed] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const showImage = imageUrl != null && !failed;
  return (
    <section className="py-7">
      <SectionTitle>{title}</SectionTitle>
      <div className={`grid items-start gap-5 ${evidence.beforeUrl && imageUrl ? 'md:grid-cols-[1fr_auto_1fr]' : 'md:grid-cols-2'}`}>
        <div><h3 className="mb-2 font-bold">Before · current drawing</h3>{evidence.beforeUrl ? <><EvidenceImage key={evidence.beforeUrl} url={evidence.beforeAssetUrl ?? driveImageUrl(evidence.beforeUrl)} alt={`${title} before current drawing`} /><a href={evidence.beforeUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-hc-blue underline">{evidence.beforeProvenanceLabel}</a></> : <p className="flex min-h-40 items-center justify-center bg-muted text-muted-foreground">Current drawing missing</p>}</div>
        {evidence.beforeUrl && imageUrl && <span aria-hidden="true" className="self-center text-center text-2xl text-hc-amber">→</span>}
        <div><h3 className="mb-2 font-bold">{evidence.afterLabel}</h3>
        {showImage ? (
          <div className="relative self-start">
            <img
              src={evidence.afterAssetUrl ?? (useFallback ? driveImageFallbackUrl(imageUrl) ?? imageUrl : imageUrl)}
              alt={`${title} after annotated drawing`}
              referrerPolicy="no-referrer"
              loading="lazy" decoding="async" className="block h-auto w-full object-contain"
              onError={() => useFallback ? setFailed(true) : setUseFallback(true)}
            />
            {callouts.map((c) => {
              if(evidence.suppressOverlays) return null;
              const x = parseNumber(c.cells["X%"]);
              const y = parseNumber(c.cells["Y%"]);
              if(evidence.suppressRoomOne && c.cells['#']?.trim()==='1') return null;
              if (x == null || y == null) return null;
              return <Pin key={c.rowNumber} n={c.cells["#"] ?? ""} x={x} y={y} />;
            })}
          </div>
        ) : (
          <div
            className="flex min-h-[280px] items-center justify-center rounded-lg font-semibold text-muted-foreground"
            style={STRIPES}
          >
            {placeholder}
          </div>
        )}
        {evidence.afterProvenanceUrl && <a href={evidence.afterProvenanceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-hc-blue underline">Original annotated drawing · Drive provenance</a>}
        </div>
      </div>
        {callouts.length > 0 && !evidence.suppressOverlays && (
          <ol className="self-start">
            {callouts.map((c) => (
              <li
                key={c.rowNumber}
                className="flex items-center gap-2.5 border-b border-hc-border py-2 text-sm text-hc-navy last:border-0"
              >
                <b className="grid h-6 w-6 flex-none place-items-center rounded-full bg-hc-blue text-xs font-extrabold text-primary-foreground">
                  {c.cells["#"]}
                </b>
                {evidence.legendStatus?.[c.cells['#']?.trim() ?? ''] ?? <>{c.cells["Label"]} · {evidence.suppressRoomOne && c.cells['#']?.trim()==='1' ? 'Primary Bedroom evidence; erroneous outside-house annotation removed, no replacement pin' : evidence.suppressOverlays ? 'Source room label; no duplicate app pin; bath access follows drawing evidence above' : 'Source label, placement unverified'}</>}
              </li>
            ))}
          </ol>
        )}
      <p className="mt-3 text-xs font-semibold text-muted-foreground">{evidence.summary}</p>
      {evidence.windowAudit?.some(row => row.proposedWindowScope) && <p className="mt-2 text-xs font-semibold text-muted-foreground">W = new or upgraded window</p>}
      <Explanation>
        <div className="space-y-2 text-xs text-muted-foreground">
          {propertyReview(reviewId).observations.map(line => <p key={line}>{line}</p>)}
          <p>{propertyReview(reviewId).accessStatus}</p><p>{propertyReview(reviewId).windowStatus}</p>
        </div>
        <p className="text-sm text-muted-foreground">{evidence.note}</p>
        <p className="mt-2 text-xs text-muted-foreground">{evidence.allocation}</p>
        {!evidence.windowAudit && <p className="mt-2 text-xs text-muted-foreground">Window/photo associations unreviewed for this proposal. No upstairs window work by owner scope; basement new or upgraded work uses standalone W only when supported by this property's own review. No copied window positions or compliance claim.</p>}
        {evidence.windowAudit && <WindowEvidenceTable rows={evidence.windowAudit} />}
        {evidence.accessAudit && (
          <div className="mt-3 rounded-lg border border-hc-border p-3">
            <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Room-by-room common access audit · concept only, not code/egress certification</h3>
            <ul className="list-disc pl-5 text-xs text-muted-foreground">{evidence.accessAudit.map(line => <li key={line}>{line}</li>)}</ul>
          </div>
        )}
      </Explanation>
    </section>
  );
}

function EvidenceImage({url,alt}:{url:string|null;alt:string}) {
  const [fallback,setFallback]=useState(false);const [failed,setFailed]=useState(false);
  if(!url||failed) return <p className="min-h-40 bg-muted p-5 text-muted-foreground">Authoritative current drawing supplied; image unavailable to browser. No replacement fabricated.</p>;
  return <img loading="lazy" decoding="async" className="w-full" src={fallback?driveImageFallbackUrl(url)??url:url} alt={alt} referrerPolicy="no-referrer" onError={()=>fallback?setFailed(true):setFallback(true)}/>;
}

function PitchPage() {
  const { dealId } = Route.useParams();
  const {data}=useSuspenseQuery(dealQuery(dealId));

  if (!data?.deal) {
    return (
      <div className="min-h-screen bg-hc-page p-10">
        <h1 className="text-2xl font-extrabold text-hc-navy">Deal not found</h1>
        <p className="mt-2 text-muted-foreground">No row in the deals sheet has Deal ID "{dealId}".</p>
        <Link to="/" className="mt-4 inline-block text-sm font-semibold text-hc-blue">
          All deals
        </Link>
      </div>
    );
  }

  return <LoadedPitch key={dealId} data={data} dealId={dealId} />;
}

function LoadedPitch({ data, dealId }: { data: Awaited<ReturnType<typeof getDeal>>; dealId: string }) {
  const seed = data.analysis;
  const session = useAnalysisSession();
  const analysis = session.inputs[dealId] ?? seed?.inputs;
  const setAnalysis = (value: NonNullable<typeof analysis>) => session.update(dealId, value);
  const { deal, capex, callouts } = data;
  if (!deal || !analysis || !seed) return null;
  const result = modelSummary(analysis, seed.inputs);
  const drawnCount = result.drawnCount;
  const rentRoll = analysis.rooms.map((room, i) => ({ rowNumber: i + 2, cells: { Room: room.name, Level: room.level, Bath: room.bath, 'Rent/mo': room.rent == null ? '' : String(room.rent) } }));
  const cells = deal.cells;

  const originalPitch = computePitch(cells, data.rentRoll, capex);
  const pitch = { ...originalPitch, cashInvested: result.cashInvested, monthlyCashFlow: result.monthlyCashFlow, annualCashFlow: result.annualCashFlow, capexTotal: result.capexTotal, rentRollTotal: result.grossRent };
  const kind = verdictKind(cells["Verdict"]);
  const verdict = VERDICT_STYLES[kind];
  const why = cells["Why"] ?? "";
  const price = data.research?.displayPrice ?? parseNumber(deal.cells['Price']);
  // Sourced square footage from the Research sheet `sqft` column; omitted cleanly when missing.
  const sqft = parseNumber(data.research?.cells['sqft'] ?? cells['Sqft'] ?? cells['Sq Ft'] ?? cells['Square Feet']);
  // Sourced current vs proposed bed/bath counts from the Research sheet; omitted cleanly when missing.
  // Source bath cells read like "4 Bathrooms", so take the leading number.
  const parseCount = (raw: string | undefined) => { const m = raw?.match(/\d+(?:\.\d+)?/); return m ? Number(m[0]) : null; };
  const rc = data.research?.cells;
  const curBeds = parseCount(rc?.['current_beds'] ?? cells['Current Rooms']);
  const curBaths = parseCount(rc?.['current_baths'] ?? '');
  const propBeds = parseCount(rc?.['converted_beds'] ?? cells['Post-Conversion Rooms']);
  const propBaths = parseCount(rc?.['converted_baths'] ?? '');
  const coc = result.cocPercent == null ? null : fmtPct(result.cocPercent);
  const noi = result.monthlyNoi == null ? null : result.monthlyNoi * 12;
  const grossRent = parseNumber(cells["Gross Rent/mo"]);
  const currentRooms = cells["Current Rooms"] ?? "";
  const baths = cells["Baths"] ?? "";

  const mainPlanUrl = driveImageUrl(cells["Floorplan Main"]);
  const basementRaw = (cells["Floorplan Basement"] ?? "").trim();
  const hasBasement = basementRaw !== "" && basementRaw.toLowerCase() !== "none";
  const basementPlanUrl = driveImageUrl(basementRaw);
  const parkingUrl = driveImageUrl(cells["Parking Map"]);
  const parkingSpots = (cells["Parking Spots"] ?? "").trim();
  const parkingNote = (cells["Parking Note"] ?? "").trim();

  const mainCallouts = callouts.filter((c) => (c.cells["Plan"] ?? "").trim().toLowerCase() === "main");
  const basementCallouts = callouts.filter((c) => (c.cells["Plan"] ?? "").trim().toLowerCase() === "basement");

  const listingUrl = safeExternalUrl(cells["Listing URL"]);
  const detailLink = safeExternalUrl(cells["Detail Link"]);

  return (
    <div className="min-h-screen bg-hc-page font-sans text-hc-navy">
      <header
        className="text-primary-foreground"
        style={{ background: "linear-gradient(135deg, var(--hc-navy), var(--hc-deep))" }}
      >
        <div className="mx-auto max-w-[1120px] px-5 py-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-lg font-extrabold">
              <span className="rounded-lg bg-card px-2 py-1.5">
                <img
                  src={fiTeamLogo.url}
                  alt="The FI Team — Agents Who Invest, brokered by eXp Realty"
                  className="h-8 w-auto"
                />
              </span>
              <span className="text-sm font-medium text-primary-foreground/80">Co-Living Deal</span>
            </div>
            <Link to="/" className="text-sm font-semibold text-primary-foreground/70 hover:text-primary-foreground">
              All deals
            </Link>
          </div>
          <h1 className="mt-7 text-3xl font-extrabold tracking-tight md:text-4xl">
            {cells["Address"] || dealId}
          </h1>
          <div className="mt-1 text-2xl font-bold text-hc-amber">
            List price {price != null ? fmtMoney(price) : "Unavailable"}
            {sqft != null && <span className="ml-2 whitespace-nowrap text-lg font-semibold text-primary-foreground/80">· {sqft.toLocaleString('en-US')} sq ft</span>}
            {curBeds != null && <span className="ml-2 whitespace-nowrap text-lg font-semibold text-primary-foreground/80">· {curBeds} bd</span>}
            {curBaths != null && <span className="ml-2 whitespace-nowrap text-lg font-semibold text-primary-foreground/80">· {curBaths} ba</span>}
          </div>
          {(propBeds != null || propBaths != null) && (
            <p className="mt-1 text-sm text-primary-foreground/80">
              Current listing above · Future {analysis.rooms.length} bd{(propBaths ?? curBaths) != null ? ` · ${propBaths ?? curBaths} ba` : ''} · proposed concept
            </p>
          )}
          {data.research && data.research.displayPrice !== data.research.fiPrice && <p className="mt-1 text-sm text-hc-navy-muted">FI Team list {data.research.fiPrice == null ? 'Unavailable' : fmtMoney(data.research.fiPrice)}</p>}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            {listingUrl && (
              <a
                href={listingUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-hc-amber px-5 py-3 text-center text-sm font-bold text-hc-navy transition hover:opacity-90"
              >
                View listing
              </a>
            )}
            {detailLink && (
              <a
                href={detailLink}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border-2 border-primary-foreground px-5 py-3 text-center text-sm font-bold transition hover:bg-primary-foreground/10"
              >
                {data.overlayId ? 'Open deal calculator Sheet' : 'View property report'}
              </a>
            )}
          </div>
          <div className="mt-7 overflow-hidden rounded-lg">
            <MlsPhotoCarousel photos={parseMlsPhotos(data.research?.cells ?? cells)} address={cells['Address'] || dealId} researchId={data.research?.id ?? dealId} prominent />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1120px] px-5">
        <section className="py-7">
          <SectionTitle>Numbers overview</SectionTitle>
          <p className="mb-3 text-sm text-muted-foreground">{result.missing.length ? "Returns unavailable · check validation below" : "Estimated"}</p>

          <div className="grid grid-cols-2 gap-3.5 min-[800px]:grid-cols-4">
            <StatCard label={pitch.cashInvested==null?"Invested subtotal":"Cash invested*"} highlight sub={pitch.cashInvested==null?"Known upfront inputs only; not total cash required":undefined}>
              <Num value={pitch.cashInvested??result.investedSubtotal} money />
            </StatCard>
            <StatCard label={pitch.monthlyCashFlow==null?"Provisional cash flow":"Monthly cash flow"} sub={pitch.monthlyCashFlow==null?"Excludes unresolved inputs; not complete returns":undefined}>
              <Num value={pitch.monthlyCashFlow??result.provisionalCashFlow} money />
            </StatCard>
            <StatCard label="Annual cash flow">
              <Num value={pitch.annualCashFlow} money />
            </StatCard>
            <StatCard label={coc==null?"Provisional CoC":"CoC %*"} highlight sub={coc==null?"Only shown with complete invested denominator":undefined}>
              {coc ?? (result.provisionalCoc==null?null:fmtPct(result.provisionalCoc)) ?? <span className="text-muted-foreground">Unavailable</span>}
            </StatCard>
            <StatCard label="NOI / yr">
              <Num value={noi} money />
            </StatCard>
            <StatCard label="CapEx total">
              <Num value={pitch.capexTotal} money />
            </StatCard>
            <StatCard label="Proposed bedrooms" sub={`${drawnCount ?? 'Unknown'} drawn; current listing ${curBeds ?? currentRooms}; concept, not certified`}>
              {analysis.rooms.length || <span className="text-muted-foreground">Unavailable</span>}
            </StatCard>
            <StatCard label="Baths">
              {propBaths ?? curBaths ?? <span className="text-muted-foreground">Unverified</span>}
            </StatCard>
            <StatCard label="Gross room rent / mo"><Num value={result.grossRent} money /></StatCard>
            <StatCard label="Gross income / mo" sub="Room rent + tenant utilities + other income"><Num value={result.grossIncome} money /></StatCard>
          </div>
          {result.missing.length>0&&<p className="mt-3 text-xs text-muted-foreground">Validation: {result.missing.join(', ')}. Subtotals are not complete returns or total cash required.</p>}
          {pitch.capexMismatch && (
            <p className="mt-3 text-xs text-muted-foreground">
              Note: the CapEx tab total differs from Conversion Budget + Furnishing on the deal row.
            </p>
          )}
        </section>

        <AnalysisEditor seed={seed} value={analysis} onChange={value => { setAnalysis(value); }} onReset={() => setAnalysis(seed.inputs)} />

        <PlanSection
          key={`${dealId}-main-${mainPlanUrl}`}
          title={planEvidence(cells['Floorplan Main'] || '', 'main', data.research?.id).title}
          evidence={planEvidence(cells['Floorplan Main'] || '', 'main', data.research?.id)}
          reviewId={data.research?.id}
          imageUrl={mainPlanUrl}
          callouts={mainCallouts}
          placeholder="Floor plan coming soon"
        />

        {hasBasement && (
          <PlanSection
            key={`${dealId}-basement-${basementPlanUrl}`}
            title="Basement level"
            evidence={planEvidence(basementRaw, 'basement', data.research?.id)}
            reviewId={data.research?.id}
            imageUrl={basementPlanUrl}
            callouts={basementCallouts}
            placeholder="Floor plan coming soon"
          />
        )}

        <section className="py-7">
          <SectionTitle>Parking</SectionTitle>
          {data.research && locationEvidence[data.research.id] ? <ParkingEvidence id={data.research.id}/> : parkingUrl ? (
            <ParkingImage key={`${dealId}-${parkingUrl}`} url={parkingUrl} spots={parkingSpots} note={parkingNote} />
          ) : (
            <div
              className="relative flex min-h-[300px] items-center justify-center rounded-xl font-semibold text-muted-foreground"
              style={STRIPES}
            >
              Parking image coming soon
              {(parkingSpots || parkingNote) && <ParkingCallout spots={parkingSpots} note={parkingNote} />}
            </div>
          )}
        </section>

        <section className="py-7">
          <SectionTitle>Rent roll by room</SectionTitle>
          {rentRoll.length === 0 ? (
            <p className="rounded-xl bg-card p-5 text-sm text-muted-foreground shadow-sm">
              Not yet itemized.
              {grossRent != null && (
                <>
                  {" "}
                  Total gross rent from the deal row:{" "}
                  <span className="font-bold text-hc-navy">{fmtMoney(grossRent)}</span>
                </>
              )}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl bg-card shadow-sm">
              <table className="w-full min-w-[560px] border-collapse text-sm">
                <thead>
                  <tr className="bg-hc-navy text-left text-xs uppercase tracking-wide text-primary-foreground">
                    <th className="px-4 py-3 font-semibold">Room</th>
                    <th className="px-4 py-3 font-semibold">Level</th>
                    <th className="px-4 py-3 font-semibold">Bath</th>
                    <th className="px-4 py-3 font-semibold">Evidence</th><th className="px-4 py-3 text-right font-semibold">Rent / mo</th>
                  </tr>
                </thead>
                <tbody>
                  {rentRoll.map((r) => {
                    const rent = parseNumber(r.cells["Rent/mo"]);
                    return (
                      <tr key={r.rowNumber} className="border-b border-hc-border last:border-0">
                        <td className="whitespace-nowrap px-4 py-3 font-semibold">{r.cells["Room"]}</td>
                        <td className="px-4 py-3">{r.cells["Level"]}</td>
                        <td className="px-4 py-3">{r.cells["Bath"]}</td>
                        <td className="px-4 py-3 text-xs">{analysis.rooms[r.rowNumber - 2]?.evidence || "Drawing/bath access unclear"}</td><td className="px-4 py-3 text-right">
                          <Num value={rent} money />
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-hc-page font-extrabold">
                    <td className="px-4 py-3" colSpan={4}>
                      Total gross rent
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Num value={pitch.rentRollTotal} money />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="py-7 pb-10">
          <SectionTitle>CapEx line items</SectionTitle>
          <Explanation>
          {capex.length === 0 ? (
            <p className="rounded-xl bg-card p-5 text-sm text-muted-foreground shadow-sm">
              Not yet itemized.
              {pitch.capexTotal != null && (
                <>
                  {" "}
                  Total CapEx from the deal row:{" "}
                  <span className="font-bold text-hc-navy">{fmtMoney(pitch.capexTotal)}</span>
                </>
              )}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl bg-card shadow-sm">
              <table className="w-full min-w-[480px] border-collapse text-sm">
                <thead>
                  <tr className="bg-hc-navy text-left text-xs uppercase tracking-wide text-primary-foreground">
                    <th className="px-4 py-3 font-semibold">Item</th>
                    <th className="px-4 py-3 text-right font-semibold">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.capex.map((c, i) => {
                    const cost = c.cost;
                    return (
                      <tr key={i} className="border-b border-hc-border last:border-0">
                        <td className="px-4 py-3">{c.name}</td>
                        <td className="px-4 py-3 text-right">
                          <Num value={cost} money />
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-hc-page font-extrabold">
                    <td className="px-4 py-3">Total CapEx</td>
                    <td className="px-4 py-3 text-right">
                      <Num value={pitch.capexTotal} money />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          </Explanation>
        </section>
      </main>

      <footer className="bg-hc-navy py-7 text-sm text-hc-navy-muted">
        <div className="mx-auto max-w-[1120px] px-5">
          The FI Team · Co-living analysis uses sheet values and labeled session estimates, not an offer or investment advice. Deal ID {dealId} ·
          Updated {cells["Date Found"] || "Unavailable"} ·{" "}
          <a
            href={data.sheetUrl}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-hc-amber hover:underline"
          >
            {data.overlayId ? 'Deal calculator Sheet' : 'Research Sheet'}
          </a>
        </div>
      </footer>
    </div>
  );
}

function ParkingCallout({ spots, note }: { spots: string; note: string }) {
  return (
    <div className="absolute right-3 bottom-3 max-w-[70%] rounded-xl bg-hc-navy px-4 py-3 text-primary-foreground md:right-4 md:bottom-4">
      <div className="text-xs font-semibold">Potential spaces · ESTIMATED/unverified</div>
      <div className="text-2xl font-extrabold text-hc-amber">{spots || "Unavailable"}</div>
      <Explanation>{note && <p>{note}</p>}<p>Source claim only. Parking/photo review unverified; shared curb, neighbor cuts and egress clearance unknown. Not legal capacity.</p></Explanation>
    </div>
  );
}

function ParkingImage({ url, spots, note }: { url: string; spots: string; note: string }) {
  const [failed, setFailed] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  if (failed) {
    return (
      <div
        className="relative flex min-h-[300px] items-center justify-center rounded-xl font-semibold text-muted-foreground"
        style={STRIPES}
      >
        Parking image coming soon
        {(spots || note) && <ParkingCallout spots={spots} note={note} />}
      </div>
    );
  }
  return (
    <div className="relative">
      <img
        src={useFallback ? driveImageFallbackUrl(url) ?? url : url}
        alt="Existing parking aerial evidence, spaces unverified"
        referrerPolicy="no-referrer"
        className="w-full rounded-xl"
        onError={() => useFallback ? setFailed(true) : setUseFallback(true)}
      />
      {(spots || note) && <ParkingCallout spots={spots} note={note} />}
    </div>
  );
}
