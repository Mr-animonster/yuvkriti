import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WeddingPageHeader } from "@/components/wedding-page-header";
import { getSetupAccess, lockSetup, unlockSetup } from "@/lib/setup.functions";

export const Route = createFileRoute("/setup")({
  loader: () => getSetupAccess(),
  head: () => ({
    meta: [
      { title: "Private Setup | Love Story Runner" },
      {
        name: "description",
        content: "A private space to prepare the Love Story Runner wedding-day experience.",
      },
      { property: "og:title", content: "Private Setup | Love Story Runner" },
      {
        property: "og:description",
        content: "A private space to prepare the Love Story Runner wedding-day experience.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SetupPage,
});

function SetupPage() {
  const access = Route.useLoaderData();

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <WeddingPageHeader />
      {access.unlocked ? (
        <SetupWorkspace />
      ) : (
        <SetupLock configured={access.configured} />
      )}
    </main>
  );
}

function SetupLock({ configured }: { configured: boolean }) {
  const unlock = useServerFn(unlockSetup);
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = new FormData(event.currentTarget).get("password");
    if (typeof password !== "string") return;

    setPending(true);
    setMessage("");
    try {
      const result = await unlock({ data: { password } });
      if (result.ok) {
        await router.invalidate();
        return;
      }
      setMessage(
        result.configured
          ? "That passcode didn’t unlock this setup space."
          : "Setup access needs to be configured before it can be unlocked.",
      );
    } catch {
      setMessage("Setup couldn’t be unlocked right now. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mx-auto flex min-h-[calc(100dvh-4.5rem)] max-w-lg items-center px-4 py-10 sm:px-8">
      <div className="w-full rounded-md border border-wedding-gold/70 bg-card p-6 shadow-sm sm:p-9">
        <div className="mb-6 grid size-12 place-items-center rounded-full bg-secondary text-maroon">
          <LockKeyhole aria-hidden="true" className="size-5" />
        </div>
        <p className="text-sm font-semibold text-marigold">PRIVATE WORKSPACE</p>
        <h1 className="mt-2 font-display text-4xl font-semibold text-foreground sm:text-5xl">
          Wedding setup
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Enter the shared passcode to open your celebration settings.
        </p>
        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <label htmlFor="setup-passcode" className="block text-sm font-medium text-foreground">
            Setup passcode
          </label>
          <Input
            id="setup-passcode"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={256}
            disabled={!configured || pending}
            className="h-12 bg-background"
          />
          {!configured && (
            <p role="alert" className="text-sm leading-6 text-destructive">
              Add a passcode of at least 8 characters as SETUP_PASSCODE in Project Settings →
              Secrets.
            </p>
          )}
          {message && (
            <p role="alert" className="text-sm leading-6 text-destructive">
              {message}
            </p>
          )}
          <Button type="submit" disabled={!configured || pending} className="h-12 w-full">
            <LockKeyhole aria-hidden="true" />
            {pending ? "Checking passcode…" : "Unlock setup"}
          </Button>
        </form>
        <div className="mt-6 flex items-start gap-3 border-t border-border pt-5 text-xs leading-5 text-muted-foreground">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-wedding-gold" />
          <p>This shared passcode is for the setup page only. Players don’t need accounts.</p>
        </div>
      </div>
    </section>
  );
}

function SetupWorkspace() {
  const lock = useServerFn(lockSetup);
  const router = useRouter();

  async function handleLock() {
    await lock();
    await router.invalidate();
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-8 sm:py-14">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-marigold">PRIVATE WORKSPACE</p>
          <h1 className="mt-2 font-display text-4xl font-semibold text-foreground sm:text-5xl">
            Personalise your celebration
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Your setup space is ready for the details that make the story yours.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => void handleLock()}>
          <LockKeyhole aria-hidden="true" />
          Lock setup
        </Button>
      </div>
      <div className="mt-9 grid gap-4 sm:grid-cols-2">
        <article className="rounded-md border border-border bg-card p-6">
          <p className="text-sm font-semibold text-marigold">THE COUPLE</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-foreground">
            Your wedding details
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Names and personal touches will live here.
          </p>
        </article>
        <article className="rounded-md border border-border bg-card p-6">
          <p className="text-sm font-semibold text-marigold">THE DISPLAY</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-foreground">
            A moment for everyone
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Preview the big-screen welcome for your guests.
          </p>
          <Button asChild variant="outline" className="mt-5">
            <Link to="/display">
              Open display preview
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </article>
      </div>
    </section>
  );
}