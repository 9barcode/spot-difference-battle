export const LOCAL_DEVELOPMENT_WEB_ORIGIN =
  /^http:\/\/(?:localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}):5173$/;

export function resolveWebOrigin(
  configuredOrigin: string | undefined,
  nodeEnvironment: string | undefined,
): string | string[] | RegExp | undefined {
  const configured = configuredOrigin?.trim();
  if (configured) {
    const origins = configured
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
    if (origins.length === 0) {
      throw new Error("WEB_ORIGIN must contain at least one exact URL origin.");
    }
    if (origins.some((origin) => new URL(origin).origin !== origin)) {
      throw new Error("WEB_ORIGIN entries must be exact URL origins.");
    }
    return origins.length === 1 ? origins[0] : origins;
  }
  return nodeEnvironment === "production" ? undefined : LOCAL_DEVELOPMENT_WEB_ORIGIN;
}
