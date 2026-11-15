// Progression : scores d'auto-évaluation et plan de révision automatique.
import type { AA, Competence, PlanEvent, ProgressState, RawEvent, Referential, RevisionTask } from "./types.ts";
import { emptyProgress } from "./types.ts";
import { COURSES, PLANMAP, PLANNAME } from "./courses.ts";
import { PROFILE } from "../config/profile.ts";

/* ---------- Auto-évaluation ---------- */
export const critId = (a: Pick<AA, "code">, i: number) => a.code + "#" + i;

export function aaScore(a: AA, s: ProgressState): number {
  if (s.p[a.code]) return 1;
  if (!a.crit.length) return 0;
  let x = 0;
  a.crit.forEach((_, i) => {
    const v = s.c[critId(a, i)] || 0;
    x += v === 2 ? 1 : v === 1 ? 0.5 : 0;
  });
  return x / a.crit.length;
}
export type AAState = "pitch" | "ok" | "wip" | "todo";
export function aaState(a: AA, s: ProgressState): AAState {
  if (s.p[a.code]) return "pitch";
  const x = aaScore(a, s);
  return x >= 0.999 ? "ok" : x > 0 ? "wip" : "todo";
}
export const isReady = (a: AA, s: ProgressState) => {
  const st = aaState(a, s);
  return st === "ok" || st === "pitch";
};
export const compAAs = (c: Competence) => c.ra.flatMap((r) => r.aa).filter((a) => !a.off);
export function compScore(c: Competence, s: ProgressState): number {
  const as = compAAs(c);
  return as.length ? as.reduce((x, a) => x + aaScore(a, s), 0) / as.length : 0;
}
export const courseAA = (ref: Referential, code: string) => ref.aaList.filter((a) => a.courses.includes(code) && !a.off);
export function courseScore(ref: Referential, code: string, s: ProgressState): number {
  const as = courseAA(ref, code);
  return as.length ? as.reduce((x, a) => x + aaScore(a, s), 0) / as.length : 0;
}

/* ---------- Planning enrichi ---------- */
export const EXAM_TYPES = new Set(["Examen", "Soutenance", "Jury"]);
export const NON_COURSE_TYPES = new Set(["Férié", "Vacances"]);

export function mapEvents(events: RawEvent[]): PlanEvent[] {
  return events
    .map((e) => {
      const courses = PLANMAP[e.key] || (e.key ? [e.key] : []);
      const name = PLANNAME[e.key] || COURSES[e.key]?.n || e.name || e.note || e.type;
      return { ...e, start: new Date(e.start), end: new Date(e.end), courses, name, isExam: EXAM_TYPES.has(e.type) };
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

/* ---------- Plan de révision ---------- */
const ORAL_STEPS: [number, string, number][] = [
  [14, "Plan de la présentation, répartition des rôles, liste des livrables", 1],
  [7, "Support finalisé (slides + annexes) : vérifier que chaque critère PITCH a une preuve", 1.5],
  [3, "Répétition chronométrée + questions probables du jury", 1],
  [1, "Dernière répétition, relire les chiffres clés, préparer le matériel", 0.5],
];
const WRITTEN_STEPS: [number, string, number][] = [
  [14, "Relire la fiche, marquer les critères non maîtrisés (onglet Compétences)", 1.5],
  [7, "Exercices type de la fiche en conditions d'examen", 2],
  [3, "Refaire les exercices ratés + réécrire la fiche flash de mémoire", 1.5],
  [1, "Relecture rapide des formules et définitions, préparer le matériel", 0.5],
];

/**
 * Tâches J-14 / J-7 / J-3 / J-1 avant chaque examen, soutenance ou jury.
 * Identifiants stables `t-<idEvenement>-<J>` (identiques à la v1 : ne pas changer, sinon les coches sont perdues).
 */
export function buildTasks(events: PlanEvent[], s: ProgressState, cname: (code: string) => string): RevisionTask[] {
  const T: RevisionTask[] = [];
  const first = new Date(s.planStart || PROFILE.planStartDefault);
  for (const e of events) {
    if (!e.isExam || !e.courses.length) continue;
    const c = e.courses[0]!;
    const nm = cname(c);
    const oral = e.type !== "Examen";
    for (const [j, label, h] of oral ? ORAL_STEPS : WRITTEN_STEPS) {
      const d = new Date(e.start.getTime() - j * 864e5);
      if (d < first) continue;
      T.push({
        id: "t-" + e.id + "-" + j,
        date: d,
        j,
        course: c,
        evId: e.id,
        oral,
        label,
        txt: (oral ? "🎤 " : "📝 ") + nm + " – J-" + j + " : " + label,
        h,
      });
    }
  }
  return T;
}

/* ---------- Validation / fusion de l'état ---------- */
const isRecord = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);

/** Nettoie un état reçu (serveur, sauvegarde importée, localStorage v1) */
export function sanitizeProgress(d: unknown): ProgressState {
  const out = emptyProgress();
  if (!isRecord(d)) return out;
  if (isRecord(d.c)) for (const [k, v] of Object.entries(d.c)) if (v === 1 || v === 2) out.c[k] = v;
  if (isRecord(d.p)) for (const [k, v] of Object.entries(d.p)) if (v) out.p[k] = 1;
  if (isRecord(d.t)) for (const [k, v] of Object.entries(d.t)) if (v) out.t[k] = 1;
  if (isRecord(d.n)) for (const [k, v] of Object.entries(d.n)) if (typeof v === "string") out.n[k] = v;
  out.off = d.off === true;
  if (typeof d.planStart === "string") out.planStart = d.planStart;
  if (typeof d.savedAt === "string") out.savedAt = d.savedAt;
  return out;
}
export const isBackup = (d: unknown) => isRecord(d) && isRecord(d.c);
export const hasProgress = (s: ProgressState) =>
  Object.keys(s.c).length + Object.keys(s.p).length + Object.keys(s.t).length + Object.keys(s.n).length > 0;
