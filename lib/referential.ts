// Référentiel de compétences : format brut PITCH → modèle de l'application.
import type { AA, Competence, PitchRaw, RA, Referential, CourseInfo } from "./types.ts";
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
      const rr: RA = { code: r.code, title: r.title, comp: c.code, aa: [] };
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
          off: courses.length > 0 && courses.every(o.isOffCourse),
          courses,
          ra: r.code,
          comp: c.code,
          progress: a.progress,
          crit: crit.map((x) => ({
            title: x.title,
            courses: (x.courses || []).map((y) => y.code),
            eval: (x.courses || [])[0]?.eval,
            mandatory: x.mandatory,
          })),
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
    meta: { extractedAt: d.receivedAt || d.extractedAt, snapshot: !!d.snapshot, programTitle: d.programTitle, program: d.program },
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
