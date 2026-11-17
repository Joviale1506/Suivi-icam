// Lien Évaluation (activité PITCH) → créneaux HyperPlanning.
import type { Evaluation, PlanEvent } from "./types.ts";
import { ACTIVITY_MAP } from "../config/activity-map.ts";

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Types de créneaux HyperPlanning compatibles avec une modalité d'évaluation PITCH */
export function compatibleTypes(modality?: string): string[] | null {
  const m = fold(modality ?? "");
  if (!m) return null;
  if (/soutenance|oral|jury|pitch|presentation|entretien/.test(m)) return ["Soutenance", "Jury"];
  if (/examen|ecrit|partiel|\bds\b|qcm|test|controle/.test(m)) return ["Examen"];
  if (/projet|rapport|livrable|dossier/.test(m)) return ["Jury", "Soutenance", "Projet"];
  if (/\btp\b|travaux pratiques/.test(m)) return ["TP"];
  if (/\btd\b|travaux diriges/.test(m)) return ["TD"];
  return null;
}

export type MatchConfidence = "manual" | "sure" | "likely";
export interface ActivitySlots {
  slots: PlanEvent[];
  confidence: MatchConfidence | null;
}

/**
 * Créneaux d'une évaluation :
 *  1. correspondance manuelle (config/activity-map.ts) ;
 *  2. même cours + type compatible avec la modalité → « sûr » ;
 *  3. même cours + n'importe quelle évaluation (examen / soutenance / jury) → « probable ».
 */
export function slotsFor(ev: Pick<Evaluation, "course" | "modality">, events: PlanEvent[]): ActivitySlots {
  const manual = ACTIVITY_MAP[`${ev.course}|${ev.modality ?? ""}`] ?? ACTIVITY_MAP[`${ev.course}|*`];
  if (manual) return { slots: events.filter((e) => manual.includes(e.id)), confidence: "manual" };
  const ofCourse = events.filter((e) => e.courses.includes(ev.course));
  const types = compatibleTypes(ev.modality);
  if (types) {
    const sure = ofCourse.filter((e) => types.includes(e.type));
    if (sure.length) return { slots: sure, confidence: "sure" };
  }
  const likely = ofCourse.filter((e) => e.isExam);
  return likely.length ? { slots: likely, confidence: "likely" } : { slots: [], confidence: null };
}

/** Prochain créneau d'évaluation (futur) parmi les évaluations d'un critère */
export function nextSlot(evals: Pick<Evaluation, "course" | "modality">[], events: PlanEvent[], now: Date): PlanEvent | undefined {
  return evals
    .flatMap((ev) => slotsFor(ev, events).slots)
    .filter((e) => e.end > now)
    .sort((a, b) => a.start.getTime() - b.start.getTime())[0];
}

/** Module d'un code (AA-MEO-C07-… → MEO ; I4.7.MEO.02 → MEO ; I4.7-PROJ.01 → PROJ) */
export function moduleOf(code: string): string | null {
  const aa = code.match(/^AA-([A-Z]+)-/);
  if (aa) return aa[1]!;
  const c = code.match(/^[AI]\d(?:\.\d+)?[.-]([A-Z]+)\./);
  return c ? c[1]! : null;
}
