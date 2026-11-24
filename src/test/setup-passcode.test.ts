import { describe, expect, it } from "vitest";

import { isSetupPasscodeConfigured } from "@/lib/setup-passcode";

describe("setup passcode configuration", () => {
  it("requires at least eight non-whitespace characters", () => {
    expect(isSetupPasscodeConfigured("wedding!")).toBe(true);
    expect(isSetupPasscodeConfigured("short7")).toBe(false);
    expect(isSetupPasscodeConfigured("        ")).toBe(false);
    expect(isSetupPasscodeConfigured(undefined)).toBe(false);
  });
});