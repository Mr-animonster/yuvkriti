import { useCallback, useEffect, useRef, useState } from "react";
import { Award, Flower2, Sparkles } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";

import { RunnerCanvas, type RunnerCanvasHandle } from "@/components/runner-canvas";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { draftFromGameConfig, getPublicMediaUrl, createSampleGameConfig } from "@/lib/game-config";
import {
  canStartGame,
  findRoleClaimWinner,
  getRoomTopic,
  isJumpMessage,
} from "@/lib/game-realtime";
import type { GameConfigDraft, GameStateMessage, MilestoneDraft, PartnerRole } from "@/lib/love-story-types";
import { MILESTONE_HOLD_MS } from "@/lib/runner-engine";

const INITIAL_GAME_STATE: GameStateMessage = {
  type: "state",
  status: "waiting",
  score: 0,
  hearts: 3,
  positionPercent: 0,
  currentMilestone: null,
};

export const Route = createFileRoute("/display")({
  head: () => ({
    meta: [
      { title: "Wedding Display | Love Story Runner" },
      {
        name: "description",
        content: "A 16:9 wedding lobby and two-lane runner for the Love Story Runner game.",
      },
      { property: "og:title", content: "Wedding Display | Love Story Runner" },
      {
        property: "og:description",
        content: "A 16:9 wedding lobby and two-lane runner for the Love Story Runner game.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DisplayPage,
});

function makeRoomCode() {
  const random = new Uint32Array(1);
  window.crypto.getRandomValues(random);
  return String((random[0] ?? 0) % 10_000).padStart(4, "0");
}

function DisplayPage() {
  const runnerRef = useRef<RunnerCanvasHandle | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const stateRef = useRef<GameStateMessage>(INITIAL_GAME_STATE);
  const milestoneTimerRef = useRef<number | null>(null);
  const refillTimerRef = useRef<number | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [joinUrl, setJoinUrl] = useState("");
  const [connection, setConnection] = useState("connecting");
  const [players, setPlayers] = useState<Record<PartnerRole, boolean>>({ bride: false, groom: false });
  const [config, setConfig] = useState<GameConfigDraft>(() => createSampleGameConfig());
  const [gameState, setGameState] = useState<GameStateMessage>(INITIAL_GAME_STATE);
  const [hostOverride, setHostOverride] = useState(false);
  const [practiceBots, setPracticeBots] = useState(false);
  const [activeMilestone, setActiveMilestone] = useState<MilestoneDraft | null>(null);
  const [heartMessage, setHeartMessage] = useState("");
  const [, setLastJump] = useState<PartnerRole | null>(null);

  useEffect(() => {
    const savedRoomCode = window.sessionStorage.getItem("love-story-runner-display-room");
    const nextRoomCode = savedRoomCode && /^\d{4}$/.test(savedRoomCode) ? savedRoomCode : makeRoomCode();
    window.sessionStorage.setItem("love-story-runner-display-room", nextRoomCode);
    setRoomCode(nextRoomCode);
    setJoinUrl(`${window.location.origin}/play?room=${nextRoomCode}`);
  }, []);

  useEffect(() => {
    let active = true;
    async function loadConfig() {
      const { data, error } = await supabase.from("game_config").select("*").maybeSingle();
      if (!active || error || !data) return;
      setConfig(draftFromGameConfig(data));
    }
    void loadConfig();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!roomCode) return;
    let broadcastTimer: number | null = null;
    let active = true;
    const channel = supabase.channel(getRoomTopic(roomCode), {
      config: { presence: { key: `display-${roomCode}` }, broadcast: { self: false } },
    });

    channel.on("presence", { event: "sync" }, () => {
      if (!active) return;
      const presence = channel.presenceState();
      setPlayers({
        bride: findRoleClaimWinner(presence, "bride") !== null,
        groom: findRoleClaimWinner(presence, "groom") !== null,
      });
    });
    channel.on("broadcast", { event: "jump" }, ({ payload }) => {
      if (!active || !isJumpMessage(payload)) return;
      setLastJump(payload.role);
      if (stateRef.current.status === "playing") runnerRef.current?.jump(payload.role);
    });
    channel.subscribe((status) => {
      if (!active) return;
      if (status === "SUBSCRIBED") {
        setConnection("connected");
        void channel.track({ role: "host", playerId: `display-${roomCode}`, claimedAt: Date.now() });
        if (broadcastTimer === null) {
          broadcastTimer = window.setInterval(() => {
            void channel.send({ type: "broadcast", event: "state", payload: stateRef.current });
          }, 200);
        }
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        setConnection("reconnecting");
        if (broadcastTimer !== null) {
          window.clearInterval(broadcastTimer);
          broadcastTimer = null;
        }
      }
    });

    return () => {
      active = false;
      if (broadcastTimer !== null) window.clearInterval(broadcastTimer);
      void channel.untrack();
      void supabase.removeChannel(channel);
    };
  }, [roomCode]);

  const setGameStateFromEngine = useCallback((next: GameStateMessage) => {
    stateRef.current = next;
    setGameState(next);
  }, []);

  const beginSound = useCallback(() => {
    if (typeof window.AudioContext === "undefined") return;
    const audioContext = audioContextRef.current ?? new window.AudioContext();
    audioContextRef.current = audioContext;
    void audioContext.resume();
  }, []);

  const playMilestoneChime = useCallback(() => {
    const audioContext = audioContextRef.current;
    if (!audioContext) return;
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const volume = audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(659.25, now);
    oscillator.frequency.setValueAtTime(783.99, now + 0.16);
    volume.gain.setValueAtTime(0.0001, now);
    volume.gain.exponentialRampToValueAtTime(0.045, now + 0.05);
    volume.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    oscillator.connect(volume);
    volume.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.58);
  }, []);

  const handleMilestone = useCallback((milestone: MilestoneDraft) => {
    setActiveMilestone(milestone);
    playMilestoneChime();
    if (milestoneTimerRef.current !== null) window.clearTimeout(milestoneTimerRef.current);
    milestoneTimerRef.current = window.setTimeout(() => setActiveMilestone(null), MILESTONE_HOLD_MS);
  }, [playMilestoneChime]);

  const handleHeartsRefilled = useCallback((message: string) => {
    setHeartMessage(message);
    if (refillTimerRef.current !== null) window.clearTimeout(refillTimerRef.current);
    refillTimerRef.current = window.setTimeout(() => setHeartMessage(""), 2_700);
  }, []);

  const handleFinale = useCallback(() => {
    setActiveMilestone(null);
    if (milestoneTimerRef.current !== null) window.clearTimeout(milestoneTimerRef.current);
  }, []);

  function startGame(withBots = false) {
    if (!withBots && !canStartGame(players.bride, players.groom, hostOverride)) return;
    beginSound();
    setPracticeBots(withBots);
    const next = { ...stateRef.current, status: "playing" as const };
    stateRef.current = next;
    setGameState(next);
    if (config.backgroundMusic) {
      void audioRef.current?.play().catch(() => undefined);
    }
  }

  const musicUrl = config.backgroundMusic ? getPublicMediaUrl(config.backgroundMusic) : null;
  const bridePhotoUrl = config.brideFacePhoto ? getPublicMediaUrl(config.brideFacePhoto) : null;
  const milestonePhotoUrl = activeMilestone?.photoPath ? getPublicMediaUrl(activeMilestone.photoPath) : null;
  const displayedDate = config.weddingDate
    ? (() => {
        const [year, month, day] = config.weddingDate.split("-");
        return year && month && day ? `${Number(day)}-${Number(month)}-${year}` : "2-12-2026";
      })()
    : "2-12-2026";

  return (
    <main className="flex min-h-dvh items-center justify-center overflow-hidden bg-background p-3 text-center">
      {gameState.status === "waiting" ? (
        <section className="display-stage relative overflow-hidden rounded-md border border-wedding-gold/80 bg-cream shadow-lg">
          <div className="absolute inset-0 grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] items-center gap-4 bg-background/45 p-5 sm:gap-8 sm:p-10">
            <div className="flex flex-col items-center justify-center">
              <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase text-maroon sm:text-base">
                <Flower2 aria-hidden="true" className="size-4 text-marigold sm:size-5" />
                Scan to join
              </div>
              {joinUrl ? (
                <div className="rounded-md border border-wedding-gold/70 bg-card p-2 sm:p-3">
                  <QRCodeSVG value={joinUrl} size={160} level="M" />
                </div>
              ) : (
                <div className="grid size-40 place-items-center rounded-md border border-wedding-gold/70 bg-card text-muted-foreground">Loading…</div>
              )}
              <div className="mt-2 text-center">
                <p className="text-xs font-semibold uppercase text-muted-foreground sm:text-sm">Room code</p>
                <p className="font-display text-5xl font-semibold leading-none text-maroon sm:text-7xl">
                  {roomCode || "••••"}
                </p>
              </div>
            </div>

            <div className="flex h-full flex-col justify-center text-left">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase text-marigold sm:text-sm">
                <Sparkles aria-hidden="true" className="size-4" />
                The celebration begins
              </p>
              <h1 className="mt-1 font-display text-4xl font-semibold leading-tight text-maroon sm:text-6xl">
                {config.groomName || "Yuvraj"} &amp; {config.brideName || "Prakriti"}
              </h1>
              <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-foreground sm:text-lg">
                <span className={`size-2.5 rounded-full ${connection === "connected" ? "bg-chart-2" : "bg-wedding-gold"}`} />
                {players.bride && players.groom ? "Both players are connected" : "Waiting for players"}
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <PlayerPresence role="Bride" connected={players.bride} />
                <PlayerPresence role="Groom" connected={players.groom} />
              </div>
              <div className="mt-4 flex items-center gap-3 border-t border-wedding-gold/70 pt-3">
                <Switch id="host-override" checked={hostOverride} onCheckedChange={setHostOverride} />
                <label htmlFor="host-override" className="text-sm font-medium text-foreground">
                  Host override
                </label>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  size="lg"
                  disabled={!canStartGame(players.bride, players.groom, hostOverride)}
                  onClick={() => startGame(false)}
                  className="min-h-12 w-full"
                >
                  <Sparkles aria-hidden="true" />
                  Start Game
                </Button>
                <Button type="button" variant={practiceBots ? "secondary" : "outline"} size="lg" onClick={() => startGame(true)} className="min-h-12 w-full">
                  <Award aria-hidden="true" />
                  Practice with bots
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {connection === "connected" ? "Room is live" : "Connecting to the room…"}
              </p>
            </div>
          </div>
        </section>
      ) : (
        <section className="display-stage relative overflow-hidden rounded-md border border-wedding-gold/80 bg-cream shadow-lg">
          <RunnerCanvas
            ref={runnerRef}
            roomCode={roomCode}
            config={config}
            practiceBots={practiceBots}
            onState={setGameStateFromEngine}
            onMilestone={handleMilestone}
            onHeartsRefilled={handleHeartsRefilled}
            onSoundEffect={playMilestoneChime}
            onFinale={handleFinale}
          />
          {heartMessage && (
            <div role="status" className="absolute left-1/2 top-1/2 z-10 w-[min(82%,34rem)] -translate-x-1/2 -translate-y-1/2 rounded-md border border-wedding-gold bg-card px-6 py-4 text-center font-display text-2xl font-semibold text-maroon shadow-lg sm:text-3xl">
              {heartMessage}
            </div>
          )}
          {activeMilestone && (
            <div className="absolute inset-0 z-20 grid place-items-center bg-maroon/50 p-4 sm:p-10" role="dialog" aria-label={`Milestone: ${activeMilestone.title}`}>
              <article className="grid w-full max-w-4xl overflow-hidden rounded-md border border-wedding-gold bg-card shadow-xl sm:grid-cols-[0.9fr_1.1fr]">
                <div className="aspect-[4/3] bg-secondary sm:aspect-auto">
                  <img
                    src={milestonePhotoUrl ?? bridePhotoUrl ?? undefined}
                    alt={activeMilestone.title}
                    className="size-full object-cover"
                  />
                </div>
                <div className="flex flex-col justify-center p-5 text-left sm:p-9">
                  <p className="text-sm font-semibold uppercase text-marigold">A moment in your story</p>
                  <h2 className="mt-2 font-display text-4xl font-semibold text-maroon sm:text-6xl">{activeMilestone.title}</h2>
                  <p className="mt-1 text-base font-semibold text-wedding-gold">{activeMilestone.year}</p>
                  <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-xl">{activeMilestone.caption}</p>
                </div>
              </article>
            </div>
          )}
          {gameState.status === "complete" && (
            <div className="pointer-events-none absolute inset-x-0 top-[10%] z-10 mx-auto flex max-w-4xl flex-col items-center px-5 text-center">
              <p className="inline-flex items-center gap-2 rounded-full border border-wedding-gold/70 bg-card/90 px-4 py-2 text-xs font-semibold uppercase text-marigold sm:text-sm">
                <Sparkles aria-hidden="true" className="size-4" />
                And so it begins
              </p>
              <h2 className="mt-3 font-display text-4xl font-semibold leading-tight text-maroon sm:text-6xl lg:text-7xl">
                {config.brideName || "Prakriti"} &amp; {config.groomName || "Yuvraj"}
              </h2>
              <p className="mt-1 text-sm font-semibold text-maroon sm:text-xl">{displayedDate}</p>
              <p className="mt-3 max-w-2xl font-display text-xl font-semibold text-maroon sm:text-3xl">
                {config.finaleMessage || "And so, their best adventure began."}
              </p>
              <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-wedding-gold/70 bg-card/90 px-4 py-2 text-sm font-semibold text-maroon sm:text-lg">
                <Award aria-hidden="true" className="size-5 text-marigold" />
                Final score {gameState.score}
              </p>
            </div>
          )}
        </section>
      )}
      {musicUrl && <audio ref={audioRef} src={musicUrl} loop preload="auto" />}
    </main>
  );
}

function PlayerPresence({ role, connected }: { role: string; connected: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-wedding-gold/60 bg-card/90 px-3 py-2 text-sm font-medium text-foreground sm:px-4 sm:py-3">
      <span>{role}</span>
      <span className="inline-flex items-center gap-2 text-xs sm:text-sm">
        <span className={`size-2.5 rounded-full ${connected ? "bg-chart-2" : "bg-muted-foreground/50"}`} />
        {connected ? "Connected" : "Disconnected"}
      </span>
    </div>
  );
}