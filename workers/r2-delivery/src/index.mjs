const ALLOWED_OBJECTS = new Map([
  ["/puzzles/home-office/2026-08-28.2/runtime/original.webp", "puzzles/home-office/2026-08-28.2/runtime/original.webp"],
  ["/puzzles/home-office/2026-08-28.2/runtime/modified.webp", "puzzles/home-office/2026-08-28.2/runtime/modified.webp"],
]);

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

function errorResponse(message, status, headers = {}) {
  return new Response(message, {
    status,
    headers: { ...NO_STORE_HEADERS, ...headers },
  });
}

export async function handleRequest(request, env) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return errorResponse("Method Not Allowed", 405, { Allow: "GET, HEAD" });
  }
  const key = ALLOWED_OBJECTS.get(new URL(request.url).pathname);
  if (!key) return errorResponse("Not Found", 404);

  let object;
  try {
    object = await env.PUZZLE_ASSETS.get(key);
  } catch {
    return errorResponse("Internal Server Error", 500);
  }
  if (!object) return errorResponse("Not Found", 404);
  return new Response(request.method === "HEAD" ? null : object.body, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export default { fetch: handleRequest };
