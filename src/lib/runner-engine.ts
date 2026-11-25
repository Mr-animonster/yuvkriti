import type {
  GameConfigDraft,
  GameStateMessage,
  MilestoneDraft,
  PartnerRole,
} from "@/lib/love-story-types";

export const RUNNER_LOGICAL_WIDTH = 1920;
export const RUNNER_LOGICAL_HEIGHT = 1080;
export const RUNNER_LANE_HEIGHT = RUNNER_LOGICAL_HEIGHT / 2;
export const TARGET_RUN_DURATION_MS = 150_000;
export const MILESTONE_HOLD_MS = 4_000;
export const JUMP_DURATION_MS = 1_450;
export const FORGIVING_HITBOX_PERCENT = 1.1;

export type TrackItemKind = "obstacle" | "heart" | "flower";

export interface TrackItem {
  id: string;
  progress: number;
  kind: TrackItemKind;
  label: string;
}

export interface RunnerLaneState {
  progress: number;
  jumpRemainingMs: number;
  stumbleRemainingMs: number;
  animationTimeMs: number;
  gateStopped: boolean;
  processedItemIds: Set<string>;
}

export interface RunnerWorldState {
  status: GameStateMessage["status"];
  score: number;
  hearts: number;
  gateIndex: number;
  gatePopupRemainingMs: number;
  refillMessage: string | null;
  refillMessageRemainingMs: number;
  currentMilestone: string | null;
  bride: RunnerLaneState;
  groom: RunnerLaneState;
  gateProgress: number[];
  track: TrackItem[];
}

export interface RunnerFrameEvents {
  milestone: MilestoneDraft | null;
  heartsRefilled: string | null;
  finale: boolean;
}

export function seedFromRoomCode(roomCode: string): number {
  let seed = 2_166_136_261;
  for (const character of roomCode) {
    seed = Math.imul(seed ^ character.charCodeAt(0), 16_777_619) >>> 0;
  }
  return seed || 1;
}

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function createTrack(
  seed: number,
  milestoneCount: number,
  obstacleLabels: string[],
): TrackItem[] {
  const random = seededRandom(seed);
  const labels = obstacleLabels.length > 0 ? obstacleLabels : ["Wedding-day twist"];
  const safeMilestoneCount = Math.max(0, milestoneCount);
  const gateProgress = Array.from(
    { length: safeMilestoneCount },
    (_, index) => ((index + 1) / (safeMilestoneCount + 1)) * 100,
  );
  const items: TrackItem[] = [];
  let progress = 5;
  let index = 0;

  while (progress < 96) {
    progress += 4.5 + random() * 4;
    if (progress >= 96) break;
    if (gateProgress.some((gate) => Math.abs(gate - progress) < 2.5)) continue;

    const roll = random();
    const kind: TrackItemKind = roll < 0.68 ? "obstacle" : roll < 0.84 ? "heart" : "flower";
    const label =
      kind === "obstacle"
        ? (labels[Math.floor(random() * labels.length)] ?? labels[0] ?? "Wedding-day twist")
        : kind === "heart"
          ? "Love heart"
          : "Good-luck flower";

    items.push({ id: `track-item-${index}`, progress: Number(progress.toFixed(2)), kind, label });
    index += 1;
  }

  return items;
}

function createLane(): RunnerLaneState {
  return {
    progress: 0,
    jumpRemainingMs: 0,
    stumbleRemainingMs: 0,
    animationTimeMs: 0,
    gateStopped: false,
    processedItemIds: new Set(),
  };
}

const HEARTS_RETURN_MESSAGES = [
  "Love is back! Sharma Uncle’s questions can wait.",
  "The love meter got a little dramatic. Hearts restored!",
  "A tiny wedding-day wobble. Love says keep dancing!",
];

export class RunnerSimulation {
  readonly state: RunnerWorldState;
  readonly track: TrackItem[];
  readonly milestones: MilestoneDraft[];
  practiceBots: boolean;
  private random: () => number;

  constructor(roomCode: string, config: GameConfigDraft, practiceBots = false) {
    const seed = seedFromRoomCode(roomCode);
    this.random = seededRandom(seed ^ 0xa5a5a5a5);
    this.milestones = config.milestones;
    this.track = createTrack(seed, config.milestones.length, config.obstacleLabels);
    this.practiceBots = practiceBots;
    this.state = {
      status: "playing",
      score: 0,
      hearts: 3,
      gateIndex: 0,
      gatePopupRemainingMs: 0,
      refillMessage: null,
      refillMessageRemainingMs: 0,
      currentMilestone: null,
      bride: createLane(),
      groom: createLane(),
      gateProgress: Array.from(
        { length: config.milestones.length },
        (_, index) => ((index + 1) / (config.milestones.length + 1)) * 100,
      ),
      track: this.track,
    };
  }

  jump(role: PartnerRole) {
    const lane = this.state[role];
    if (this.state.status !== "playing" || lane.gateStopped || lane.stumbleRemainingMs > 0) return;
    lane.jumpRemainingMs = JUMP_DURATION_MS;
  }

