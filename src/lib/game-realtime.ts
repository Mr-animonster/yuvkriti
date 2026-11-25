import type { GameStateMessage, JumpMessage, PartnerRole } from "@/lib/love-story-types";

export const GAME_STATE_INTERVAL_MS = 200;

export interface RoleClaim {
  playerId: string;
  claimedAt: number;
}

export function getRoomTopic(roomCode: string) {
  return `love-story-room-${roomCode}`;
}

export function canStartGame(brideConnected: boolean, groomConnected: boolean, hostOverride: boolean) {
  return hostOverride || (brideConnected && groomConnected);
}

export function findRoleClaimWinner(
  presence: Record<string, unknown>,
  role: PartnerRole,
): RoleClaim | null {
  const claims: RoleClaim[] = [];

  for (const entries of Object.values(presence)) {
    if (!Array.isArray(entries)) continue;

    for (const entry of entries) {
      if (typeof entry !== "object" || entry === null || Array.isArray(entry)) continue;
      const candidate = entry as Record<string, unknown>;
      const playerId = candidate["playerId"];
      const claimedAt = candidate["claimedAt"];
      if (
        candidate["role"] === role &&
        typeof playerId === "string" &&
        typeof claimedAt === "number" &&
        Number.isFinite(claimedAt)
      ) {
        claims.push({ playerId, claimedAt });
      }
    }
  }

  claims.sort((left, right) => left.claimedAt - right.claimedAt || left.playerId.localeCompare(right.playerId));
  return claims[0] ?? null;
}

export function isJumpMessage(value: unknown): value is JumpMessage {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const message = value as Record<string, unknown>;
  return (
    message["type"] === "jump" &&
    (message["role"] === "bride" || message["role"] === "groom") &&
    typeof message["timestamp"] === "number" &&
    Number.isFinite(message["timestamp"])
  );
}

export function isGameStateMessage(value: unknown): value is GameStateMessage {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const message = value as Record<string, unknown>;
  const isBaseState = (
    message["type"] === "state" &&
    (message["status"] === "waiting" ||
      message["status"] === "playing" ||
      message["status"] === "complete") &&
    typeof message["score"] === "number" &&
    Number.isFinite(message["score"]) &&
    typeof message["hearts"] === "number" &&
    Number.isFinite(message["hearts"]) &&
    typeof message["positionPercent"] === "number" &&
    Number.isFinite(message["positionPercent"]) &&
    (typeof message["currentMilestone"] === "string" || message["currentMilestone"] === null)
  );
  if (!isBaseState) return false;

  const lanePositions = message["lanePositions"];
  if (lanePositions !== undefined) {
    if (typeof lanePositions !== "object" || lanePositions === null || Array.isArray(lanePositions)) return false;
    const lanes = lanePositions as Record<string, unknown>;
    if (typeof lanes["bride"] !== "number" || typeof lanes["groom"] !== "number") return false;
  }

  const gateWaiting = message["gateWaiting"];
  if (gateWaiting !== undefined) {
    if (typeof gateWaiting !== "object" || gateWaiting === null || Array.isArray(gateWaiting)) return false;
    const waiting = gateWaiting as Record<string, unknown>;
    if (typeof waiting["bride"] !== "boolean" || typeof waiting["groom"] !== "boolean") return false;
  }

  return true;
}