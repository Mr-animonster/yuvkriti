import { Heart, Smartphone } from "lucide-react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { WeddingPageHeader } from "@/components/wedding-page-header";

export const Route = createFileRoute("/play")({
  validateSearch: (search: Record<string, unknown>) => ({
    role: search["role"] === "groom" ? "groom" : "bride",
  }),
  head: () => ({
    meta: [
      { title: "Partner Controller | Love Story Runner" },
      {
        name: "description",
        content: "A phone-ready partner controller for the Love Story Runner wedding-day game.",
      },
      { property: "og:title", content: "Partner Controller | Love Story Runner" },
      {
        property: "og:description",
        content: "A phone-ready partner controller for the Love Story Runner wedding-day game.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlayPage,
});

function PlayPage() {
  const { role } = Route.useSearch();
  const partner = role === "bride" ? "Bride" : "Groom";

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <WeddingPageHeader />
      <section className="mx-auto flex min-h-[calc(100dvh-4.5rem)] max-w-xl flex-col justify-center px-4 py-10 sm:px-8">
        <div className="rounded-md border border-wedding-gold/70 bg-card p-6 text-center shadow-sm sm:p-10">
          <div className="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-secondary text-maroon sm:size-20">
            <Smartphone aria-hidden="true" className="size-8 sm:size-10" />
          </div>
          <p className="text-sm font-semibold text-marigold">YOUR PHONE CONTROLLER</p>
          <h1 className="mt-2 font-display text-4xl font-semibold text-foreground sm:text-5xl">
            Joining as {partner}
          </h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Your seat is saved. Waiting for the display to begin.
          </p>
          <div className="mx-auto mt-7 flex max-w-sm items-center justify-center gap-3 rounded-md border border-border bg-background px-4 py-3 text-sm font-medium text-foreground">
            <span className="relative grid size-3 shrink-0 place-items-center">
              <span className="absolute size-3 animate-ping rounded-full bg-wedding-gold/60" />
              <span className="relative size-2 rounded-full bg-wedding-gold" />
            </span>
            <span>Waiting for the display</span>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3">
            <Button asChild variant={role === "bride" ? "default" : "outline"}>
              <Link to="/play" search={{ role: "bride" }}>
                <Heart aria-hidden="true" />
                Bride
              </Link>
            </Button>
            <Button asChild variant={role === "groom" ? "default" : "outline"}>
              <Link to="/play" search={{ role: "groom" }}>
                <Heart aria-hidden="true" />
                Groom
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}