import { requireHttpsUrl } from "./url-policy.js";

export function resolveServerUrl(
  configuredUrl: string | undefined,
  isDevelopment: boolean,
  browserUrl: string,
): string {
  const configured = configuredUrl?.trim();
  if (configured) {
    return isDevelopment
      ? new URL(configured).origin
      : requireHttpsUrl(configured, "VITE_SERVER_URL");
  }

  const current = new URL(browserUrl);
  if (!isDevelopment) {
    if (!["http:", "https:"].includes(current.protocol)) {
      throw new Error(
        "VITE_SERVER_URL is required when the production client is not served from an HTTP origin.",
      );
    }
    return current.origin;
  }

  current.port = "3001";
  current.pathname = "/";
  current.search = "";
  current.hash = "";
  return current.origin;
}
