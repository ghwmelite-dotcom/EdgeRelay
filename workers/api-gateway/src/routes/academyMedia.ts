import { Hono } from "hono";
import type { Env } from "../types.js";
export const academyMedia = new Hono<{ Bindings: Env }>();
const KEY = "academy/three-strategies/scarface-trades-course-v1.mp4";
academyMedia.on(["GET", "HEAD"], "/course", async (c) => {
  const meta = await c.env.STORAGE.head(KEY);
  if (!meta)
    return c.json(
      {
        data: null,
        error: {
          code: "MEDIA_UNAVAILABLE",
          message: "Course video unavailable",
        },
      },
      404,
    );
  const headers = new Headers({
    "Content-Type": "video/mp4",
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=3600",
    ETag: meta.httpEtag,
    "X-Content-Type-Options": "nosniff",
  });
  if (c.req.header("If-None-Match") === meta.httpEtag)
    return new Response(null, { status: 304, headers });
  let offset = 0,
    length = meta.size,
    status = 200;
  const range = c.req.header("Range");
  if (
    range &&
    (!c.req.header("If-Range") || c.req.header("If-Range") === meta.httpEtag)
  ) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2]))
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${meta.size}` },
      });
    if (!match[1]) {
      length = Math.min(Number(match[2]), meta.size);
      offset = meta.size - length;
    } else {
      offset = Number(match[1]);
      const end = match[2]
        ? Math.min(Number(match[2]), meta.size - 1)
        : meta.size - 1;
      length = end - offset + 1;
    }
    if (
      !Number.isSafeInteger(offset) ||
      !Number.isSafeInteger(length) ||
      offset < 0 ||
      offset >= meta.size ||
      length <= 0
    )
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${meta.size}` },
      });
    status = 206;
    headers.set(
      "Content-Range",
      `bytes ${offset}-${offset + length - 1}/${meta.size}`,
    );
  }
  headers.set("Content-Length", String(length));
  if (c.req.method === "HEAD") return new Response(null, { status, headers });
  const object = await c.env.STORAGE.get(KEY, { range: { offset, length } });
  if (!object) return new Response(null, { status: 404 });
  return new Response(object.body, { status, headers });
});
