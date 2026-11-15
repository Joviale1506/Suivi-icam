// GET  /api/pitch → dernier référentiel PITCH synchronisé
// POST /api/pitch → envoyé par le favori « Synchroniser PITCH » (exécuté sur pitch-icam.rima1.fr)
// Exclue du middleware : l'accès est vérifié ici (en-tête x-app-password ou session).
import { NextResponse } from "next/server";
import { authEnabled, authMisconfigured, checkPassword, SESSION_COOKIE, verifySession } from "@/lib/auth/session";
import { hasStore, userStore } from "@/lib/server/store";
import { defaultUserId } from "@/lib/server/user";
import { countAA, isPitchPayload } from "@/lib/referential";

export const dynamic = "force-dynamic";

const PITCH_ORIGIN = "https://pitch-icam.rima1.fr";
const CORS = {
  "Access-Control-Allow-Origin": PITCH_ORIGIN,
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, x-app-password",
  "Access-Control-Max-Age": "600",
  Vary: "Origin",
  "Cache-Control": "no-store",
};
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: CORS });

/** Utilisateur autorisé, ou null */
async function authorize(req: Request): Promise<string | null> {
  if (authMisconfigured()) return null;
  if (!authEnabled()) return defaultUserId();
  const pwd = req.headers.get("x-app-password");
  if (pwd && (await checkPassword(pwd))) return defaultUserId();
  const cookie = req.headers.get("cookie") ?? "";
  const token = cookie.split(/;\s*/).find((c) => c.startsWith(SESSION_COOKIE + "="))?.slice(SESSION_COOKIE.length + 1);
  const s = token ? await verifySession(decodeURIComponent(token)) : null;
  return s?.u ?? null;
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: Request) {
  const user = await authorize(req);
  if (!user) return json({ error: "Mot de passe incorrect." }, 401);
  if (!hasStore()) return json({ error: "Stockage non configuré (connecte Upstash Redis dans Vercel → Storage)." }, 501);
  try {
    const p = await userStore(user).getPitch();
    return p ? json(p) : json({ error: "Aucune synchronisation PITCH pour l'instant." }, 404);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
}

export async function POST(req: Request) {
  const user = await authorize(req);
  if (!user) return json({ error: "Mot de passe incorrect." }, 401);
  if (!hasStore()) return json({ error: "Stockage non configuré (connecte Upstash Redis dans Vercel → Storage)." }, 501);
  const d: unknown = await req.json().catch(() => null);
  if (!isPitchPayload(d)) return json({ error: "Données PITCH invalides" }, 400);
  try {
    d.receivedAt = new Date().toISOString();
    delete d.snapshot;
    await userStore(user).setPitch(d);
    return json({ ok: true, competences: d.competences.length, aa: countAA(d) });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
}
