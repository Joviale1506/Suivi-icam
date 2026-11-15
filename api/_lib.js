// Outils partagés par les fonctions serverless (préfixe _ : pas une route Vercel)
import { timingSafeEqual } from "node:crypto";

export function send(res, status, body, headers = {}) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(body));
}

export function checkAuth(req, res) {
  const expected = process.env.APP_PASSWORD;
  if (!expected) { send(res, 500, { error: "APP_PASSWORD n'est pas configuré sur Vercel." }); return false; }
  const got = String(req.headers["x-app-password"] || "");
  const a = Buffer.from(got), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) { send(res, 401, { error: "Mot de passe incorrect." }); return false; }
  return true;
}

export async function readJson(req) {
  if (req.body !== undefined && req.body !== null && req.body !== "") {
    return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const txt = Buffer.concat(chunks).toString("utf8");
  return txt ? JSON.parse(txt) : null;
}

// ---- Stockage : Upstash Redis (REST), configuré via l'intégration Vercel ----
const URL_ = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
export const hasStore = () => !!(URL_() && TOKEN());

async function redis(cmd) {
  const r = await fetch(URL_(), {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN()}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  if (!r.ok) throw new Error("Redis " + r.status + " " + (await r.text()).slice(0, 200));
  return (await r.json()).result;
}
export async function kvGet(key) {
  const v = await redis(["GET", key]);
  return v == null ? null : JSON.parse(v);
}
export async function kvSet(key, value) {
  return redis(["SET", key, JSON.stringify(value)]);
}
