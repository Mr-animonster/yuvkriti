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
  HIT_REACTION_MS,
  FUFA_BEAT_MS,
  finaleStageAt,
} from "@/lib/runner-engine";

describe("wedding runner engine", () => {
  function fufaGame() {
    const config = createSampleGameConfig();
    config.milestones = [];
    const game = new RunnerSimulation("1842", config);
    game.state.bride.progress = 60;
    game.state.groom.progress = 60;
    game.update(0);
    return game;
  }

  function advance(game: RunnerSimulation, ms: number) {
    for (let remaining = ms; remaining > 0; remaining -= 50) game.update(Math.min(remaining, 50));
  }

  it("costs one heart, stumbles, and keeps a hit reaction for exactly 1.5 seconds", () => {
    const game = new RunnerSimulation("1842", createSampleGameConfig());
    game.track.length = 0;
    game.track.push({ id: "hit-fufa", progress: 0.01, kind: "obstacle", label: "Angry Fufa", cartoon: 0 });
    game.state.groom.processedItemIds.add("hit-fufa");
    game.update(16);
    expect(game.state.hearts).toBe(2);
    expect(game.state.bride.stumbleRemainingMs).toBe(900);
    expect(game.state.bride.hitReaction).toBe("Humein toh kisi ne bataya hi nahi!");
    expect(HIT_REACTION_MS).toBe(1500);
    advance(game, 1499);
    expect(game.state.bride.hitReactionRemainingMs).toBe(1);
    game.update(1);
    expect(game.state.bride.hitReaction).toBeNull();
  });

  it("refills zero hearts instead of ending the game", () => {
    const game = new RunnerSimulation("1842", createSampleGameConfig());
    game.state.hearts = 0;
    expect(game.update(16).heartsRefilled).toBeTruthy();
    expect(game.state.hearts).toBe(3);
    expect(game.state.status).toBe("playing");
  });

  it("starts the extra Fufa beat only once both players reach 60%", () => {
    const game = fufaGame();
    expect(game.state.fufa.phase).toBe("angry");
    expect(game.state.bride.progress).toBe(60);
    expect(game.state.groom.progress).toBe(60);
    expect(game.track.length).toBeGreaterThan(8);
    advance(game, FUFA_BEAT_MS);
    expect(FUFA_BEAT_MS).toBe(6000);
    expect(game.state.fufa.phase).toBe("done");
    game.update(50);
    expect(game.state.fufa.phase).toBe("done");
    expect(game.state.bride.progress).toBeGreaterThan(60);
  });

  it("awards exactly three extra hearts for jumps 600ms apart, only once", () => {
    const game = fufaGame();
    game.jump("bride");
    advance(game, 600);
    game.jump("groom");
    expect(game.state.fufa.phase).toBe("blessing");
    expect(game.state.hearts).toBe(6);
    expect(game.update(0).blessing).toBe(true);
    game.jump("bride"); game.jump("groom");
    expect(game.update(0).blessing).toBe(false);
    expect(game.state.hearts).toBe(6);
  });

  it("does not reward jumps 601ms apart or penalize a missed blessing", () => {
    const game = fufaGame();
    game.jump("bride"); advance(game, 601); game.jump("groom");
    expect(game.state.fufa.phase).toBe("angry");
    advance(game, 3400);
    expect(game.state.fufa.phase).toBe("grumble");
    expect(game.state.hearts).toBe(3);
    expect(game.state.status).toBe("playing");
  });

  it("lets practice bots earn the blessing and resets it on restart", () => {
    const game = fufaGame(); game.practiceBots = true;
    advance(game, 1200);
    expect(game.state.fufa.phase).toBe("blessing");
    expect(game.state.hearts).toBe(6);
    game.restart();
    expect(game.state.fufa.phase).toBe("pending");
    expect(game.state.hearts).toBe(3);
  });

  it("includes laddoos, petals and ring boxes on seeded tracks", () => {
    const kinds = new Set(Array.from({ length: 20 }, (_, i) => createTrack(i + 1, 4, createSampleGameConfig().obstacleLabels)).flat().map((item) => item.kind));
    expect(kinds.has("laddoo")).toBe(true);
    expect(kinds.has("petals")).toBe(true);
    expect(kinds.has("ring")).toBe(true);
  });
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

  it("keeps controllers on Finale! until the Forever card, then asks Play again?", () => {
    expect(finaleStageAt(0)).toBe("celebration");
    expect(finaleStageAt(29_999)).toBe("celebration");
    expect(finaleStageAt(30_000)).toBe("playAgain");
  });
});
