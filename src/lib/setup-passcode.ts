export function isSetupPasscodeConfigured(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length >= 8;
}