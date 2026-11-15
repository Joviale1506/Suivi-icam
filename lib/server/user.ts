import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "../auth/session.ts";

/** Utilisateur par défaut (aujourd'hui le seul) */
export const defaultUserId = () => (process.env.APP_USER_ID || "jo").trim() || "jo";

/**
 * Utilisateur de la requête en cours. Aujourd'hui : celui de la session, sinon l'utilisateur par défaut.
 * En multi-étudiants, ce sera l'identifiant fourni par le fournisseur d'authentification.
 */
export async function currentUserId(): Promise<string> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const s = token ? await verifySession(token) : null;
  return s?.u || defaultUserId();
}
