import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

// Nitro picks the Vercel preset when VERCEL=1 (set by Vercel builds) and a Node
// server otherwise, so `bun run build && bun run start` works locally.
const nitroPreset = process.env["VERCEL"] ? "vercel" : "node";

export default defineConfig({
  plugins: [
    tanstackStart({
      // Keep the SSR error wrapper in src/server.ts.
      server: { entry: "server" },
    }),
    nitro({ preset: nitroPreset }),
    viteReact(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
});
