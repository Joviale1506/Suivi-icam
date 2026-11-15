// Catalogue des cours (I4.7 CP_FISE) et correspondances avec les clés de l'emploi du temps.
import type { CourseInfo } from "./types.ts";

export const COURSES: Record<string, CourseInfo> = {
  "I4.7.MEO.02": { n: "Gestion financière", g: "Management & entreprise" },
  "I4.7.MEO.01": { n: "Droit des affaires, des sociétés, du travail", g: "Management & entreprise" },
  "I4.7.MEO.05": { n: "Systémique entreprise", g: "Management & entreprise" },
  "I4.7.ESE.01": { n: "Management environnemental", g: "Environnement" },
  "I4.7.MEO.04": { n: "Supply chain", g: "Production & logistique" },
  "I4.7.MEO.03": { n: "Lean management, 6 Sigma", g: "Production & logistique" },
  "I4.7-PROJ.01": { n: "Projet création d'entreprise (PCE)", g: "Projets" },
  "I4.7.MEO.06": { n: "Stratégie (PCE)", g: "Projets" },
  MKT: { n: "Marketing", g: "Projets", x: "Hors PITCH : sert l'AA marketing du PCE (C07-CPE5).", aa: ["AA-MEO-C07-CPE5-01"] },
  "I4.7.PROJ.02": { n: "Projet Jumeau numérique (Robot Soccer)", g: "Projets" },
  "I4.7.HUM.01": { n: "Histoire des idées politiques", g: "Humanités & langues" },
  "I4.7.HUM.02": { n: "Anglais (+ TOEIC Prep)", g: "Humanités & langues" },
  "I4.7.HUM.04": { n: "LV2 – Portugais", g: "Humanités & langues" },
  IA: { n: "Formation IA", g: "Humanités & langues", x: "Hors PITCH : utile pour l'AA « outils numériques » (C04-CPE1).", aa: ["AA-HUM-C04-CPE1-01"] },
  "I4.ICT.01": { n: "Projet professionnel", g: "Développement personnel" },
  "I4.7.ERD.03": { n: "Relecture d'Experiment", g: "Développement personnel" },
  "I4.8.HUM.04": { n: "Éthique de l'ingénieur", g: "Semestres suivants" },
  "I4.8.HUM.06": { n: "Géopolitique", g: "Semestres suivants" },
  "I4.8.HUM.05": { n: "Écologie", g: "Semestres suivants" },
  "I4.8.HUM.02": { n: "Anglais I4.8", g: "Semestres suivants" },
  "I4.8.HUM.03": { n: "LV2 I4.8", g: "Semestres suivants" },
  "I5.MEO.01": { n: "Pilotage stratégique", g: "Semestres suivants" },
};

export const COURSE_CODES = Object.keys(COURSES);
export const DEFAULT_COURSE = "I4.7.MEO.02";

/** Clés de l'emploi du temps qui couvrent plusieurs cours / un cours au code différent */
export const PLANMAP: Record<string, string[]> = {
  LV: ["I4.7.HUM.02", "I4.7.HUM.04"],
  PORT: ["I4.7.HUM.04"],
  TOEIC: ["I4.7.HUM.02"],
  ERDP: ["I4.ICT.01"],
};
export const PLANNAME: Record<string, string> = {
  LV: "Langues LV1/LV2",
  PORT: "Portugais",
  TOEIC: "TOEIC Prep",
  ERDP: "ERD – Projet pro",
};

export function courseGroups(): [string, string[]][] {
  const groups = new Map<string, string[]>();
  for (const [k, v] of Object.entries(COURSES)) {
    const list = groups.get(v.g) ?? [];
    list.push(k);
    groups.set(v.g, list);
  }
  return [...groups.entries()];
}

/** Code d'URL ↔ code de cours (les codes contiennent des points, pas de caractère spécial) */
export const courseHref = (code: string, base: "cours" | "fiches") => `/${base}/${encodeURIComponent(code)}`;

/* ---------- Couleur stable par cours ---------- */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
/**
 * Teinte HSL (0–360) stable : les cours du catalogue sont répartis à l'angle d'or (couleurs bien distinctes),
 * les autres clés (LV, PORT, ERDP…) reprennent la teinte de leur cours principal, sinon un hachage.
 */
export function courseHue(key: string): number {
  const k = PLANMAP[key]?.[0] ?? key;
  const i = COURSE_CODES.indexOf(k);
  if (i >= 0) return Math.round((i * 137.508 + 265) % 360);
  return hash(k || "autre") % 360;
}
