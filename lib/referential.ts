// Référentiel de compétences : format brut PITCH → modèle de l'application.
import type { AA, Competence, CourseInfo, Evaluation, PitchCourseRaw, PitchRaw, RA, Referential } from "./types.ts";
import { COURSES } from "./courses.ts";
import { isOffCourse, MISSING_COMPETENCES, PROFILE } from "../config/profile.ts";

export interface ReferentialOptions {
  isOffCourse: (code: string) => boolean;
  missing: Record<string, { title: string }>;
  catalog: Record<string, CourseInfo>;
  defaultThreshold: number;
}
const DEFAULTS: ReferentialOptions = {
  isOffCourse,
  missing: MISSING_COMPETENCES,
  catalog: COURSES,
  defaultThreshold: PROFILE.defaultThreshold,
};

const cleanCourseTitle = (t: string) => t.replace(/^I\d(\.\d)?\s*[-–]?\s*(HUM|MEO|ESE|PROJ|ICT|ERD)\s*[-–]\s*/i, "");

/* ---------- Statut officiel ---------- */
const plain = (v: unknown) =>
  v == null
    ? ""
    : String(v)
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .trim()
        .toLowerCase();

/**
 * Interprète le statut brut d'une évaluation PITCH.
 * PROVISOIRE : les valeurs exactes de `CourseStatus` ne sont pas encore connues (instantané sans résultats).
 * À confirmer avec le mode diagnostic du favori, puis compléter tests/logic.test.ts.
 * Toute valeur non reconnue donne "evaluated" (affichée telle quelle), jamais un faux « validé ».
 */
export function interpretStatus(rawStatus: unknown, note?: unknown): Evaluation["status"] {
  const s = plain(rawStatus);
  if (!s) return plain(note) ? "evaluated" : "pending";
  if (/^(non|na|nv|ko|false|0|echec|ajourne)\b|non[ -]?(acqui|valid)|insuffisant|^ko$/.test(s)) return "failed";
  if (/^(a|v|ok|true|1)$|acqui|valid|reussi|succes|demontre/.test(s)) return "validated";
  if (/^(aucun|none|null|-|en attente|a venir|planifie|non evalue)/.test(s)) return "pending";
  return "evaluated";
}

function toEvaluation(y: PitchCourseRaw): Evaluation {
  const str = (v: unknown) => (v == null || v === "" ? undefined : String(v));
  return {
    course: y.code,
    courseTitle: y.title ? cleanCourseTitle(y.title) : undefined,
    modality: str(y.eval),
    note: str(y.note),
    comment: str(y.comment),
    rawStatus: str(y.status),
    status: interpretStatus(y.status, y.note),
    period: str(y.period),
    group: str(y.group),
  };
}

/** Une itération validée suffit ; sinon un échec prime sur « évalué » ; sinon non évalué */
export function criterionStatus(evals: Evaluation[]): Evaluation["status"] {
  if (evals.some((e) => e.status === "validated")) return "validated";
  if (evals.some((e) => e.status === "failed")) return "failed";
  if (evals.some((e) => e.status === "evaluated")) return "evaluated";
  return "pending";
}

export function normalizeReferential(d: PitchRaw, options: Partial<ReferentialOptions> = {}): Referential {
  const o = { ...DEFAULTS, ...options };
  const ra: Record<string, RA> = {};
  const aa: Record<string, AA> = {};
  const courseTitles: Record<string, string> = {};
  const present = new Set(d.competences.map((c) => c.code));
  const comps = [...d.competences];
  for (const [code, m] of Object.entries(o.missing)) if (!present.has(code)) comps.push({ code, title: m.title, ra: [] });
  comps.sort((a, b) => a.code.localeCompare(b.code));

  const competences: Competence[] = comps.map((c) => {
    const comp: Competence = {
      code: c.code,
      title: c.title,
      min: c.minPct || o.defaultThreshold,
      progress: c.progress,
      missing: !present.has(c.code),
      ra: [],
    };
    for (const r of c.ra || []) {
      const rr: RA = { code: r.code, title: r.title, comp: c.code, min: r.minPct, progress: r.progress, aa: [] };
      for (const a of r.aa || []) {
        const crit = a.crit || [];
        const courses = [...new Set(crit.flatMap((x) => (x.courses || []).map((y) => y.code)).concat(a.coursesHint || []))];
        crit.forEach((x) =>
          (x.courses || []).forEach((y) => {
            if (y.title) courseTitles[y.code] = cleanCourseTitle(y.title);
          }),
        );
        const item: AA = {
          code: a.code,
          title: a.title,
          sem: (a.periods || []).join("/"),
          periods: a.periods || [],
          off: courses.length > 0 && courses.every(o.isOffCourse),
          courses,
          ra: r.code,
          comp: c.code,
          progress: a.progress,
          nbA: a.nbA,
          nbNA: a.nbNA,
          nbTotal: a.nbTotal,
          crit: crit.map((x) => {
            const evals = (x.courses || []).map(toEvaluation);
            return {
              code: x.code || undefined,
              title: x.title,
              courses: (x.courses || []).map((y) => y.code),
              eval: (x.courses || [])[0]?.eval,
              mandatory: x.mandatory,
              evals,
              status: criterionStatus(evals),
            };
          }),
        };
        rr.aa.push(item);
        aa[item.code] = item;
      }
      comp.ra.push(rr);
      ra[rr.code] = rr;
    }
    return comp;
  });

  // Cours hors PITCH rattachés à la main à un AA (Marketing, Formation IA…)
  for (const [k, v] of Object.entries(o.catalog))
    for (const code of v.aa || []) {
      const a = aa[code];
      if (a && !a.courses.includes(k)) a.courses.push(k);
    }

  return {
    meta: {
      extractedAt: d.extractedAt,
      receivedAt: d.receivedAt,
      snapshot: !!d.snapshot,
      programTitle: d.programTitle,
      program: d.program,
      periods: d.periods || [],
    },
    competences,
    ra,
    aa,
    aaList: Object.values(aa),
    courseTitles,
  };
}

/** Validation minimale d'un envoi du favori PITCH */
export function isPitchPayload(d: unknown): d is PitchRaw {
  if (!d || typeof d !== "object") return false;
  const c = (d as PitchRaw).competences;
  return Array.isArray(c) && c.length > 0 && c.every((x) => x && typeof x.code === "string" && Array.isArray(x.ra ?? []));
}

export const countAA = (d: PitchRaw) => d.competences.reduce((x, c) => x + (c.ra || []).reduce((y, r) => y + (r.aa || []).length, 0), 0);

export function courseName(code: string, ref?: Pick<Referential, "courseTitles">): string {
  return COURSES[code]?.n ?? ref?.courseTitles[code] ?? code;
}
