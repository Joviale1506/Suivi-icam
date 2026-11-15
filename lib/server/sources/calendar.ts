import "server-only";
import { after } from "next/server";
import { parseIcs } from "../../ics.ts";
import type { PlanningPayload, RawEvent } from "../../types.ts";
import { userStore } from "../store.ts";
import snapshot from "../../../data/planning-snapshot.json";

/**
 * Source d'emploi du temps. Aujourd'hui : un lien iCal HyperPlanning.
 * Pour une autre école / un autre format (Google Agenda, Moodle, CSV…), implémenter cette interface.
 */
export interface CalendarSource {
  id: string;
  label: string;
  /** Lit les créneaux. `force` contourne le cache. Renvoie aussi la date réelle de lecture. */
  fetchEvents(opts?: { force?: boolean }): Promise<{ events: RawEvent[]; fetchedAt: string }>;
}

export const PLANNING_TAG = "planning";
export const PLANNING_TTL = 15 * 60;

/** Lien iCal (HyperPlanning). L'URL contient une clé personnelle : elle ne quitte jamais le serveur. */
export class IcalSource implements CalendarSource {
  id = "ical";
  label = "HyperPlanning (iCal)";
  constructor(private readonly url: string) {}

  async fetchEvents(opts: { force?: boolean } = {}) {
    const init: RequestInit & { next?: { revalidate: number; tags: string[] } } = {
      headers: { "User-Agent": "Mozilla/5.0 (MonSuiviICAM)", Accept: "text/calendar,*/*" },
      signal: AbortSignal.timeout(15000),
      ...(opts.force ? { cache: "no-store" as const } : { next: { revalidate: PLANNING_TTL, tags: [PLANNING_TAG] } }),
    };
    const r = await fetch(this.url, init);
    if (!r.ok) throw new Error("HyperPlanning a répondu " + r.status);
    const txt = await r.text();
    if (!/BEGIN:VCALENDAR/.test(txt)) throw new Error("La réponse n'est pas un calendrier iCal");
    // La réponse peut sortir du cache de Next : l'en-tête Date indique quand HyperPlanning a réellement été lu.
    const date = r.headers.get("date");
    const fetchedAt = date && !Number.isNaN(Date.parse(date)) ? new Date(date).toISOString() : new Date().toISOString();
    return { events: parseIcs(txt), fetchedAt };
  }
}

/** Source configurée pour un utilisateur (aujourd'hui : variable ICAL_URL) */
export function calendarSourceFor(_userId: string): CalendarSource | null {
  const url = process.env.ICAL_URL;
  return url ? new IcalSource(url) : null;
}

const SNAPSHOT = snapshot as PlanningPayload;

/** Planning à jour : source en direct → dernière version stockée → instantané du dépôt */
export async function loadPlanning(userId: string, opts: { force?: boolean } = {}): Promise<PlanningPayload> {
  const store = userStore(userId);
  const src = calendarSourceFor(userId);
  let warning = "ICAL_URL n'est pas configuré.";
  if (src) {
    try {
      const { events, fetchedAt } = await src.fetchEvents(opts);
      const body: PlanningPayload = { source: "live", fetchedAt, events };
      // Après la réponse : n'écrit dans Redis que si l'emploi du temps a changé
      after(async () => {
        try {
          const last = await store.getPlanning();
          if (!last || JSON.stringify(last.events) !== JSON.stringify(events)) await store.setPlanning(body);
        } catch {
          /* le stockage est un simple repli */
        }
      });
      return body;
    } catch (e) {
      warning = e instanceof Error ? e.message : String(e);
    }
  }
  const last = await store.getPlanning().catch(() => null);
  if (last?.events?.length) return { ...last, source: "cache", warning };
  return { ...SNAPSHOT, source: "snapshot", warning: src ? warning : undefined };
}
