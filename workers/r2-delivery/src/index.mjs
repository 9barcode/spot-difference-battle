const ALLOWED_OBJECTS = new Map([
  ["/puzzles/home-office/2026-08-28.2/runtime/original.webp", "puzzles/home-office/2026-08-28.2/runtime/original.webp"],
  ["/puzzles/home-office/2026-08-28.2/runtime/modified.webp", "puzzles/home-office/2026-08-28.2/runtime/modified.webp"],
]);

export async function handleRequest(request, env) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
  }
  const key = ALLOWED_OBJECTS.get(new URL(request.url).pathname);
  if (!key) return new Response("Not Found", { status: 404 });
  const object = await env.PUZZLE_ASSETS.get(key);
  if (!object) return new Response("Not Found", { status: 404 });
  return new Response(request.method === "HEAD" ? null : object.body, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export default { fetch: handleRequest };
