export function requireHttpsUrl(value: string, name: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid absolute URL.`);
  }

  if (url.protocol !== "https:") {
    throw new Error(`${name} must use https://.`);
  }
  if (url.username || url.password) {
    throw new Error(`${name} must not contain credentials.`);
  }
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error(`${name} must be an origin without a path, query, or hash.`);
  }
  return url.origin;
}

export function requireHttpsAssetUrl(value: string, name: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid absolute URL.`);
  }

  if (url.protocol !== "https:") {
    throw new Error(`${name} must use https://.`);
  }
  if (url.username || url.password) {
    throw new Error(`${name} must not contain credentials.`);
  }
  if (url.hash) {
    throw new Error(`${name} must not contain a URL fragment.`);
  }
  return url.href;
}
