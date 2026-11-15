// Serveur de développement : imite Vercel (statique /public + fonctions /api)
// Option : MOCK=1 ajoute un faux Redis (/__redis) et un faux calendrier (/__ics) pour tester sans compte.
import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
const PORT = +process.env.PORT || 3000;
const root = new URL("..", import.meta.url).pathname;
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css", ".json": "application/json", ".ics": "text/calendar" };
const mem = new Map();
http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  try {
    if (process.env.MOCK && u.pathname === "/__redis") {
      let b = ""; for await (const c of req) b += c; const [cmd, k, v] = JSON.parse(b);
      res.setHeader("content-type", "application/json");
      return res.end(JSON.stringify({ result: cmd === "GET" ? (mem.get(k) ?? null) : (mem.set(k, v), "OK") }));
    }
    if (process.env.MOCK && u.pathname === "/__ics") {
      res.setHeader("content-type", "text/calendar"); return res.end(await readFile(process.env.MOCK_ICS));
    }
    if (u.pathname.startsWith("/api/")) {
      const mod = await import(join(root, "api", u.pathname.slice(5).replace(/[^a-z]/g, "") + ".js") + "?t=" + Date.now());
      return await mod.default(req, res);
    }
    let p = normalize(u.pathname === "/" ? "/index.html" : u.pathname);
    const data = await readFile(join(root, "public", p));
    res.setHeader("content-type", types[extname(p)] || "application/octet-stream"); res.end(data);
  } catch (e) { res.statusCode = e.code === "ENOENT" || e.code === "ERR_MODULE_NOT_FOUND" ? 404 : 500; res.end(String(e.message)); }
}).listen(PORT, () => console.log("http://localhost:" + PORT));
