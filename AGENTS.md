<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules

- Owner-directed room/access/window evidence and photo audit live in pure drawing/evidence modules separate from underwriting; registered annotations preserve geometry and informational allowances never alter calculator seeds.

- Both sheets are read through GET-only connector access in `sheets.server.ts`; pure header-keyed Research eligibility/address normalization lives in `research.ts`, while shared nullable financial math and source seeding live in `underwriting.ts`, while denser pitch helpers remain in `deals.ts` so moved columns are safe.
- Research IDs key acquisition routes; denser rows overlay only on normalized street address match, while legacy DEN routes remain available. Missing optional pitch data uses empty states rather than invented content.
- Research image/parking headers map directly into pitch cells; Research Callouts use Research IDs without an overlay, and denser overlays keep their own plans/callouts paired to avoid misplaced pins.
- Calculator inputs live only in React state in a keyed loaded pitch component; Reset clones the server seed to restore originals without any persistence or sheet mutation.
- Pass original Research cells separately to the pure calculator seed; denser RentRoll takes priority, and model rent/count/utility fields are header-keyed so identity and overlay changes cannot substitute constants.
- Leaflet imports are isolated behind lazy ClientOnly rendering and a dynamic effect import to prevent browser globals entering SSR.
- Pitch percentage normalization belongs in the pure deals module so verification scripts and the page use the same calculation.
- Drive images try the public view URL first, then the image-serving fallback before showing an empty slot; reset image state per deal to prevent failed images hiding subsequent deals.
- Home and deal routes are public top-level routes with no app sign-in; GET server functions use server-only connector credentials without visitor auth, so preview links open immediately.
- Do not restore auth gates, OTP endpoints, auth listeners or bearer attachment for these anonymous preview reads; keep CSRF/error middleware and sheet credentials server-only.
- MLS photos use a shared pure header parser and one Embla carousel on cards and pitches; card image links are separate from controls to prevent nested interactive navigation.
- Sanctioned listing-photo fallbacks live in a shared evidence module, with distinct durable exact-property images and source provenance; both card and hero prefer them for documented zero-byte source URLs and otherwise retain live-source priority.

- Home and detail resolve the same source bundle and pure underwriting seed; latest Deal ID rows and latest numeric room keys win, and aggregate CapEx rows never join item sums, preventing duplicate financial inputs.
- Original spreadsheet Inputs column B is read by row label; historical PDF evidence is keyed by report document in `report-evidence.ts`, with discrepancies and missing values disclosed rather than converted to zero.
- Historical PDF screenshots retain their reported rounded values and omitted-expense reproduction separately from the shared current scenario; percentage expenses use gross income dynamically and cannot also join fixed-dollar expenses.
- Same-level comparisons and informational level allowances use pure plan-evidence identity; allowances never enter underwriting budgets, durable current/corrected copies retain provenance, annotation-only corrections preserve geometry, unknown drawings stay missing and duplicate/misplaced overlays are suppressed.
- GET sheet reads cache promises for a short freshness window; explicit Refresh bypasses cached reads and home primes detail Query bundles without changing source cells.
- Human-authorized coordinate evidence is applied only after unchanged source eligibility/coordinate validation; original Research cells remain intact and overrides expose provenance.
- Human-supplied parking aerials use immutable asset pointers with original dimensions and attribution; overlays are percentage-positioned independent illustrations, never geometry/capacity derived from unverified reports.
- Parking image and overlays share an explicit intrinsic-ratio box to prevent hosted sizing conflicts; source claims are separate from illustrated evidence.
- Negative room rents stay visible in session state but pure underwriting invalidates rent-dependent totals; Reset restores the seed.

- Standard modeled scenarios transform a preserved source seed in a separate pure module; per-room expense factors use active modeled rows, and management basis is explicit so source reproduction stays unchanged.
- Carousel geometry stays mounted while only selected and neighboring image sources attach; drag capture suppresses photo-link navigation without suppressing arrow/dot focus.

- Shared underwriting exposes separately named known-input cash-flow and invested subtotals without mutating nullable inputs; provisional CoC requires a complete positive invested denominator so partial cash cannot inflate returns.

- Parent-authorized public listing financial evidence is isolated in a pure evidence module and applied only by the standard scenario; original seeds/PDF reproduction remain unchanged to preserve historical reconciliation.

- Public current plan assets pair only with exact Research drawing identity and matching level; original full-page provenance/disclaimers and unmodified proposed drawings stay separate so composites or unrelated drawings cannot become Before evidence.
