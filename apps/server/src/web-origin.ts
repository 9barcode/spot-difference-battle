export const LOCAL_DEVELOPMENT_WEB_ORIGIN =
  /^http:\/\/(?:localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}):5173$/;

export const APPS_IN_TOSS_WEB_ORIGINS = [
  "https://spot-difference-syk.apps.tossmini.com",
  "https://spot-difference-syk.private-apps.tossmini.com",
] as const;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function resolveWebOrigin(
  configuredOrigin: string | undefined,
  nodeEnvironment: string | undefined,
): string | string[] | RegExp | undefined {
  const configured = configuredOrigin?.trim();
  let configuredOrigins: string[] = [];
  if (configured) {
    configuredOrigins = configured
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
    if (configuredOrigins.length === 0) {
      throw new Error("WEB_ORIGIN must contain at least one exact URL origin.");
    }
    if (configuredOrigins.some((origin) => new URL(origin).origin !== origin)) {
      throw new Error("WEB_ORIGIN entries must be exact URL origins.");
    }
  }

  if (nodeEnvironment === "production") {
    const origins = [...new Set([...configuredOrigins, ...APPS_IN_TOSS_WEB_ORIGINS])];
    return new RegExp(`^(?:${origins.map(escapeRegExp).join("|")})$`);
  }

  if (configuredOrigins.length > 0) {
    return configuredOrigins.length === 1 ? configuredOrigins[0] : configuredOrigins;
  }
  return LOCAL_DEVELOPMENT_WEB_ORIGIN;
}
