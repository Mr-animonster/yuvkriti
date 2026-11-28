import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type TouchEvent } from "react";
import { ArrowUp, Heart, Smartphone } from "lucide-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WeddingPageHeader } from "@/components/wedding-page-header";
import { supabase } from "@/integrations/supabase/client";
import { createSampleGameConfig, draftFromGameConfig } from "@/lib/game-config";
import { findRoleClaimWinner, getRoomTopic, isGameStateMessage } from "@/lib/game-realtime";
import type { GameConfigDraft, GameStateMessage, PartnerRole } from "@/lib/love-story-types";

type PresenceStatus = "connecting" | "connected" | "role_taken" | "disconnected" | "error";
type SignalQuality = "connecting" | "good" | "fair" | "poor" | "offline";

const WAITING_STATE: GameStateMessage = {
  type: "state",
  status: "waiting",
  score: 0,
  hearts: 3,
  positionPercent: 0,
  currentMilestone: null,
};

export const Route = createFileRoute("/play")({
  validateSearch: (search: Record<string, unknown>) => ({
    room: typeof search["room"] === "string" ? search["room"].replace(/\D/g, "").slice(0, 4) : "",
    role: search["role"] === "bride" ? "bride" : search["role"] === "groom" ? "groom" : "",
  }),
  head: () => ({
    meta: [
      { title: "Partner Controller | Love Story Runner" },
      {
        name: "description",
        content: "A portrait phone controller for the Love Story Runner wedding-day game.",
      },
      { property: "og:title", content: "Partner Controller | Love Story Runner" },
      {
        property: "og:description",
        content: "A portrait phone controller for the Love Story Runner wedding-day game.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlayPage,
});

function PlayPage() {
  const { room, role } = Route.useSearch();
  const navigate = useNavigate({ from: "/play" });
  const [roomInput, setRoomInput] = useState(room);
  const [message, setMessage] = useState("");
  const roomIsValid = /^\d{4}$/.test(room);

  useEffect(() => {
    setRoomInput(room);
  }, [room]);

  function selectRole(nextRole: PartnerRole) {
    const typedCode = roomInput.replace(/\D/g, "").slice(0, 4);
    const nextRoom = /^\d{4}$/.test(typedCode) ? typedCode : room;
    setMessage("");
    void navigate({ search: { room: nextRoom, role: nextRole } });
  }

  function submitRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = roomInput.replace(/\D/g, "").slice(0, 4);
    if (!/^\d{4}$/.test(code)) {
      setMessage("Enter the four-digit code from the display.");
      return;
    }
    if (role !== "bride" && role !== "groom") {
      setMessage("Choose your role to continue.");
      void navigate({ search: { room: code, role: "" } });
      return;
    }
    void navigate({ search: { room: code, role } });
  }

  if (roomIsValid && (role === "bride" || role === "groom")) {
    return <ControllerRoom roomCode={room} role={role} />;
  }

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <WeddingPageHeader />
      <section className="mx-auto flex min-h-[calc(100dvh-4.5rem)] max-w-lg flex-col justify-center px-4 py-8 sm:px-8">
        <div className="rounded-md border border-wedding-gold/70 bg-card p-6 shadow-sm sm:p-9">
          <div className="mb-5 grid size-12 place-items-center rounded-full bg-secondary text-maroon">
            <Smartphone aria-hidden="true" className="size-5" />
          </div>
          <p className="text-sm font-semibold text-marigold">PHONE CONTROLLER</p>
          <h1 className="mt-2 font-display text-4xl font-semibold text-foreground sm:text-5xl">
            Join the celebration
          </h1>
          <form onSubmit={submitRoom} className="mt-6 space-y-3">
            <label htmlFor="room-code" className="block text-sm font-medium">Four-digit room code</label>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <Input
                id="room-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{4}"
                maxLength={4}
                value={roomInput}
                onChange={(event) => setRoomInput(event.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="0000"
                className="h-12 text-center font-display text-2xl font-semibold tracking-[0.18em]"
              />
              <Button type="submit" className="h-12 px-4">Join room</Button>
            </div>
            {message && <p role="alert" className="text-sm text-destructive">{message}</p>}
          </form>
          <div className="mt-7">
            <p className="mb-3 text-sm font-medium">Choose your role</p>
            <div className="grid grid-cols-2 gap-3">
              <Button type="button" variant={role === "bride" ? "default" : "outline"} size="lg" onClick={() => selectRole("bride")}>
                <Heart aria-hidden="true" />
                I’m the Bride
              </Button>
              <Button type="button" variant={role === "groom" ? "default" : "outline"} size="lg" onClick={() => selectRole("groom")}>
                <Heart aria-hidden="true" />
                I’m the Groom
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function ControllerRoom({ roomCode, role }: { roomCode: string; role: PartnerRole }) {
  const [deviceId, setDeviceId] = useState("");
  const [presenceStatus, setPresenceStatus] = useState<PresenceStatus>("connecting");
  const [quality, setQuality] = useState<SignalQuality>("connecting");
  const [gameState, setGameState] = useState<GameStateMessage>(WAITING_STATE);
  const [config, setConfig] = useState<GameConfigDraft>(() => createSampleGameConfig());
  const [pressed, setPressed] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastStateAt = useRef(0);
  const pressTimer = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const otherRole: PartnerRole = role === "bride" ? "groom" : "bride";
  const playerName = role === "bride" ? config.brideName || "Bride" : config.groomName || "Groom";
  const lanePosition = gameState.lanePositions?.[role] ?? gameState.positionPercent;
  const waitingForPartner = Boolean(gameState.gateWaiting?.[role] && !gameState.gateWaiting?.[otherRole]);
  const waitingForOwnGate = Boolean(gameState.gateWaiting?.[role]);
  const canJump = presenceStatus === "connected" && gameState.status === "playing" && !waitingForOwnGate;

  useEffect(() => {
    const key = "love-story-runner-controller-id";
    let id = window.sessionStorage.getItem(key);
    if (!id) {
      id = window.crypto.randomUUID();
      window.sessionStorage.setItem(key, id);
    }
    setDeviceId(id);
  }, []);

  useEffect(() => {
    let active = true;
    void supabase
      .from("game_config")
      .select("*")
      .maybeSingle()
      .then(({ data, error }) => {
        if (active && !error && data) setConfig(draftFromGameConfig(data));
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const orientation = window.screen.orientation as ScreenOrientation & {
      lock?: (value: "portrait") => Promise<void>;
    };
    void orientation.lock?.("portrait").catch(() => undefined);
  }, []);

  useEffect(() => {
    let active = true;
    let requesting = false;
    let sentinel: WakeLockSentinel | null = null;

    async function requestWakeLock() {
      const wakeLock = navigator.wakeLock;
      if (!active || requesting || wakeLockRef.current || document.visibilityState !== "visible" || !wakeLock) return;
      requesting = true;
      try {
        sentinel = await wakeLock.request("screen");
        if (active) wakeLockRef.current = sentinel;
        else void sentinel.release();
      } catch {
        // The browser may not offer Wake Lock; the controller remains usable.
      } finally {
        requesting = false;
      }
    }

    function handleVisibility() {
      if (document.visibilityState !== "visible") return;
      wakeLockRef.current = null;
      void requestWakeLock();
    }

    void requestWakeLock();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", handleVisibility);
      wakeLockRef.current = null;
      if (sentinel) void sentinel.release();
    };
  }, []);

  useEffect(() => {
    if (!deviceId) return;
    let active = true;
    let subscribed = false;
    let tracked = false;
    let tracking = false;
    const channel = supabase.channel(getRoomTopic(roomCode), {
      config: { presence: { key: deviceId }, broadcast: { self: false } },
    });
    channelRef.current = channel;

    async function reconcileRole() {
      if (!active || !subscribed || tracking) return;
      const winner = findRoleClaimWinner(channel.presenceState(), role);
      if (winner && winner.playerId !== deviceId) {
        if (tracked) {
          tracked = false;
          void channel.untrack();
        }
        setPresenceStatus("role_taken");
        return;
      }
      if (winner?.playerId === deviceId) {
        tracked = true;
        setPresenceStatus("connected");
        return;
      }

      tracking = true;
      tracked = false;
      setPresenceStatus("connecting");
      const result = await channel.track({ role, playerId: deviceId, claimedAt: Date.now() });
      tracking = false;
      if (!active) return;
      if (result !== "ok") {
        setPresenceStatus("error");
        return;
      }
      tracked = true;
      const winnerAfterTrack = findRoleClaimWinner(channel.presenceState(), role);
      if (winnerAfterTrack && winnerAfterTrack.playerId !== deviceId) {
        tracked = false;
        void channel.untrack();
        setPresenceStatus("role_taken");
        return;
      }
      setPresenceStatus("connected");
    }

    channel.on("presence", { event: "sync" }, () => void reconcileRole());
    channel.on("broadcast", { event: "state" }, ({ payload }) => {
      if (!active || !isGameStateMessage(payload)) return;
      const now = Date.now();
      const previous = lastStateAt.current;
      lastStateAt.current = now;
      if (previous > 0) {
        const delay = now - previous;
        setQuality(delay < 400 ? "good" : delay < 850 ? "fair" : "poor");
      }
      setGameState(payload);
    });
    channel.subscribe((status) => {
      if (!active) return;
      if (status === "SUBSCRIBED") {
        subscribed = true;
        tracked = false;
        setPresenceStatus("connecting");
        void reconcileRole();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        subscribed = false;
        tracked = false;
        setPresenceStatus("disconnected");
        setQuality("offline");
      }
    });

    return () => {
      active = false;
      subscribed = false;
      tracked = false;
      channelRef.current = null;
      void channel.untrack();
      void supabase.removeChannel(channel);
    };
  }, [deviceId, role, roomCode]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (presenceStatus !== "connected") {
        setQuality(presenceStatus === "connecting" ? "connecting" : "offline");
        return;
      }
      if (lastStateAt.current === 0) {
        setQuality("connecting");
      } else if (Date.now() - lastStateAt.current > 1_000) {
        setQuality("poor");
      }
    }, 500);
    return () => window.clearInterval(timer);
  }, [presenceStatus]);

  function sendJump() {
    if (!canJump) return;
    void channelRef.current?.send({
      type: "broadcast",
      event: "jump",
      payload: { type: "jump", role, timestamp: Date.now() },
    });
  }

  function pressJump() {
    if (!canJump) return;
    setPressed(true);
    if (pressTimer.current !== null) window.clearTimeout(pressTimer.current);
    pressTimer.current = window.setTimeout(() => setPressed(false), 120);
    if (typeof navigator.vibrate === "function") navigator.vibrate(18);
    sendJump();
  }

  function handleTouchStart(event: TouchEvent<HTMLButtonElement>) {
    event.preventDefault();
    pressJump();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    pressJump();
  }

  const statusMessage = gameState.status === "complete"
    ? gameState.finaleStage === "playAgain" ? "Play again?" : "Finale!"
    : gameState.status === "waiting"
      ? "Get ready"
      : waitingForPartner
        ? "Waiting for partner at the gate"
        : waitingForOwnGate
          ? `At the ${gameState.currentMilestone ?? "milestone"} gate`
          : gameState.currentMilestone
            ? gameState.currentMilestone
            : "Tap to jump";

  return (
    <main className="controller-screen relative flex flex-col bg-background px-3 pb-3 pt-[env(safe-area-inset-top)] text-foreground">
      <div className="controller-landscape-warning absolute inset-0 z-30 flex-col items-center justify-center gap-3 bg-background px-8 text-center">
        <Smartphone aria-hidden="true" className="size-12 rotate-90 text-marigold" />
        <p className="font-display text-3xl font-semibold">Turn your phone upright</p>
      </div>
      <div className="controller-content flex min-h-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-2 border-b border-border/70 py-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-marigold">{role === "bride" ? "BRIDE" : "GROOM"} · ROOM {roomCode}</p>
            <h1 className="truncate font-display text-2xl font-semibold leading-tight text-foreground">
              {playerName}
            </h1>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="inline-flex items-center gap-2 text-xs font-semibold">
              <span className={`size-2.5 rounded-full ${presenceStatus === "connected" ? "bg-chart-2" : presenceStatus === "role_taken" ? "bg-destructive" : "bg-wedding-gold"}`} />
              {presenceStatus === "connected" ? "Connected" : presenceStatus === "role_taken" ? "Role in use" : presenceStatus === "disconnected" ? "Reconnecting" : "Connecting"}
            </span>
            <SignalIndicator quality={quality} />
          </div>
        </header>

        <div className="flex items-center justify-center gap-2 py-2" aria-label={`${gameState.hearts} shared hearts remaining`}>
          <span className="mr-1 text-xs font-semibold uppercase text-muted-foreground">Shared love</span>
          {Array.from({ length: 3 }, (_, index) => (
            <Heart key={index} aria-hidden="true" className={`size-5 ${index < gameState.hearts ? "fill-bride-red text-bride-red" : "text-muted-foreground/40"}`} />
          ))}
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center py-1">
          <Button
            type="button"
            disabled={!canJump}
            onTouchStart={handleTouchStart}
            onKeyDown={handleKeyDown}
            onContextMenu={(event) => event.preventDefault()}
            aria-label={canJump ? "Jump" : statusMessage}
            className={`controller-jump flex flex-col items-center justify-center gap-2 rounded-full border-[0.55rem] border-wedding-gold font-display text-6xl font-bold text-cream shadow-xl transition-transform duration-75 disabled:opacity-100 sm:text-7xl ${role === "bride" ? "bg-bride-red" : "bg-maroon"} ${pressed ? "scale-95" : "scale-100"}`}
          >
            <ArrowUp aria-hidden="true" className="size-12 sm:size-16" />
            <span>JUMP</span>
            <span className="max-w-[80%] text-center font-sans text-sm font-semibold sm:text-base">{statusMessage}</span>
          </Button>
        </div>

        <section className="shrink-0 rounded-md border border-border bg-card px-3 py-3" aria-label="Live game status">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold uppercase text-marigold">
                {gameState.currentMilestone ? `Next: ${gameState.currentMilestone}` : "Your lane"}
              </p>
              <p className="text-xs text-muted-foreground">{Math.round(lanePosition)}% complete</p>
            </div>
            <p className="inline-flex shrink-0 items-center gap-1 text-lg font-bold text-maroon">
              <span className="text-xs font-medium text-muted-foreground">SCORE</span>
              {gameState.score}
            </p>
          </div>
          <div className="relative h-3 rounded-full bg-secondary" aria-label={`${role} lane progress`}>
            <div className="controller-progress-fill h-full rounded-full bg-marigold transition-transform duration-200" style={{ transform: `scaleX(${Math.max(0, Math.min(100, lanePosition)) / 100})` }} />
            {config.milestones.map((milestone, index) => {
              const position = ((index + 1) / (config.milestones.length + 1)) * 100;
              return (
                <span key={milestone.id} className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-card bg-maroon" style={{ left: `${position}%` }} aria-label={milestone.title || `Milestone ${index + 1}`} />
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

function SignalIndicator({ quality }: { quality: SignalQuality }) {
  const label = quality === "good" ? "Strong" : quality === "fair" ? "Fair" : quality === "poor" ? "Weak" : quality === "offline" ? "Offline" : "Checking";
  const color = quality === "good" ? "text-chart-2" : quality === "fair" ? "text-wedding-gold" : quality === "poor" || quality === "offline" ? "text-destructive" : "text-muted-foreground";
  const activeBars = quality === "good" ? 4 : quality === "fair" ? 3 : quality === "poor" ? 1 : quality === "offline" ? 0 : 2;

  return (
    <span className={`inline-flex items-end gap-0.5 text-[10px] font-medium ${color}`} aria-label={`Connection quality: ${label}`}>
      <span className={`h-1 w-1 rounded-sm ${activeBars >= 1 ? "bg-current" : "bg-muted"}`} />
      <span className={`h-2 w-1 rounded-sm ${activeBars >= 2 ? "bg-current" : "bg-muted"}`} />
      <span className={`h-3 w-1 rounded-sm ${activeBars >= 3 ? "bg-current" : "bg-muted"}`} />
      <span className={`h-4 w-1 rounded-sm ${activeBars >= 4 ? "bg-current" : "bg-muted"}`} />
      <span className="ml-1">{label}</span>
    </span>
  );
}