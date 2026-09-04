export function resolveServerUrl(
  configuredUrl: string | undefined,
  isDevelopment: boolean,
  browserUrl: string,
): string {
  const configured = configuredUrl?.trim();
  if (configured) return configured;

  const current = new URL(browserUrl);
  if (!isDevelopment) return current.origin;

  current.port = "3001";
  current.pathname = "/";
  current.search = "";
  current.hash = "";
  return current.origin;
}
