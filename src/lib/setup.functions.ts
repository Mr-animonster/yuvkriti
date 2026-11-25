import { createHash, timingSafeEqual } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { getRequest, useSession } from "@tanstack/react-start/server";
import { z } from "zod";

import { gameConfigSchema, LOVE_STORY_MEDIA_BUCKET } from "@/lib/game-config";
import { isSetupPasscodeConfigured } from "@/lib/setup-passcode";

type SetupSession = { unlocked?: boolean };

function getSetupSessionOptions() {
  const password = process.env["SESSION_SECRET"];
  if (!password) throw new Error("Setup session encryption is not configured.");

  const secure = new URL(getRequest().url).protocol === "https:";
  return {
    password,
    name: "love-story-runner-setup",
    maxAge: 60 * 60 * 12,
    cookie: { httpOnly: true, secure, sameSite: "lax" as const, path: "/" },
  };
}

function matchesPasscode(input: string, expected: string) {
  const inputHash = createHash("sha256").update(input, "utf8").digest();
  const expectedHash = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(inputHash, expectedHash);
}

async function hasUnlockedSetup() {
  const session = await useSession<SetupSession>(getSetupSessionOptions());
  return session.data.unlocked === true;
}

export const getSetupData = createServerFn({ method: "GET" }).handler(async () => {
  const configured = isSetupPasscodeConfigured(process.env["SETUP_PASSCODE"]);
  if (!(await hasUnlockedSetup())) return { unlocked: false, configured, config: null };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("game_config").select("*").maybeSingle();
  if (error) throw new Error("The wedding details could not be loaded.");

  return { unlocked: true, configured, config: data };
});

export const unlockSetup = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ password: z.string().max(256) }).parse(input))
  .handler(async ({ data }) => {
    const expected = process.env["SETUP_PASSCODE"];
    if (!isSetupPasscodeConfigured(expected)) return { ok: false as const, configured: false };
    if (!matchesPasscode(data.password, expected)) return { ok: false as const, configured: true };

    const session = await useSession<SetupSession>(getSetupSessionOptions());
    await session.update({ unlocked: true });
    return { ok: true as const, configured: true };
  });

export const saveGameConfig = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => gameConfigSchema.parse(input))
  .handler(async ({ data }) => {
    if (!(await hasUnlockedSetup())) throw new Error("Unlock setup before saving changes.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const milestones = data.milestones.map((milestone) => ({
      ...milestone,
      year: Number(milestone.year),
    }));
    const { error } = await supabaseAdmin.from("game_config").upsert(
      {
        singleton_key: true,
        bride_name: data.brideName,
        groom_name: data.groomName,
        wedding_date: data.weddingDate,
        finale_message: data.finaleMessage,
        bride_face_photo: data.brideFacePhoto,
        groom_face_photo: data.groomFacePhoto,
        background_music: data.backgroundMusic || null,
        milestones,
        obstacle_labels: data.obstacleLabels,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "singleton_key" },
    );

    if (error) throw new Error("The wedding details could not be saved.");
    return { ok: true as const };
  });

function parseMediaFormData(input: unknown) {
  if (!(input instanceof FormData)) throw new Error("Choose a file to upload.");
  const file = input.get("file");
  const kind = input.get("kind");
  if (!(file instanceof File)) throw new Error("Choose a file to upload.");
  if (
    kind !== "bride_face" &&
    kind !== "groom_face" &&
    kind !== "background_music" &&
    kind !== "milestone"
  ) {
    throw new Error("Choose a supported media type.");
  }
  return { file, kind };
}

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const AUDIO_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
]);
const FILE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/wav": "wav",
  "audio/ogg": "ogg",
  "audio/webm": "webm",
};

export const uploadGameMedia = createServerFn({ method: "POST" })
  .inputValidator(parseMediaFormData)
  .handler(async ({ data }) => {
    if (!(await hasUnlockedSetup())) throw new Error("Unlock setup before uploading files.");

    const allowedTypes = data.kind === "background_music" ? AUDIO_MIME_TYPES : IMAGE_MIME_TYPES;
    const maximumBytes = data.kind === "background_music" ? 25 * 1024 * 1024 : 10 * 1024 * 1024;
    if (!allowedTypes.has(data.file.type)) throw new Error("Choose a supported image or audio file.");
    if (data.file.size > maximumBytes) throw new Error("This file is larger than the allowed size.");

    const extension = FILE_EXTENSIONS[data.file.type];
    if (!extension) throw new Error("Choose a supported image or audio file.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const path = `game-config/${data.kind}/${crypto.randomUUID()}.${extension}`;
    const { data: uploaded, error } = await supabaseAdmin.storage
      .from(LOVE_STORY_MEDIA_BUCKET)
      .upload(path, data.file, {
        cacheControl: "31536000",
        contentType: data.file.type,
        upsert: false,
      });

    if (error) throw new Error("This file could not be uploaded. Please try again.");
    return { path: uploaded.path };
  });

export const lockSetup = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<SetupSession>(getSetupSessionOptions());
  await session.clear();
  return { ok: true as const };
});