// Configuration propre à l'utilisatrice actuelle (Jo, CP_FISE, ICAM Toulouse).
// Dans la version multi-étudiants, ces réglages viendront du profil de chaque étudiant (voir docs/ROADMAP.md).

export const PROFILE = {
  /** Prénom affiché dans la salutation */
  displayName: "Jo",
  /** Programme PITCH */
  program: "CP_FISE",
  /** Seuil de validation par défaut d'une compétence (%) */
  defaultThreshold: 70,
  /** Les tâches de révision antérieures à cette date ne sont pas générées (sauf `planStart` dans la progression) */
  planStartDefault: "2026-11-15T00:00:00Z",
} as const;

/** Cours hors du parcours langues de Jo (LV2 débutant, FLE) */
export const isOffCourse = (code: string) => /LV2_/.test(code) || code === "I4.7.HUM.06" || code === "I4.8.HUM.07";

/**
 * Compétences du référentiel ICAM sans aucun RA rattaché dans PITCH pour le CP_FISE.
 * Elles sont affichées grisées, avec une explication.
 */
export const MISSING_COMPETENCES: Record<string, { title: string; hint: string }> = {
  C02: {
    title:
      "Organiser ses connaissances théoriques et expérimentales afin d'identifier et relier les différentes composantes des projets et interagir efficacement avec chacun des acteurs.",
    hint: "Demande à ton responsable de promo si elle est évaluée hors PITCH.",
  },
  C12: {
    title:
      "Exercer son métier d'ingénieur, en anglais comme en français, en situation interculturelle, par sa connaissance des systèmes culturels et par ses expériences vécues.",
    hint: "Elle se travaille en pratique via l'Experiment, les langues et la mobilité internationale. Demande à ton responsable de promo si elle est évaluée ailleurs (stage, mobilité).",
  },
};
