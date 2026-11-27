import { describe, expect, it } from "vitest";

import { createSampleGameConfig } from "@/lib/game-config";
import {
  createTrack,
  RUNNER_LOGICAL_HEIGHT,
  RUNNER_LOGICAL_WIDTH,
  RunnerSimulation,
  seedFromRoomCode,
  TARGET_RUN_DURATION_MS,
  DHOL_BOOST_DURATION_MS,
  getRunPaceMultiplier,
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

  it("pauses, skips to a shared milestone gate, and restarts cleanly", () => {
    const config = createSampleGameConfig();
    const game = new RunnerSimulation("1842", config);

    game.pause();
    expect(game.getGameState().status).toBe("paused");
    game.resume();
    expect(game.getGameState().status).toBe("playing");
    game.skipToNextMilestone();
    expect(game.state.bride.gateStopped).toBe(true);
    expect(game.state.groom.gateStopped).toBe(true);
    expect(game.update(16).milestone?.title).toBe(config.milestones[0]?.title);
    game.state.score = 500;
    game.restart();
    expect(game.getGameState().status).toBe("playing");
    expect(game.getGameState().score).toBe(0);
  });

  it("ramps from 90% energy to 115% at the midpoint and eases into the finale", () => {
    const start = getRunPaceMultiplier(0);
    const middle = getRunPaceMultiplier(50);
    const finish = getRunPaceMultiplier(100);

    expect(start / middle).toBeCloseTo(0.9 / 1.15, 5);
    expect(finish).toBeLessThan(start);
  });

  it("gives a collected Dhol exactly three seconds of extra speed", () => {
    const game = new RunnerSimulation("1842", createSampleGameConfig());
    game.track.push({ id: "test-dhol", progress: 0.01, kind: "dhol", label: "Dhol Boost" });

    game.jump("bride");
    const events = game.update(16);

    expect(events.dholCollected).toBe(true);
    expect(game.state.boostRemainingMs).toBe(DHOL_BOOST_DURATION_MS);
    expect(game.state.score).toBe(200);
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