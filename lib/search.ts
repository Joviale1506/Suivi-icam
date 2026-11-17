// Recherche globale (⌘K) : index plat, insensible aux accents et à la casse.
import type { Referential } from "./types.ts";
import { COURSES, courseHref } from "./courses.ts";

export const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export interface SearchItem {
  kind: "page" | "competence" | "aa" | "critere" | "cours" | "fiche";
  code?: string;
  title: string;
  hint?: string;
  href: string;
  /** Texte replié utilisé pour la correspondance */
  hay: string;
}

const PAGES: [string, string][] = [
  ["Tableau de bord", "/"],
  ["Compétences", "/competences"],
  ["Cours", "/cours"],
  ["Planning", "/planning"],
  ["Fiches", "/fiches"],
  ["Synchro", "/synchro"],
];

export function buildIndex(ref: Referential): SearchItem[] {
  const out: SearchItem[] = [];
  const add = (x: Omit<SearchItem, "hay">) => out.push({ ...x, hay: fold([x.code, x.title, x.hint].filter(Boolean).join(" ")) });
  for (const [t, h] of PAGES) add({ kind: "page", title: t, href: h });
  for (const c of ref.competences)
    add({ kind: "competence", code: c.code, title: c.title, href: `/competences?c=${encodeURIComponent(c.code)}` });
  for (const a of ref.aaList) {
    const base = `/competences?c=${encodeURIComponent(a.comp)}&aa=${encodeURIComponent(a.code)}`;
    add({ kind: "aa", code: a.code, title: a.title, hint: a.comp, href: base });
    a.crit.forEach((c, i) => add({ kind: "critere", code: c.code, title: c.title, hint: a.code, href: `${base}&k=${i}` }));
  }
  for (const [k, v] of Object.entries(COURSES)) {
    add({ kind: "cours", code: k, title: v.n, hint: v.g, href: courseHref(k, "cours") });
    add({ kind: "fiche", code: k, title: "Fiche · " + v.n, href: courseHref(k, "fiches") });
  }
  return out;
}

/** Tous les mots de la requête doivent apparaître ; le code exact ou en préfixe remonte en tête */
export function search(index: SearchItem[], q: string, limit = 30): SearchItem[] {
  const words = fold(q).split(/\s+/).filter(Boolean);
  if (!words.length) return index.filter((x) => x.kind === "page");
  const scored: [number, SearchItem][] = [];
  for (const it of index) {
    if (!words.every((w) => it.hay.includes(w))) continue;
    const code = it.code ? fold(it.code) : "";
    const q0 = fold(q.trim());
    let s = 0;
    if (code === q0) s += 100;
    else if (code.startsWith(q0)) s += 50;
    if (fold(it.title).startsWith(words[0]!)) s += 10;
    s -= { page: 0, competence: 1, cours: 2, aa: 3, fiche: 4, critere: 5 }[it.kind];
    scored.push([s, it]);
  }
  return scored
    .sort((a, b) => b[0] - a[0])
    .slice(0, limit)
    .map((x) => x[1]);
}
