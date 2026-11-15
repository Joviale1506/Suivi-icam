import { NextResponse, type NextRequest } from "next/server";
import { authEnabled, authMisconfigured, SESSION_COOKIE, verifySession } from "@/lib/auth/session";

// Accès libre : connexion, favori PITCH (protégé par son propre en-tête x-app-password) et fichiers statiques.
const PUBLIC = [/^\/login$/, /^\/api\/auth\//, /^\/api\/pitch$/, /^\/pitch-sync\.js$/];

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PUBLIC.some((r) => r.test(pathname))) return NextResponse.next();
  if (authMisconfigured())
    return new NextResponse("APP_PASSWORD n'est pas configuré sur Vercel (Settings → Environment Variables).", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  if (!authEnabled()) return NextResponse.next(); // local sans mot de passe : accès libre

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token && (await verifySession(token))) return NextResponse.next();

  if (pathname.startsWith("/api/"))
    return NextResponse.json({ error: "Connexion requise." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = pathname === "/" ? "" : "?next=" + encodeURIComponent(pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  // Tout sauf les fichiers internes de Next et les fichiers statiques.
  // Liste d'extensions explicite : les codes de cours contiennent des points (/fiches/I4.7.MEO.02 doit rester protégé).
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:ico|png|jpg|jpeg|gif|svg|webp|avif|woff2?|ttf|css|map|txt|webmanifest)$).*)"],
};
