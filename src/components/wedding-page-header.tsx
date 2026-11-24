import { Flower2 } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function WeddingPageHeader() {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-border/70 px-4 py-4 sm:px-8">
      <Link to="/" className="inline-flex min-w-0 items-center gap-3 text-foreground">
        <span className="grid size-10 shrink-0 place-items-center rounded-full border border-wedding-gold/70 bg-card text-marigold">
          <Flower2 aria-hidden="true" className="size-5" />
        </span>
        <span className="truncate font-display text-xl font-semibold sm:text-2xl">
          Love Story Runner
        </span>
      </Link>
      <Link
        to="/"
        className="shrink-0 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Home
      </Link>
    </header>
  );
}