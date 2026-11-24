import { createHash, timingSafeEqual } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { getRequest, useSession } from "@tanstack/react-start/server";
import { z } from "zod";

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

export const getSetupAccess = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<SetupSession>(getSetupSessionOptions());
  return {
    unlocked: Boolean(session.data.unlocked),
    configured: isSetupPasscodeConfigured(process.env["SETUP_PASSCODE"]),
  };
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

export const lockSetup = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<SetupSession>(getSetupSessionOptions());
  await session.clear();
  return { ok: true as const };
});