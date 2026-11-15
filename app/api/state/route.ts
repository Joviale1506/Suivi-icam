// GET/PUT /api/state → progression (critères, AA validés, tâches cochées, notes)
import { NextResponse } from "next/server";
import { hasStore, userStore } from "@/lib/server/store";
import { currentUserId } from "@/lib/server/user";
import { isBackup, sanitizeProgress } from "@/lib/progress";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };
const notConfigured = () =>
  NextResponse.json({ error: "Stockage non configuré (connecte Upstash Redis dans Vercel → Storage)." }, { status: 501, headers: noStore });

export async function GET() {
  if (!hasStore()) return notConfigured();
  try {
    const s = await userStore(await currentUserId()).getProgress();
    return NextResponse.json(s ? sanitizeProgress(s) : {}, { headers: noStore });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500, headers: noStore });
  }
}

async function save(req: Request) {
  if (!hasStore()) return notConfigured();
  const body: unknown = await req.json().catch(() => null);
  if (!isBackup(body)) return NextResponse.json({ error: "Corps invalide" }, { status: 400, headers: noStore });
  try {
    const s = sanitizeProgress(body);
    s.savedAt = new Date().toISOString();
    await userStore(await currentUserId()).setProgress(s);
    return NextResponse.json({ ok: true, savedAt: s.savedAt }, { headers: noStore });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500, headers: noStore });
  }
}
export const PUT = save;
export const POST = save;
