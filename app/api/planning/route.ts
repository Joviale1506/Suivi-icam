// GET  /api/planning → emploi du temps (cache 15 min, tag "planning")
// POST /api/planning → relit HyperPlanning tout de suite et invalide le cache (bouton « Actualiser »)
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { loadPlanning, PLANNING_TAG } from "@/lib/server/sources/calendar";
import { currentUserId } from "@/lib/server/user";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

export async function GET(req: Request) {
  const force = new URL(req.url).searchParams.get("refresh") === "1";
  if (force) revalidateTag(PLANNING_TAG);
  return NextResponse.json(await loadPlanning(await currentUserId(), { force }), { headers: noStore });
}

export async function POST() {
  const body = await loadPlanning(await currentUserId(), { force: true });
  revalidateTag(PLANNING_TAG);
  return NextResponse.json(body, { headers: noStore });
}
