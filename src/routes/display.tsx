import { Flower2, Sparkles } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";

import weddingArch from "@/assets/love-story-wedding-arch.png";

export const Route = createFileRoute("/display")({
  head: () => ({
    meta: [
      { title: "Wedding Display | Love Story Runner" },
      {
        name: "description",
        content: "A 16:9 welcome display for the Love Story Runner wedding-day game.",
      },
      { property: "og:title", content: "Wedding Display | Love Story Runner" },
      {
        property: "og:description",
        content: "A 16:9 welcome display for the Love Story Runner wedding-day game.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DisplayPage,
});

function DisplayPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center overflow-hidden bg-background p-3 text-center sm:p-6">
      <section className="display-stage isolate flex items-center justify-center overflow-hidden rounded-md border border-wedding-gold/80 bg-cream shadow-lg">
        <img
          src={weddingArch}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-20 size-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-background/20" aria-hidden="true" />
        <div className="entrance-rise relative mx-auto flex max-w-4xl flex-col items-center px-4 py-6 sm:px-10 sm:py-10">
          <div className="mb-3 grid size-10 place-items-center rounded-full border border-wedding-gold/70 bg-card/90 text-marigold sm:mb-5 sm:size-14">
            <Flower2 aria-hidden="true" className="size-5 sm:size-7" />
          </div>
          <p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase text-maroon sm:text-sm">
            <Sparkles aria-hidden="true" className="size-4 text-marigold" />
            The celebration begins
          </p>
          <h1 className="font-display text-4xl font-semibold leading-tight text-maroon sm:text-6xl lg:text-8xl">
            Love Story Runner
          </h1>
          <p className="mt-2 font-display text-xl font-medium text-maroon/85 sm:mt-4 sm:text-3xl">
            Your display is ready
          </p>
        </div>
        <div className="absolute bottom-3 left-0 right-0 flex justify-center sm:bottom-6">
          <span className="rounded-full border border-wedding-gold/70 bg-card/90 px-4 py-2 text-xs font-semibold text-maroon sm:text-sm">
            WELCOME, NEWLYWEDS
          </span>
        </div>
      </section>
    </main>
  );
}