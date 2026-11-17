// Progression : scores d'auto-évaluation et plan de révision automatique.
import type { AA, Competence, Criterion, PlanEvent, ProgressState, RawEvent, Referential, RevisionTask } from "./types.ts";
import { emptyProgress } from "./types.ts";
import { COURSES, PLANMAP, PLANNAME } from "./courses.ts";
import { PROFILE } from "../config/profile.ts";

/* ---------- Progression OFFICIELLE (PITCH) ----------
 * Seules les données PITCH comptent dans les pourcentages et les statuts.
 * null = « pas de donnée officielle » (affiché « — », jamais 0 %). */
export const critId = (a: Pick<AA, "code">, i: number) => a.code + "#" + i;

/** État affiché : validé / en cours / à rattraper / non évalué */
export type State = "validated" | "progress" | "failed" | "pending";
export const STATE_LABEL: Record<State, string> = {
  validated: "Validé",
  progress: "En cours",
  failed: "À rattraper",
  pending: "Non évalué",
};

export function critState(c: Criterion): State {
  return c.status === "validated" ? "validated" : c.status === "failed" ? "failed" : c.status === "evaluated" ? "progress" : "pending";
}

/** Progression officielle d'un AA (0–1), ou null */
export function aaOfficial(a: AA): number | null {
  if (a.progress != null) return Math.max(0, Math.min(1, a.progress / 100));
  if (a.nbTotal) return (a.nbA ?? 0) / a.nbTotal;
  const evaluated = a.crit.filter((c) => c.status !== "pending");
  if (!evaluated.length) return null;
  return a.crit.filter((c) => c.status === "validated").length / (a.crit.length || 1);
}
export function aaState(a: AA): State {
  const p = aaOfficial(a);
  if (p == null) return "pending";
  if (p >= 0.999) return "validated";
  if (a.crit.some((c) => c.status === "failed")) return "failed";
  return p > 0 || a.crit.some((c) => c.status !== "pending") ? "progress" : "pending";
}
export const isDemonstrated = (a: AA) => aaState(a) === "validated";

export const compAAs = (c: Competence) => c.ra.flatMap((r) => r.aa).filter((a) => !a.off);
/** Progression officielle d'une compétence (0–1), ou null */
export function compOfficial(c: Competence): number | null {
  if (c.progress != null) return Math.max(0, Math.min(1, c.progress / 100));
  const vals = compAAs(c).map(aaOfficial);
  if (vals.every((v) => v == null)) return null;
  return vals.reduce<number>((x, v) => x + (v ?? 0), 0) / (vals.length || 1);
}
export function compState(c: Competence): State {
  const p = compOfficial(c);
  if (p == null) return "pending";
  if (p * 100 >= c.min) return "validated";
  if (compAAs(c).some((a) => aaState(a) === "failed")) return "failed";
  return "progress";
}

export const courseAA = (ref: Referential, code: string) => ref.aaList.filter((a) => a.courses.includes(code) && !a.off);
export function courseOfficial(ref: Referential, code: string): number | null {
  const vals = courseAA(ref, code).map(aaOfficial);
  if (!vals.length || vals.every((v) => v == null)) return null;
  return vals.reduce<number>((x, v) => x + (v ?? 0), 0) / vals.length;
}

/** Tous les critères (hors AA hors parcours) avec leur contexte */
export function allCriteria(ref: Referential) {
  return ref.aaList.filter((a) => !a.off).flatMap((a) => a.crit.map((c, i) => ({ a, c, i, id: critId(a, i) })));
}

/* ---------- Auto-évaluation secondaire : « je me sens prête » ----------
 * Stockée dans progress.c (valeur 2), jamais mélangée aux pourcentages officiels.
 * Les anciennes valeurs 1 (« En cours ») restent stockées mais ne sont plus affichées. */
export const isFeelingReady = (s: ProgressState, id: string) => s.c[id] === 2;

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
