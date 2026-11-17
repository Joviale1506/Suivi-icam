// Types partagés client / serveur. Aucune dépendance.

/* ---------- Référentiel brut (format du favori PITCH et de data/pitch-snapshot.json) ---------- */
export interface PitchCourseRaw {
  code: string;
  title?: string;
  eval?: string;
  note?: unknown;
  comment?: string;
  status?: unknown;
  period?: string;
  group?: string;
}
export interface PitchCriterionRaw {
  code?: string;
  title: string;
  mandatory?: boolean;
  courses?: PitchCourseRaw[];
}
export interface PitchAARaw {
  code: string;
  title: string;
  progress?: number | null;
  periods?: string[];
  crit?: PitchCriterionRaw[];
  coursesHint?: string[];
  nbA?: number;
  nbNA?: number;
  nbTotal?: number;
}
export interface PitchRARaw {
  code: string;
  title: string;
  minPct?: number;
  progress?: number | null;
  periods?: string[];
  aa?: PitchAARaw[];
}
export interface PitchCompetenceRaw {
  code: string;
  title: string;
  minPct?: number;
  progress?: number | null;
  ra?: PitchRARaw[];
}
export interface PitchRaw {
  program?: string;
  version?: string;
  programTitle?: string;
  extractedAt?: string;
  receivedAt?: string;
  snapshot?: boolean;
  periods?: string[];
  competences: PitchCompetenceRaw[];
}

/* ---------- Référentiel normalisé ---------- */
/** Statut officiel d'un critère (ou d'une évaluation) */
export type OfficialStatus = "validated" | "failed" | "evaluated" | "pending";
/**
 * Une évaluation d'un critère par une activité (= une itération possible).
 * Les champs viennent tels quels de PITCH (`CourseList` de /api/locdetail).
 */
export interface Evaluation {
  course: string;
  courseTitle?: string;
  /** Modalité (« Examen écrit », « Soutenance »…) */
  modality?: string;
  note?: string;
  comment?: string;
  /** Statut brut PITCH (valeurs à confirmer avec le mode diagnostic du favori) */
  rawStatus?: string;
  status: OfficialStatus;
  period?: string;
  group?: string;
}
export interface Criterion {
  /** Code PITCH (TraitCode), absent de l'instantané du 15/11 */
  code?: string;
  title: string;
  courses: string[];
  eval?: string;
  mandatory?: boolean;
  evals: Evaluation[];
  /** Statut officiel déduit des évaluations */
  status: OfficialStatus;
}
export interface AA {
  code: string;
  title: string;
  sem: string;
  periods: string[];
  /** AA hors parcours (tous ses cours sont hors parcours : LV2 débutant, FLE…) */
  off: boolean;
  courses: string[];
  ra: string;
  comp: string;
  /** Progression officielle PITCH (0–100), null = pas de donnée */
  progress: number | null | undefined;
  /** Compteurs PITCH : critères acquis / non acquis / total */
  nbA?: number;
  nbNA?: number;
  nbTotal?: number;
  crit: Criterion[];
}
export interface RA {
  code: string;
  title: string;
  comp: string;
  min?: number;
  progress?: number | null;
  aa: AA[];
}
export interface Competence {
  code: string;
  title: string;
  /** Seuil de validation (en %) */
  min: number;
  progress: number | null | undefined;
  /** Compétence du référentiel absente de PITCH pour ce programme */
  missing: boolean;
  ra: RA[];
}
export interface Referential {
  meta: { extractedAt?: string; receivedAt?: string; snapshot: boolean; programTitle?: string; program?: string; periods: string[] };
  competences: Competence[];
  ra: Record<string, RA>;
  aa: Record<string, AA>;
  aaList: AA[];
  courseTitles: Record<string, string>;
}

/* ---------- Planning ---------- */
/** Créneau tel que produit par le parseur iCal (sérialisable) */
export interface RawEvent {
  id: string;
  start: string; // ISO UTC
  end: string; // ISO UTC
  allDay: boolean;
  type: string;
  key: string;
  note: string;
  name: string;
  location: string;
}
export type PlanningSourceKind = "live" | "cache" | "snapshot";
export interface PlanningPayload {
  source: PlanningSourceKind;
  fetchedAt: string;
  warning?: string;
  events: RawEvent[];
}
/** Créneau enrichi côté application */
export interface PlanEvent extends Omit<RawEvent, "start" | "end"> {
  start: Date;
  end: Date;
  courses: string[];
  isExam: boolean;
}

/* ---------- Progression ---------- */
export type CritLevel = 1 | 2; // 1 = en cours (50 %), 2 = maîtrisé (100 %) ; absent = pas vu
export interface ProgressState {
  /** Critères : clé `<codeAA>#<index>` */
  c: Record<string, CritLevel>;
  /** AA validés officiellement dans PITCH */
  p: Record<string, 1>;
  /** Tâches de révision cochées : clé `t-<idEvenement>-<J>` */
  t: Record<string, 1>;
  /** Notes par cours */
  n: Record<string, string>;
  /** Afficher les AA hors parcours */
  off: boolean;
  planStart?: string;
  savedAt?: string;
}
export const emptyProgress = (): ProgressState => ({ c: {}, p: {}, t: {}, n: {}, off: false });

export interface RevisionTask {
  id: string;
  date: Date;
  j: number;
  course: string;
  evId: string;
  oral: boolean;
  /** Texte complet, identique à la v1 */
  txt: string;
  /** Consigne seule (sans préfixe) */
  label: string;
  h: number;
}

/* ---------- Catalogue des cours ---------- */
export interface CourseInfo {
  /** Nom affiché */
  n: string;
  /** Groupe */
  g: string;
  /** Explication (cours hors PITCH) */
  x?: string;
  /** AA rattachés manuellement */
  aa?: string[];
}
