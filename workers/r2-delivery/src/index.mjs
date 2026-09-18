const PATH_PATTERN =
  /^\/puzzles\/([a-z0-9][a-z0-9-]*)\/(\d{4}-\d{2}-\d{2}\.\d+)\/runtime\/(original|modified)\.webp$/;

const ALLOWED_ASSETS = new Set(["home-office/2026-08-28.2"]);

const OUTCOME = {
  ok: { status: 200, level: "log" },
  not_modified: { status: 304, level: "log" },
  bad_path: { status: 400, level: "warn", body: "Bad Request" },
  not_allowed: { status: 404, level: "warn", body: "Not Found" },
  asset_missing: { status: 502, level: "error", body: "Bad Gateway" },
  internal_error: { status: 500, level: "error", body: "Internal Server Error" },
  method_not_allowed: { status: 405, level: "warn", body: "Method Not Allowed" },
};

const BASE_HEADERS = { "X-Content-Type-Options": "nosniff" };
const NO_STORE_HEADERS = { "Cache-Control": "no-store" };
const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";
const CACHEABLE_OUTCOMES = new Set(["ok", "not_modified"]);

function createLogger(sink = console) {
  return (outcome, detail = {}) => {
    const level = OUTCOME[outcome]?.level ?? "log";
    const write = sink[level] ?? sink.log;
    write.call(sink, JSON.stringify({ event: "asset_request", outcome, ...detail }));
  };
}

const defaultLog = createLogger();

function respond(outcome, { headers = {}, body = null } = {}) {
  const spec = OUTCOME[outcome];
  const cacheHeaders = CACHEABLE_OUTCOMES.has(outcome) ? {} : NO_STORE_HEADERS;
  return new Response(body ?? spec.body ?? null, {
    status: spec.status,
    headers: { ...BASE_HEADERS, ...cacheHeaders, ...headers },
  });
}

export async function handleRequest(request, env, options = {}) {
  const log = options.log ?? defaultLog;
  const method = request.method;

  if (method !== "GET" && method !== "HEAD") {
    log("method_not_allowed", { method });
    return respond("method_not_allowed", { headers: { Allow: "GET, HEAD" } });
  }

  const url = new URL(request.url);
  if (url.search) {
    log("bad_path", { method, reason: "query_string" });
    return respond("bad_path");
  }

  const match = PATH_PATTERN.exec(url.pathname);
  if (!match) {
    log("bad_path", { method, reason: "path_format" });
    return respond("bad_path");
  }

  const [, pairId, assetVersion, kind] = match;
  if (!ALLOWED_ASSETS.has(`${pairId}/${assetVersion}`)) {
    log("not_allowed", { method, pairId, assetVersion, kind });
    return respond("not_allowed");
  }

  const key = `puzzles/${pairId}/${assetVersion}/runtime/${kind}.webp`;
  let object;
  try {
    object = await env.PUZZLE_ASSETS.get(key);
  } catch {
    log("internal_error", { method, pairId, assetVersion, kind });
    return respond("internal_error");
  }

  if (!object) {
    log("asset_missing", { method, pairId, assetVersion, kind });
    return respond("asset_missing");
  }

  const headers = {
    "Content-Type": "image/webp",
    "Cache-Control": IMMUTABLE_CACHE,
  };
  const etag = object.httpEtag ?? (object.etag ? `"${object.etag}"` : null);
  if (etag) {
    headers.ETag = etag;
    if (request.headers.get("if-none-match") === etag) {
      log("not_modified", { method, pairId, assetVersion, kind });
      return respond("not_modified", { headers });
    }
  }

  log("ok", { method, pairId, assetVersion, kind });
  return respond("ok", {
    headers,
    body: method === "HEAD" ? null : object.body,
  });
}

export default { fetch: handleRequest };
export { ALLOWED_ASSETS, createLogger, PATH_PATTERN };