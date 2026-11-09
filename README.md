# The FI Team co-living deals

Denver-area acquisition listings and co-living analysis for The FI Team. TanStack Start, Vite, React, and Tailwind CSS.

## Local development

Requires [Bun](https://bun.sh).

```sh
bun install
bun run dev
```

Production build and local server:

```sh
bun run build
bun run start
```

`bun run typecheck` runs `tsc --noEmit`. `bun run test` runs Vitest.

## Vercel

Framework preset: **TanStack Start** (`tanstack-start` in `vercel.json`).

| Setting | Value |
| --- | --- |
| Install command | `bun install` (detected from `bun.lock`) |
| Build command | `bun run build` |
| Output directory | Leave empty. Nitro writes the Vercel Build Output API to `.vercel/output` when `VERCEL=1`. Do not set the output directory to `dist`. |

`vite.config.ts` uses the Nitro Vite plugin. A Vercel build sets `VERCEL=1`, so Nitro uses the `vercel` preset and the app runs as Vercel Functions (included on the free plan). A local build uses the `node` preset and `bun run start` serves `.output/server/index.mjs`.

The free plan is enough. This app does not need a paid runtime.

## Environment variables

Supabase is not used at runtime. `src/integrations/supabase` is leftover client scaffolding. Nothing in the routes, server functions, or request middleware imports it. `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PROJECT_ID`, and the matching `VITE_SUPABASE_*` variables are not required. `.env.example` still lists them so the unused client can be wired later. Do not commit values.

Live sheet refresh uses the Lovable connector gateway in `src/lib/sheets.server.ts`. That path needs:

```
LOVABLE_API_KEY=
GOOGLE_SHEETS_API_KEY=
```

Without those keys, deal pages serve `src/lib/published-deals.json`, a snapshot of the three active deals taken from the published site. Refresh still reports an error until the keys are set. Never commit key values.
