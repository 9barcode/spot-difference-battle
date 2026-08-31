export const LOCAL_DEVELOPMENT_WEB_ORIGIN =
  /^http:\/\/(?:localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}):5173$/;

export const APPS_IN_TOSS_WEB_ORIGINS = [
  "https://spot-difference-syk.apps.tossmini.com",
  "https://spot-difference-syk.private-apps.tossmini.com",
] as const;

export type WebOrigin = string | RegExp | Array<string | RegExp>;

export function resolveWebOrigin(
  configuredOrigin: string | undefined,
  nodeEnvironment: string | undefined,
): WebOrigin | undefined {
  const configured = configuredOrigin?.trim();

  if (nodeEnvironment === "production") {
    return configured
      ? [configured, ...APPS_IN_TOSS_WEB_ORIGINS]
      : [...APPS_IN_TOSS_WEB_ORIGINS];
  }

  return configured || LOCAL_DEVELOPMENT_WEB_ORIGIN;
}
