import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import fiTeamLogo from "@/assets/the-fi-team-logo.png.asset.json";

export function Shell({ children }: { children: ReactNode }) {

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <header className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex flex-wrap items-center gap-3 text-lg font-extrabold">
            <span className="rounded-lg bg-card px-2 py-1.5">
              <img
                src={fiTeamLogo.url}
                alt="The FI Team — Agents Who Invest, brokered by eXp Realty"
                className="h-8 w-auto"
              />
            </span>
            <span className="text-sm font-medium opacity-80">Co-Living Deal</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-6 text-xs leading-relaxed text-muted-foreground">
          All numbers come from Craig's deals sheet and are estimates, not investment advice.
          Verify every number before you make an offer.
        </div>
      </footer>
    </div>
  );
}
