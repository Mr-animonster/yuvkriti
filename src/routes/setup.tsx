import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  GripVertical,
  LockKeyhole,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type DragEvent, type FormEvent } from "react";

import { MediaUploadField } from "@/components/media-upload-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { WeddingPageHeader } from "@/components/wedding-page-header";
import {
  createBlankGameConfig,
  createSampleGameConfig,
  draftFromGameConfig,
  gameConfigSchema,
} from "@/lib/game-config";
import type { GameConfigDraft, MilestoneDraft } from "@/lib/love-story-types";
import { getSetupData, lockSetup, saveGameConfig, unlockSetup } from "@/lib/setup.functions";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/setup")({
  loader: () => getSetupData(),
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
        <SetupWorkspace config={access.config} />
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

function SetupWorkspace({ config }: { config: Tables<"game_config"> | null }) {
  const router = useRouter();
  const lock = useServerFn(lockSetup);
  const save = useServerFn(saveGameConfig);
  const [draft, setDraft] = useState<GameConfigDraft>(() => draftFromGameConfig(config));
  const [saving, setSaving] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [message, setMessage] = useState("");

  function setField<K extends keyof GameConfigDraft>(field: K, value: GameConfigDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function setUploadBusy(busy: boolean) {
    setUploadCount((count) => Math.max(0, count + (busy ? 1 : -1)));
  }

  function updateMilestone(index: number, changes: Partial<MilestoneDraft>) {
    setDraft((current) => {
      const milestones = [...current.milestones];
      const milestone = milestones[index];
      if (!milestone) return current;
      milestones[index] = { ...milestone, ...changes };
      return { ...current, milestones };
    });
  }

  function moveMilestone(from: number, to: number) {
    setDraft((current) => {
      if (from < 0 || from >= current.milestones.length || to < 0 || to >= current.milestones.length) {
        return current;
      }
      const milestones = [...current.milestones];
      const [moved] = milestones.splice(from, 1);
      if (!moved) return current;
      milestones.splice(to, 0, moved);
      return { ...current, milestones };
    });
  }

  function handleMilestoneDrop(event: DragEvent<HTMLElement>, target: number) {
    event.preventDefault();
    const source = Number(event.dataTransfer.getData("text/plain"));
    if (Number.isInteger(source)) moveMilestone(source, target);
  }

  function addMilestone() {
    if (draft.milestones.length >= 8) return;
    setDraft((current) => ({
      ...current,
      milestones: [
        ...current.milestones,
        {
          id: crypto.randomUUID(),
          title: "",
          photoPath: "",
          caption: "",
          year: "",
        },
      ],
    }));
  }

  function removeMilestone(index: number) {
    if (draft.milestones.length <= 4) return;
    setDraft((current) => ({
      ...current,
      milestones: current.milestones.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function setObstacleLabel(index: number, value: string) {
    setDraft((current) => ({
      ...current,
      obstacleLabels: current.obstacleLabels.map((label, itemIndex) =>
        itemIndex === index ? value : label,
      ),
    }));
  }

  function addObstacleLabel() {
    if (draft.obstacleLabels.length >= 12) return;
    setDraft((current) => ({ ...current, obstacleLabels: [...current.obstacleLabels, ""] }));
  }

  function removeObstacleLabel(index: number) {
    if (draft.obstacleLabels.length <= 6) return;
    setDraft((current) => ({
      ...current,
      obstacleLabels: current.obstacleLabels.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploadCount > 0) {
      setMessage("Wait for the uploads to finish before saving.");
      return;
    }
    const parsed = gameConfigSchema.safeParse(draft);
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? "Check the required wedding details.");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      await save({ data: parsed.data });
      await router.invalidate();
      setMessage("Wedding details saved.");
    } catch {
      setMessage("The wedding details could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLock() {
    await lock();
    await router.invalidate();
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-8 sm:py-12">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-marigold">PRIVATE WORKSPACE</p>
          <h1 className="mt-2 font-display text-4xl font-semibold text-foreground sm:text-5xl">
            Personalise your celebration
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Add the people, moments, and little wedding-day twists that make this story yours.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => void handleLock()}>
          <LockKeyhole aria-hidden="true" />
          Lock setup
        </Button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <section className="rounded-md border border-border bg-card p-5 sm:p-7">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-secondary text-maroon">
              <Sparkles aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h2 className="font-display text-2xl font-semibold text-foreground">Wedding details</h2>
              <p className="text-sm text-muted-foreground">The names and words guests will see.</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="bride-name" className="text-sm font-medium">Bride’s name</label>
              <Input id="bride-name" value={draft.brideName} maxLength={80} onChange={(event) => setField("brideName", event.target.value)} />
            </div>
            <div className="space-y-2">
              <label htmlFor="groom-name" className="text-sm font-medium">Groom’s name</label>
              <Input id="groom-name" value={draft.groomName} maxLength={80} onChange={(event) => setField("groomName", event.target.value)} />
            </div>
            <div className="space-y-2">
              <label htmlFor="wedding-date" className="text-sm font-medium">Wedding date</label>
              <Input id="wedding-date" type="date" value={draft.weddingDate} onChange={(event) => setField("weddingDate", event.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="finale-message" className="text-sm font-medium">Finale message</label>
              <Textarea id="finale-message" value={draft.finaleMessage} maxLength={280} rows={3} onChange={(event) => setField("finaleMessage", event.target.value)} />
            </div>
          </div>
        </section>

        <section className="rounded-md border border-border bg-card p-5 sm:p-7">
          <div className="mb-5">
            <h2 className="font-display text-2xl font-semibold text-foreground">Photos & music</h2>
            <p className="mt-1 text-sm text-muted-foreground">Portraits preview in circles; photos and music are shared with the game.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <MediaUploadField
              kind="bride_face"
              label="Bride’s portrait"
              path={draft.brideFacePhoto}
              shape="circle"
              onPathChange={(path) => setField("brideFacePhoto", path)}
              onBusyChange={setUploadBusy}
            />
            <MediaUploadField
              kind="groom_face"
              label="Groom’s portrait"
              path={draft.groomFacePhoto}
              shape="circle"
              onPathChange={(path) => setField("groomFacePhoto", path)}
              onBusyChange={setUploadBusy}
            />
          </div>
          <div className="mt-6 max-w-xl">
            <MediaUploadField
              kind="background_music"
              label="Background music (optional)"
              path={draft.backgroundMusic}
              shape="audio"
              onPathChange={(path) => setField("backgroundMusic", path)}
              onBusyChange={setUploadBusy}
            />
          </div>
        </section>

        <section className="rounded-md border border-border bg-card p-5 sm:p-7">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-semibold text-foreground">Milestones</h2>
              <p className="mt-1 text-sm text-muted-foreground">Add 4–8 moments, then arrange them in story order.</p>
            </div>
            <span className="text-sm font-semibold text-maroon">{draft.milestones.length} / 8</span>
          </div>
          <div className="space-y-4">
            {draft.milestones.map((milestone, index) => (
              <article
                key={milestone.id}
                draggable
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => handleMilestoneDrop(event, index)}
                className="grid gap-4 rounded-md border border-border bg-background p-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:p-5"
                aria-label={`Milestone ${index + 1}`}
              >
                <div className="flex items-start justify-between gap-2 sm:flex-col sm:justify-start">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    draggable
                    title="Drag to reorder"
                    aria-label={`Drag milestone ${index + 1} to reorder`}
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", String(index));
                    }}
                  >
                    <GripVertical aria-hidden="true" />
                  </Button>
                  <div className="flex gap-1">
                    <Button type="button" variant="ghost" size="icon" disabled={index === 0} title="Move up" aria-label={`Move milestone ${index + 1} up`} onClick={() => moveMilestone(index, index - 1)}>
                      <ArrowUp aria-hidden="true" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" disabled={index === draft.milestones.length - 1} title="Move down" aria-label={`Move milestone ${index + 1} down`} onClick={() => moveMilestone(index, index + 1)}>
                      <ArrowDown aria-hidden="true" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" disabled={draft.milestones.length <= 4} title="Remove milestone" aria-label={`Remove milestone ${index + 1}`} onClick={() => removeMilestone(index)}>
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor={`milestone-title-${index}`} className="text-sm font-medium">Title</label>
                    <Input id={`milestone-title-${index}`} value={milestone.title} maxLength={80} onChange={(event) => updateMilestone(index, { title: event.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor={`milestone-year-${index}`} className="text-sm font-medium">Year</label>
                    <Input id={`milestone-year-${index}`} type="number" inputMode="numeric" min={1000} max={9999} value={milestone.year} onChange={(event) => updateMilestone(index, { year: event.target.value })} />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label htmlFor={`milestone-caption-${index}`} className="text-sm font-medium">One-line caption</label>
                    <Input id={`milestone-caption-${index}`} value={milestone.caption} maxLength={180} onChange={(event) => updateMilestone(index, { caption: event.target.value })} />
                  </div>
                  <div className="sm:col-span-2">
                    <MediaUploadField
                      kind="milestone"
                      label="Milestone photo"
                      path={milestone.photoPath}
                      onPathChange={(path) => updateMilestone(index, { photoPath: path })}
                      onBusyChange={setUploadBusy}
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
          <Button type="button" variant="outline" className="mt-4" disabled={draft.milestones.length >= 8} onClick={addMilestone}>
            <Plus aria-hidden="true" />
            Add milestone
          </Button>
        </section>

        <section className="rounded-md border border-border bg-card p-5 sm:p-7">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-semibold text-foreground">Obstacle labels</h2>
              <p className="mt-1 text-sm text-muted-foreground">6–12 wedding-day characters</p>
            </div>
            <span className="text-sm font-semibold text-maroon">{draft.obstacleLabels.length} / 12</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {draft.obstacleLabels.map((label, index) => (
              <div key={`obstacle-${index}`} className="flex min-w-0 items-center gap-2">
                <label htmlFor={`obstacle-${index}`} className="sr-only">Obstacle label {index + 1}</label>
                <Input id={`obstacle-${index}`} value={label} maxLength={80} onChange={(event) => setObstacleLabel(index, event.target.value)} />
                <Button type="button" variant="ghost" size="icon" disabled={draft.obstacleLabels.length <= 6} title="Remove obstacle label" aria-label={`Remove obstacle label ${index + 1}`} onClick={() => removeObstacleLabel(index)}>
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" className="mt-4" disabled={draft.obstacleLabels.length >= 12} onClick={addObstacleLabel}>
            <Plus aria-hidden="true" />
            Add obstacle label
          </Button>
        </section>

        <div className="flex flex-col-reverse items-stretch justify-between gap-3 pb-8 sm:flex-row sm:items-center">
          <Button type="button" variant="outline" onClick={() => { setDraft(createSampleGameConfig()); setMessage("Sample details loaded. Add portraits and milestone photos before saving."); }}>
            <Sparkles aria-hidden="true" />
            Load sample data
          </Button>
          <div className="flex flex-col items-stretch gap-3 sm:items-end">
            {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
            <Button type="submit" size="lg" disabled={saving || uploadCount > 0}>
              <Save aria-hidden="true" />
              {saving ? "Saving…" : uploadCount > 0 ? "Uploads in progress…" : "Save"}
            </Button>
          </div>
        </div>
      </form>

      <div className="pb-8">
        <Button asChild variant="link" className="px-0">
          <Link to="/display">
            Preview the display
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </section>
  );
}