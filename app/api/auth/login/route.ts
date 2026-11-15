import { NextResponse } from "next/server";
import { authEnabled, checkPassword, SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/auth/session";
import { defaultUserId } from "@/lib/server/user";

export async function POST(req: Request) {
  if (!authEnabled()) return NextResponse.json({ ok: true, open: true });
  const body = (await req.json().catch(() => null)) as { password?: unknown } | null;
  const password = typeof body?.password === "string" ? body.password : "";
  if (!(await checkPassword(password))) {
    await new Promise((r) => setTimeout(r, 400)); // freine les essais en série
    return NextResponse.json({ error: "Mot de passe incorrect." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await signSession(defaultUserId()), sessionCookieOptions);
  return res;
}
