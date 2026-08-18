export const LOCAL_DEVELOPMENT_WEB_ORIGIN =
  /^http:\/\/(?:localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}):5173$/;

export function resolveWebOrigin(
  configuredOrigin: string | undefined,
  nodeEnvironment: string | undefined,
): string | RegExp | undefined {
  const configured = configuredOrigin?.trim();
  if (configured) return configured;
  return nodeEnvironment === "production" ? undefined : LOCAL_DEVELOPMENT_WEB_ORIGIN;
}
