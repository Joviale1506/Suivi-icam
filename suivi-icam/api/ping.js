// GET /api/ping → vérifie le mot de passe et indique ce qui est configuré
import { send, checkAuth, hasStore } from "./_lib.js";

export default async function handler(req, res) {
  if (!checkAuth(req, res)) return;
  send(res, 200, { ok: true, store: hasStore(), ical: !!process.env.ICAL_URL });
}
