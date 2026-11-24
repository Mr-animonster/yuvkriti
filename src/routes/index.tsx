import { ArrowRight, Flower2, Heart, MonitorPlay } from "lucide-react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import weddingArch from "@/assets/love-story-wedding-arch.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Love Story Runner | A Wedding Day Game" },
      {
        name: "description",
        content: "A two-player wedding day game for the couple, with a shared display and phone controllers.",
      },
      { property: "og:title", content: "Love Story Runner | A Wedding Day Game" },
      {
        property: "og:description",
        content: "A two-player wedding day game for the couple, with a shared display and phone controllers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <section className="relative isolate flex min-h-[22rem] flex-col items-center justify-center overflow-hidden bg-cream px-5 py-14 text-center sm:min-h-[27rem] lg:min-h-[31rem]">
        <img
          src={weddingArch}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-20 size-full object-cover object-center"
        />
        <div className="absolute inset-0 -z-10 bg-background/25" aria-hidden="true" />
        <div className="entrance-rise mx-auto flex max-w-4xl flex-col items-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-wedding-gold/70 bg-card/90 px-4 py-2 text-sm font-semibold text-maroon shadow-sm">
            <Flower2 aria-hidden="true" className="size-4 text-marigold" />
            A wedding day game for two
          </div>
          <h1 className="font-display text-6xl font-semibold leading-[0.92] text-maroon sm:text-7xl lg:text-8xl">
            Love Story
            <span className="block">Runner</span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-maroon/90 sm:text-lg">
            One celebration. Two players. A story that belongs to you.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-8 sm:pb-14 sm:pt-10">
        <h2 className="mb-5 text-center font-display text-3xl font-semibold text-foreground sm:text-4xl">
          Choose your seat
        </h2>
        <div className="grid gap-3 md:grid-cols-3 md:gap-4">
          <Button
            asChild
            size="lg"
            className="min-h-20 w-full justify-between whitespace-normal px-4 py-4 text-left text-base"
          >
            <Link to="/display" aria-label="Host Game (Display)">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-foreground/10">
                <MonitorPlay aria-hidden="true" className="size-5" />
              </span>
              <span className="min-w-0 flex-1">Host Game (Display)</span>
              <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
            </Link>
          </Button>
          <Button
            asChild
            variant="secondary"
            size="lg"
            className="min-h-20 w-full justify-between whitespace-normal px-4 py-4 text-left text-base"
          >
            <Link to="/play" search={{ role: "bride" }} aria-label="Join as Bride">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-card/70 text-maroon">
                <Heart aria-hidden="true" className="size-5" />
              </span>
              <span className="min-w-0 flex-1">Join as Bride</span>
              <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="min-h-20 w-full justify-between whitespace-normal border-wedding-gold/80 bg-card px-4 py-4 text-left text-base hover:bg-secondary"
          >
            <Link to="/play" search={{ role: "groom" }} aria-label="Join as Groom">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary text-maroon">
                <Heart aria-hidden="true" className="size-5" />
              </span>
              <span className="min-w-0 flex-1">Join as Groom</span>
              <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
            </Link>
          </Button>
        </div>
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Flower2 aria-hidden="true" className="size-4 text-wedding-gold" />
          <span>Made for the moment you say “I do.”</span>
        </div>
      </section>
    </main>
  );
}