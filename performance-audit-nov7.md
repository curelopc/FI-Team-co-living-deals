# Nov7 local performance audit

Target: http://localhost:8080, Chromium headless1280×1800. Three independent contexts, each cold-browser then warm-browser. No throttling. Each readiness observation is followed by a fixed2second network observation window. Raw responses include MIME/status/body byte counts. Cold browser is NOT a cold server or hosted result; server cache was not forcibly purged. Vite compilation/hydration and upstream/network variability remain confounders. No hosted401 tests.

## Confirmed waste and changes

- Before: each Elmira card/detail issued30 known zero-byte Matrix requests before fallback. After: sanctioned exact-property durable photos selected immediately for that documented source key. Only current and adjacent image URLs attach; carousel geometry/dots stay mounted.
- Home previously awaited Research before the shared six-tab pass. Now six tabs start together; raw tab singleflight remains60seconds. Explicit Refresh bypasses every tab and linked Inputs cache. Home carries exact detail bundles and primes the detail Query cache on card intent/navigation. This is per-instance freshness, not guaranteed cross-worker cache.
- Route loaders now prime Query-backed SSR readiness. Existing map remains lazy ClientOnly; map/pin interactions preserved. No speculative map replacement or new backend.

## Observed readiness ms (median [min,max], n=3 each)

| Flow | Browser condition | Before | After |
|---|---|---|---|
| / | browser-cold | 1694.4 [1592.4,7017.6] | 429.4 [300.5,607.1] |
| / | browser-warm | 1040.7 [879.4,1082.0] | 760.9 [412.9,763.1] |
| /deal/40 | browser-cold | 1530.4 [1430.4,1633.7] | 601.5 [222.4,1818.1] |
| /deal/40 | browser-warm | 1057.8 [923.5,1113.7] | 968.5 [933.0,1072.3] |
| /deal/6 | browser-cold | 1272.2 [894.0,1396.5] | 723.9 [713.7,838.1] |
| /deal/6 | browser-warm | 991.3 [850.6,1043.0] | 980.8 [745.8,1232.4] |
| /deal/8 | browser-cold | 838.2 [750.1,1127.8] | 516.0 [209.1,651.3] |
| /deal/8 | browser-warm | 828.6 [828.4,1003.1] | 1051.6 [1003.3,1128.9] |
| card-to-40 | browser-cold | 469.6 [356.8,702.1] | 237.1 [227.4,554.3] |
| card-to-40 | browser-warm | 277.3 [272.9,291.9] | 249.5 [210.6,297.4] |

Home/cards ready = first populated article; direct deal/data ready = first section; card navigation ready = Numbers overview. Those markers are not proof that every image/map tile has finished. Warm measurements are noisy: Grove warm regressed, Elmira warm roughly unchanged; do not claim universal speedup.

## Requests and decoded response bytes (median, fixed2second window)

| Page | Condition | Before requests/bytes | After requests/bytes |
|---|---|---|---|
| / | browser-cold | 225 / 16185065 | 141 / 12765048 |
| / | browser-warm | 240 / 16475810 | 248 / 13474102 |
| /deal/40 | browser-cold | 206 / 16828910 | 159 / 15279533 |
| /deal/40 | browser-warm | 209 / 17037836 | 143 / 15095464 |
| /deal/6 | browser-cold | 149 / 15140024 | 143 / 13859582 |
| /deal/6 | browser-warm | 152 / 14529515 | 143 / 13859582 |
| /deal/8 | browser-cold | 149 / 14292904 | 143 / 14203279 |
| /deal/8 | browser-warm | 152 / 15113434 | 143 / 14203279 |

Bytes are decoded response bodies, not wire/compressed bytes; includes development modules, photos and map tiles. Responses may complete after the observation window, so totals are bounded observations, not full page transfer size. Raw files: performance-before-nov7.json and performance-after-nov7.json. Intermediate iteration measurements retained only temporarily.

## Validation
105 unit/integration tests passed. Six local desktop/mobile deal cases: padding, metrics, photos, Enter and marker direct navigation; arrow/dot/drag/keyboard nonnavigation;10→16/max/Reset10; all30 Elmira card/hero gallery sources remain distinct, hero decode1600px per photo; aerial ratio1920/1072. No runtime page errors. Screenshot URLs/hashes in verification-exports.json. Hosted recheck remains with parent.

Latest after samples include parent-video gross16%/historical-rent estimate/parking revision; baseline is unchanged. These financial/annotation changes do not explain a universal loading improvement; Grove warm remains slower. Parent watched video; executor did not.
