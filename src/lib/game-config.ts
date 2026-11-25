import { z } from "zod";

import type { GameConfigDraft, MilestoneDraft } from "@/lib/love-story-types";
import type { Tables } from "@/integrations/supabase/types";

export const LOVE_STORY_MEDIA_BUCKET = "love-story-media";

const oneLineText = (maxLength: number) =>
  z
    .string()
    .trim()
    .min(1, "This field is required.")
    .max(maxLength, `Keep this to ${maxLength} characters or fewer.`)
    .refine((value) => !/[\r\n]/.test(value), "Use one line of text.");

const mediaPath = z
  .string()
  .trim()
  .min(1, "Upload this photo before saving.")
  .max(512)
  .refine((value) => value.startsWith("game-config/"), "Choose a photo from this setup.");

const milestoneSchema = z.object({
  id: z.string().min(1),
  title: oneLineText(80),
  photoPath: mediaPath,
  caption: oneLineText(180),
  year: z.string().regex(/^\d{4}$/, "Enter a four-digit year."),
});

export const gameConfigSchema = z.object({
  brideName: oneLineText(80),
  groomName: oneLineText(80),
  weddingDate: z
    .string()
    .refine((value) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
      const date = new Date(`${value}T00:00:00.000Z`);
      return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
    }, "Choose a valid wedding date."),
  finaleMessage: z.string().trim().min(1, "Add a short finale message.").max(280),
  brideFacePhoto: mediaPath,
  groomFacePhoto: mediaPath,
  backgroundMusic: z
    .string()
    .max(512)
    .refine((value) => value === "" || value.startsWith("game-config/"), "Choose a valid audio file."),
  milestones: z.array(milestoneSchema).min(4, "Add at least 4 milestones.").max(8, "Use no more than 8 milestones."),
  obstacleLabels: z
    .array(oneLineText(80))
    .min(8, "Add at least 8 obstacle labels.")
    .max(12, "Use no more than 12 obstacle labels."),
});

const storedMilestoneSchema = z.object({
  id: z.string(),
  title: z.string(),
  photoPath: z.string(),
  caption: z.string(),
  year: z.number().int(),
});

export function createBlankGameConfig(): GameConfigDraft {
  return {
    brideName: "",
    groomName: "",
    weddingDate: "",
    finaleMessage: "",
    brideFacePhoto: "",
    groomFacePhoto: "",
    backgroundMusic: "",
    milestones: Array.from({ length: 4 }, (_, index) => ({
      id: `milestone-${index + 1}`,
      title: "",
      photoPath: "",
      caption: "",
      year: "",
    })),
    obstacleLabels: Array.from({ length: 8 }, () => ""),
  };
}

export function createSampleGameConfig(): GameConfigDraft {
  return {
    brideName: "Prakriti",
    groomName: "Yuvraj",
    weddingDate: "2026-12-02",
    finaleMessage: "And so, their best adventure began.",
    brideFacePhoto: "",
    groomFacePhoto: "",
    backgroundMusic: "",
    milestones: [
      {
        id: "sample-first-meeting",
        title: "First Meeting",
        photoPath: "",
        caption: "The day our story began.",
        year: "2019",
      },
      {
        id: "sample-first-date",
        title: "First Date",
        photoPath: "",
        caption: "A little courage, a lot of laughter.",
        year: "2020",
      },
      {
        id: "sample-big-question",
        title: "The Big Question",
        photoPath: "",
        caption: "One question, forever.",
        year: "2024",
      },
      {
        id: "sample-wedding-day",
        title: "Wedding Day",
        photoPath: "",
        caption: "Here we are, together.",
        year: "2026",
      },
    ],
    obstacleLabels: [
      "Sharma Uncle’s Questions",
      "Mehendi Stains",
      "DJ’s Playlist",
      "Dance Floor Detour",
      "Too Many Sweets",
      "The Cousin Photo",
      "Late Baraat",
      "Missing Safety Pins",
    ],
  };
}

export function draftFromGameConfig(record: Tables<"game_config"> | null): GameConfigDraft {
  if (!record) return createBlankGameConfig();

  const parsedMilestones = z.array(storedMilestoneSchema).safeParse(record.milestones);
  const milestones: MilestoneDraft[] = parsedMilestones.success
    ? parsedMilestones.data.map((milestone) => ({ ...milestone, year: String(milestone.year) }))
    : createBlankGameConfig().milestones;

  return {
    brideName: record.bride_name,
    groomName: record.groom_name,
    weddingDate: record.wedding_date,
    finaleMessage: record.finale_message,
    brideFacePhoto: record.bride_face_photo,
    groomFacePhoto: record.groom_face_photo,
    backgroundMusic: record.background_music ?? "",
    milestones,
    obstacleLabels: [...record.obstacle_labels],
  };
}

export function firstMilestoneTitle(value: unknown): string | null {
  const result = z.array(storedMilestoneSchema).safeParse(value);
  return result.success ? (result.data[0]?.title ?? null) : null;
}

export function getPublicMediaUrl(path: string): string | null {
  const baseUrl = import.meta.env["VITE_SUPABASE_URL"];
  if (!path || !baseUrl) return null;
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `${baseUrl.replace(/\/+$/, "")}/storage/v1/object/public/${LOVE_STORY_MEDIA_BUCKET}/${encodedPath}`;
}