import { describe, expect, it } from "vitest";

import {
  canStartGame,
  findRoleClaimWinner,
  GAME_STATE_INTERVAL_MS,
  isGameStateMessage,
  isJumpMessage,
} from "@/lib/game-realtime";

describe("wedding room realtime rules", () => {
  it("emits controller state at five updates per second", () => {
    expect(GAME_STATE_INTERVAL_MS).toBe(200);
  });

  it("starts only when both roles are connected unless the host overrides", () => {
    expect(canStartGame(true, true, false)).toBe(true);
    expect(canStartGame(true, false, false)).toBe(false);
    expect(canStartGame(false, false, true)).toBe(true);
  });

  it("chooses only one holder for a role, preserving the earliest claim", () => {
    const winner = findRoleClaimWinner(
      {
        "phone-b": [{ role: "bride", playerId: "phone-b", claimedAt: 20 }],
        "phone-a": [{ role: "bride", playerId: "phone-a", claimedAt: 10 }],
      },
      "bride",
    );

    expect(winner?.playerId).toBe("phone-a");
    expect(findRoleClaimWinner({}, "groom")).toBeNull();
  });

  it("accepts the room jump and state message shapes", () => {
    expect(isJumpMessage({ type: "jump", role: "bride", timestamp: 1 })).toBe(true);
    expect(isJumpMessage({ type: "jump", role: "host", timestamp: 1 })).toBe(false);
    expect(
      isGameStateMessage({
        type: "state",
        status: "playing",
        score: 0,
        hearts: 3,
        positionPercent: 0,
        currentMilestone: "First Meeting",
        lanePositions: { bride: 0, groom: 0 },
        gateWaiting: { bride: false, groom: false },
      }),
    ).toBe(true);
  });
});