  update(deltaMs: number): RunnerFrameEvents {
    const events: RunnerFrameEvents = { milestone: null, heartsRefilled: null, finale: false };
    if (this.state.status !== "playing") return events;

    const delta = Math.max(0, Math.min(deltaMs, 50));
    if (this.state.refillMessageRemainingMs > 0) {
      this.state.refillMessageRemainingMs = Math.max(0, this.state.refillMessageRemainingMs - delta);
      if (this.state.refillMessageRemainingMs === 0) this.state.refillMessage = null;
    }

    if (this.state.gatePopupRemainingMs > 0) {
      this.state.gatePopupRemainingMs = Math.max(0, this.state.gatePopupRemainingMs - delta);
      if (this.state.gatePopupRemainingMs === 0) {
        this.state.gateIndex += 1;
        this.state.currentMilestone = null;
        this.state.bride.gateStopped = false;
        this.state.groom.gateStopped = false;
      }
      return events;
    }

    const runSpeed = 100 / TARGET_RUN_DURATION_MS;
    for (const role of ["bride", "groom"] as const) {
      const lane = this.state[role];
      lane.animationTimeMs += delta;
      if (lane.gateStopped) continue;

      const obstacleAhead = this.track.find(
        (item) => item.kind === "obstacle" && item.progress >= lane.progress && !lane.processedItemIds.has(item.id),
      );
      if (
        this.practiceBots &&
        lane.jumpRemainingMs === 0 &&
        lane.stumbleRemainingMs === 0 &&
        obstacleAhead &&
        obstacleAhead.progress - lane.progress > 0 &&
        obstacleAhead.progress - lane.progress <= 2.1
      ) {
        lane.jumpRemainingMs = JUMP_DURATION_MS;
      }

      const previousProgress = lane.progress;
      const stumbleActive = lane.stumbleRemainingMs > 0;
      const speedFactor = stumbleActive ? 0.22 : 1;
      lane.stumbleRemainingMs = Math.max(0, lane.stumbleRemainingMs - delta);
      lane.jumpRemainingMs = Math.max(0, lane.jumpRemainingMs - delta);
      lane.progress = Math.min(100, lane.progress + runSpeed * delta * speedFactor);

      for (const item of this.track) {
        if (
          lane.processedItemIds.has(item.id) ||
          lane.progress < item.progress - FORGIVING_HITBOX_PERCENT ||
          previousProgress > item.progress + FORGIVING_HITBOX_PERCENT
        ) {
          continue;
        }

        lane.processedItemIds.add(item.id);
        if (item.kind === "obstacle") {
          if (lane.jumpRemainingMs === 0) {
            lane.stumbleRemainingMs = 900;
            this.state.hearts -= 1;
          }
        } else if (lane.jumpRemainingMs > 0) {
          this.state.score += item.kind === "heart" ? 150 : 100;
        }
      }

      const gatePosition = this.state.gateProgress[this.state.gateIndex];
      if (gatePosition !== undefined && lane.progress >= gatePosition) {
        lane.progress = gatePosition;
        lane.gateStopped = true;
        const milestone = this.milestones[this.state.gateIndex];
        this.state.currentMilestone = milestone?.title ?? null;
      }
    }

    if (this.state.hearts <= 0) {
      this.state.hearts = 3;
      const index = Math.floor(this.random() * HEARTS_RETURN_MESSAGES.length);
      this.state.refillMessage = HEARTS_RETURN_MESSAGES[index] ?? HEARTS_RETURN_MESSAGES[0] ?? "Love is back!";
      this.state.refillMessageRemainingMs = 2_700;
      events.heartsRefilled = this.state.refillMessage;
    }

    const milestone = this.milestones[this.state.gateIndex];
    if (milestone && this.state.bride.gateStopped && this.state.groom.gateStopped) {
      this.state.currentMilestone = milestone.title;
      this.state.gatePopupRemainingMs = MILESTONE_HOLD_MS;
      events.milestone = milestone;
    } else if (
      this.state.gateIndex >= this.milestones.length &&
      this.state.bride.progress >= 100 &&
      this.state.groom.progress >= 100
    ) {
      this.state.status = "complete";
      events.finale = true;
    }

    return events;
  }

  getGameState(): GameStateMessage {
    const positionPercent = (this.state.bride.progress + this.state.groom.progress) / 2;
    return {
      type: "state",
      status: this.state.status,
      score: this.state.score,
      hearts: this.state.hearts,
      positionPercent: Number(positionPercent.toFixed(2)),
      currentMilestone: this.state.currentMilestone,
      lanePositions: {
        bride: Number(this.state.bride.progress.toFixed(2)),
        groom: Number(this.state.groom.progress.toFixed(2)),
      },
      gateWaiting: {
        bride: this.state.bride.gateStopped,
        groom: this.state.groom.gateStopped,
      },
    };
  }
}