import { describe, expect, it } from "vitest";

import { createSampleGameConfig } from "@/lib/game-config";
import {
  createTrack,
  RUNNER_LOGICAL_HEIGHT,
  RUNNER_LOGICAL_WIDTH,
  RunnerSimulation,
  seedFromRoomCode,
  TARGET_RUN_DURATION_MS,
} from "@/lib/runner-engine";

describe("wedding runner engine", () => {
  it("creates the same obstacle sequence for a shared room seed", () => {
    const config = createSampleGameConfig();
    const first = createTrack(seedFromRoomCode("1842"), config.milestones.length, config.obstacleLabels);
    const second = createTrack(seedFromRoomCode("1842"), config.milestones.length, config.obstacleLabels);
    const otherRoom = createTrack(seedFromRoomCode("9301"), config.milestones.length, config.obstacleLabels);

    expect(first).toEqual(second);
    expect(otherRoom).not.toEqual(first);
  });

  it("uses one shared track for both lanes and waits at a shared gate", () => {
    const config = createSampleGameConfig();
    const game = new RunnerSimulation("1842", config);

    expect(game.state.track).toBe(game.track);
    expect(game.state.gateProgress).toHaveLength(config.milestones.length);
    expect(game.getGameState().hearts).toBe(3);
  });

  it("keeps the requested fixed canvas size and a three-minute-paced run", () => {
    const config = createSampleGameConfig();
    const game = new RunnerSimulation("1842", config);

    expect(RUNNER_LOGICAL_WIDTH).toBe(1920);
    expect(RUNNER_LOGICAL_HEIGHT).toBe(1080);
    expect(TARGET_RUN_DURATION_MS).toBe(150_000);
    expect(game.getGameState().status).toBe("playing");
    expect(game.track.length).toBeGreaterThan(8);
  });
});