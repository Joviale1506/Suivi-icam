// GET /api/pitch → dernier référentiel PITCH synchronisé
// POST /api/pitch → reçu depuis le favori « Synchroniser PITCH » (exécuté sur pitch-icam.rima1.fr)
import { send, checkAuth, readJson, hasStore, kvGet, kvSet } from "./_lib.js";

const CORS = {
  "Access-Control-Allow-Origin": "https://pitch-icam.rima1.fr",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, x-app-password",
  "Access-Control-Max-Age": "600",
  Vary: "Origin",
};

export default async function handler(req, res) {
  if (req.method === "OPTIONS") { res.statusCode = 204; for (const [k, v] of Object.entries(CORS)) res.setHeader(k, v); return res.end(); }
  for (const [k, v] of Object.entries(CORS)) res.setHeader(k, v);
  if (!checkAuth(req, res)) return;
  if (!hasStore()) return send(res, 501, { error: "Stockage non configuré (connecte Upstash Redis dans Vercel → Storage)." });
  try {
    if (req.method === "GET") {
      const p = await kvGet("suivi:pitch");
      return p ? send(res, 200, p) : send(res, 404, { error: "Aucune synchronisation PITCH pour l'instant." });
    }
    if (req.method === "POST") {
      const d = await readJson(req);
      if (!d || !Array.isArray(d.competences) || !d.competences.length) return send(res, 400, { error: "Données PITCH invalides" });
      d.receivedAt = new Date().toISOString();
      await kvSet("suivi:pitch", d);
      const nAA = d.competences.reduce((x, c) => x + c.ra.reduce((y, r) => y + r.aa.length, 0), 0);
      return send(res, 200, { ok: true, competences: d.competences.length, aa: nAA });
    }
    return send(res, 405, { error: "Méthode non autorisée" });
  } catch (e) {
    return send(res, 500, { error: e.message });
  }
}
