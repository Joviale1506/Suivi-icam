// GET /api/planning → emploi du temps HyperPlanning à jour (lien iCal gardé secret côté serveur)
import { send, checkAuth, hasStore, kvGet, kvSet } from "./_lib.js";
import { parseIcs } from "./_ics.js";

let memo = null; // cache en mémoire de l'instance (15 min)

export default async function handler(req, res) {
  if (!checkAuth(req, res)) return;
  const force = /[?&]refresh=1/.test(req.url || "");
  if (!force && memo && Date.now() - memo.at < 15 * 60e3) return send(res, 200, memo.body);
  const url = process.env.ICAL_URL;
  if (!url) return send(res, 500, { error: "ICAL_URL n'est pas configuré sur Vercel." });
  try {
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (MonSuiviICAM)", Accept: "text/calendar,*/*" } });
    if (!r.ok) throw new Error("HyperPlanning a répondu " + r.status);
    const txt = await r.text();
    if (!/BEGIN:VCALENDAR/.test(txt)) throw new Error("La réponse n'est pas un calendrier iCal");
    const events = parseIcs(txt);
    const body = { source: "live", fetchedAt: new Date().toISOString(), events };
    memo = { at: Date.now(), body };
    if (hasStore()) kvSet("suivi:planning", body).catch(() => {});
    return send(res, 200, body);
  } catch (e) {
    // HyperPlanning indisponible : on renvoie la dernière version connue
    if (hasStore()) {
      const last = await kvGet("suivi:planning").catch(() => null);
      if (last) return send(res, 200, { ...last, source: "cache", warning: e.message });
    }
    return send(res, 502, { error: e.message });
  }
}
