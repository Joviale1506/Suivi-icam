// Session signée HMAC-SHA256 (Web Crypto : fonctionne dans le middleware Edge et dans Node).
// Jeton = base64url(JSON {u, exp}) + "." + base64url(signature)

export const SESSION_COOKIE = "suivi_session";
export const SESSION_DAYS = 180;

export interface Session {
  u: string;
  exp: number; // secondes epoch
}

const enc = new TextEncoder();

/** Accès protégé ? (APP_PASSWORD défini) */
export const authEnabled = () => !!process.env.APP_PASSWORD;
/** En production, l'absence d'APP_PASSWORD bloque le site au lieu de l'ouvrir à tous */
export const authMisconfigured = () => !authEnabled() && process.env.NODE_ENV === "production";

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function unb64url(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

let keyPromise: Promise<CryptoKey> | null = null;
let keySource = "";
function key(): Promise<CryptoKey> {
  const secret = process.env.SESSION_SECRET || "derive:suivi-icam:" + (process.env.APP_PASSWORD || "dev");
  if (!keyPromise || keySource !== secret) {
    keySource = secret;
    keyPromise = crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
  }
  return keyPromise;
}

export async function signSession(u: string, days = SESSION_DAYS): Promise<string> {
  const payload = b64url(enc.encode(JSON.stringify({ u, exp: Math.floor(Date.now() / 1000) + days * 86400 } satisfies Session)));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await key(), enc.encode(payload)));
  return payload + "." + b64url(sig);
}

export async function verifySession(token: string): Promise<Session | null> {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await key(), unb64url(sig), enc.encode(payload));
    if (!ok) return null;
    const s = JSON.parse(new TextDecoder().decode(unb64url(payload))) as Session;
    if (typeof s.u !== "string" || typeof s.exp !== "number" || s.exp * 1000 < Date.now()) return null;
    return s;
  } catch {
    return null;
  }
}

/** Comparaison à temps constant du mot de passe (via les empreintes SHA-256) */
export async function checkPassword(given: string): Promise<boolean> {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return false;
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(given)),
    crypto.subtle.digest("SHA-256", enc.encode(expected)),
  ]);
  const x = new Uint8Array(a), y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i]! ^ y[i]!;
  return diff === 0;
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_DAYS * 86400,
};
