// Correspondances manuelles activité d'évaluation → créneaux HyperPlanning, pour les cas ambigus.
// La correspondance automatique (lib/activities.ts) se fait sur le code du cours, le type de créneau et la période.
// Ajouter ici une entrée quand elle se trompe ou ne trouve rien.
//
// Clé : `<codeCours>|<modalité PITCH>` (modalité telle qu'affichée dans la page Compétences, ou "*" pour toutes)
// Valeur : identifiants de créneaux (e<AAAAMMJJ><HHMM UTC>, visibles dans le panneau d'un créneau), ou [] pour « aucun ».

export const ACTIVITY_MAP: Record<string, string[]> = {
  // "I4.7-PROJ.01|Soutenance": ["e202611170830"],
};
