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

export type LoveStoryRealtimeEvent =
  | { type: "session_updated"; session: LoveStorySession }
  | { type: "player_input"; input: PlayerInput }
  | { type: "partner_presence"; sessionId: string; role: PartnerRole; connected: boolean };