export type PartnerRole = "bride" | "groom";

export type LoveStorySessionStatus = "waiting" | "ready" | "playing" | "complete";

export interface PartnerProfile {
  name: string | null;
  connected: boolean;
}

export interface LoveStorySession {
  id: string;
  joinCode: string;
  status: LoveStorySessionStatus;
  partners: Record<PartnerRole, PartnerProfile>;
  createdAt: string;
}

export interface Milestone {
  id: string;
  title: string;
  photoPath: string;
  caption: string;
  year: number;
}

export interface MilestoneDraft extends Omit<Milestone, "year"> {
  year: string;
}

export interface GameConfigDraft {
  brideName: string;
  groomName: string;
  weddingDate: string;
  finaleMessage: string;
  brideFacePhoto: string;
  groomFacePhoto: string;
  backgroundMusic: string;
  milestones: MilestoneDraft[];
  obstacleLabels: string[];
}

export interface GameConfigRecord extends GameConfigDraft {
  id: string;
  updatedAt: string;
}

export type RealtimeValue =
  | string
  | number
  | boolean
  | null
  | RealtimeValue[]
  | { [key: string]: RealtimeValue };

export interface PlayerInput {
  sessionId: string;
  role: PartnerRole;
  action: string;
  payload: { [key: string]: RealtimeValue };
  sentAt: string;
}

export type GameStateStatus = "waiting" | "playing" | "complete";

export interface JumpMessage {
  type: "jump";
  role: PartnerRole;
  timestamp: number;
}

export interface GameStateMessage {
  type: "state";
  status: GameStateStatus;
  score: number;
  hearts: number;
  positionPercent: number;
  currentMilestone: string | null;
  lanePositions?: Record<PartnerRole, number>;
  gateWaiting?: Record<PartnerRole, boolean>;
}

export type LoveStoryRealtimeEvent =
  | { type: "session_updated"; session: LoveStorySession }
  | { type: "player_input"; input: PlayerInput }
  | { type: "partner_presence"; sessionId: string; role: PartnerRole; connected: boolean }
  | JumpMessage
  | GameStateMessage;