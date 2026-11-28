import { describe, expect, it } from "vitest";

import { createSampleGameConfig, gameConfigSchema } from "@/lib/game-config";

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
  it("uses Prakriti and Yuvraj as the sample couple", () => {
    const sample = createSampleGameConfig();

    expect(sample.brideName).toBe("Prakriti");
    expect(sample.groomName).toBe("Yuvraj");
  });

  it("accepts 4–8 milestones and rejects values outside that range", () => {
    expect(gameConfigSchema.safeParse(validConfig(4, 8)).success).toBe(true);
    expect(gameConfigSchema.safeParse(validConfig(8, 8)).success).toBe(true);
    expect(gameConfigSchema.safeParse(validConfig(3, 8)).success).toBe(false);
    expect(gameConfigSchema.safeParse(validConfig(9, 8)).success).toBe(false);
  });

  it("accepts the six default obstacles through twelve custom labels", () => {
    expect(createSampleGameConfig().obstacleLabels).toEqual(["Angry Fufa", "Gossip Aunties", "Selfie-Stick Cousin", "DJ Speaker Blast", "Halwai Jalebi Plate", "Dancing Uncle"]);
    expect(gameConfigSchema.safeParse(validConfig(4, 6)).success).toBe(true);
    expect(gameConfigSchema.safeParse(validConfig(4, 12)).success).toBe(true);
    expect(gameConfigSchema.safeParse(validConfig(4, 5)).success).toBe(false);
    expect(gameConfigSchema.safeParse(validConfig(4, 13)).success).toBe(false);
  });
});