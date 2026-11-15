import "server-only";
import type { PitchRaw } from "../../types.ts";
import { userStore } from "../store.ts";
import snapshot from "../../../data/pitch-snapshot.json";

/**
 * Source de référentiel de compétences. Aujourd'hui : PITCH (ICAM), alimenté par le favori de synchronisation.
 * Pour une autre école, implémenter cette interface (import CSV/Excel du référentiel, API de l'école…).
 */
export interface ReferentialSource {
  id: string;
  label: string;
  load(userId: string): Promise<{ data: PitchRaw; origin: "sync" | "snapshot" }>;
  save?(userId: string, data: PitchRaw): Promise<void>;
}

const SNAPSHOT = snapshot as unknown as PitchRaw;

export const pitchSource: ReferentialSource = {
  id: "pitch",
  label: "PITCH (ICAM)",
  async load(userId) {
    const stored = await userStore(userId).getPitch().catch(() => null);
    if (stored && Array.isArray(stored.competences) && stored.competences.length) return { data: stored, origin: "sync" };
    return { data: SNAPSHOT, origin: "snapshot" };
  },
  async save(userId, data) {
    await userStore(userId).setPitch(data);
  },
};

export const referentialSourceFor = (_userId: string): ReferentialSource => pitchSource;
