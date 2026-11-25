import { describe, expect, it } from "vitest";

import { gameConfigSchema } from "@/lib/game-config";

function validConfig(milestoneCount: number, obstacleCount: number) {
  return {
    brideName: "Aanya",
    groomName: "Rohan",
    weddingDate: "2026-12-12",
    finaleMessage: "Their best adventure began.",
    brideFacePhoto: "game-config/bride/portrait.jpg",
    groomFacePhoto: "game-config/groom/portrait.jpg",
    backgroundMusic: "",
    milestones: Array.from({ length: milestoneCount }, (_, index) => ({
      id: `milestone-${index}`,
      title: `Milestone ${index}`,
      photoPath: `game-config/milestone/${index}.jpg`,
      caption: `A moment from year ${index}.`,
      year: "2020",
    })),
    obstacleLabels: Array.from({ length: obstacleCount }, (_, index) => `Obstacle ${index}`),
  };
}

describe("game configuration limits", () => {
  it("accepts 4–8 milestones and rejects values outside that range", () => {
    expect(gameConfigSchema.safeParse(validConfig(4, 8)).success).toBe(true);
    expect(gameConfigSchema.safeParse(validConfig(8, 8)).success).toBe(true);
    expect(gameConfigSchema.safeParse(validConfig(3, 8)).success).toBe(false);
    expect(gameConfigSchema.safeParse(validConfig(9, 8)).success).toBe(false);
  });

  it("accepts 8–12 obstacle labels and rejects values outside that range", () => {
    expect(gameConfigSchema.safeParse(validConfig(4, 8)).success).toBe(true);
    expect(gameConfigSchema.safeParse(validConfig(4, 12)).success).toBe(true);
    expect(gameConfigSchema.safeParse(validConfig(4, 7)).success).toBe(false);
    expect(gameConfigSchema.safeParse(validConfig(4, 13)).success).toBe(false);
  });
});