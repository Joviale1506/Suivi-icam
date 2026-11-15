// GET/PUT /api/state → ta progression (critères, tâches cochées, notes)
import { send, checkAuth, readJson, hasStore, kvGet, kvSet } from "./_lib.js";

export default async function handler(req, res) {
  if (!checkAuth(req, res)) return;
  if (!hasStore()) return send(res, 501, { error: "Stockage non configuré (connecte Upstash Redis dans Vercel → Storage)." });
  try {
    if (req.method === "GET") {
      const s = await kvGet("suivi:state");
      return send(res, 200, s || {});
    }
    if (req.method === "PUT" || req.method === "POST") {
      const body = await readJson(req);
      if (!body || typeof body !== "object" || Array.isArray(body)) return send(res, 400, { error: "Corps invalide" });
      body.savedAt = new Date().toISOString();
      await kvSet("suivi:state", body);
      return send(res, 200, { ok: true, savedAt: body.savedAt });
    }
    return send(res, 405, { error: "Méthode non autorisée" });
  } catch (e) {
    return send(res, 500, { error: e.message });
  }
}
