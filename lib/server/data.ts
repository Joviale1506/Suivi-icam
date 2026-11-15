import "server-only";
import { cache } from "react";
import type { PitchRaw, PlanningPayload, ProgressState } from "../types.ts";
import { sanitizeProgress } from "../progress.ts";
import { hasStore, storeKind, userStore } from "./store.ts";
import { loadPlanning } from "./sources/calendar.ts";
import { referentialSourceFor } from "./sources/referential.ts";
import { currentUserId } from "./user.ts";
import { authEnabled } from "../auth/session.ts";

export interface AppStatus {
  store: boolean;
  storeKind: "redis" | "file" | "none";
  ical: boolean;
  auth: boolean;
  pitchOrigin: "sync" | "snapshot";
}
export interface AppData {
  userId: string;
  pitch: PitchRaw;
  planning: PlanningPayload;
  /** null = aucune progression enregistrée côté serveur */
  progress: ProgressState | null;
  status: AppStatus;
}

/** Toutes les données d'une page, lues une seule fois par requête */
export const loadAppData = cache(async (): Promise<AppData> => {
  const userId = await currentUserId();
  const [ref, planning, progress] = await Promise.all([
    referentialSourceFor(userId).load(userId),
    loadPlanning(userId),
    userStore(userId)
      .getProgress()
      .catch(() => null),
  ]);
  return {
    userId,
    pitch: ref.data,
    planning,
    progress: progress ? sanitizeProgress(progress) : null,
    status: { store: hasStore(), storeKind: storeKind(), ical: !!process.env.ICAL_URL, auth: authEnabled(), pitchOrigin: ref.origin },
  };
});
