// Lecture d'un calendrier HyperPlanning (.ics) → créneaux normalisés.
// Portage fidèle de api/_ics.js (v1) : ne pas modifier la classification sans tester
// sur un vrai export HyperPlanning (voir tests/ics.test.ts).
import type { RawEvent } from "./types.ts";

const pad = (n: number) => String(n).padStart(2, "0");

export interface Classification {
  type: string;
  key: string;
  note: string;
  name: string;
}

/** Titres HyperPlanning (« Type - Code - Intitulé - … - TLS-groupe - note ») → clés du site */
export function classify(summary: string): Classification {
  const p = summary.split(" - ").map((x) => x.trim());
  let type = p[0] || "Cours";
  const code = p[1] || "";
  const gi = p.findIndex((x) => /TLS-|<TLS/.test(x));
  let note = gi >= 0 ? p.slice(gi + 1).join(" – ") : "";
  let key = "";
  let name = code;
  const C = code.replace(/\s+/g, "");
  if (/^[AI]\d\.\d\.[A-Z]+\.\d+$/.test(C) || /^I\d\.[A-Z]+\.\d+$/.test(C)) key = C.replace(/^A4\.7\./, "I4.7.");
  if (C === "I4.7.PROJ.01") key = "I4.7-PROJ.01";
  else if (/^LV$/i.test(C)) key = "LV";
  else if (/Portugais/i.test(code)) key = "PORT";
  else if (/TOEIC/i.test(summary)) key = "TOEIC";
  else if (/Marketing/i.test(code)) key = "MKT";
  else if (/Formation IA/i.test(summary)) key = "IA";
  else if (C === "ERD")
    key = /BILLY|VIVIEN|Experiment|Cosmopolicam/i.test(summary) && !/Projet Pro/i.test(summary) ? "I4.7.ERD.03" : "ERDP";
  if (p[2] && !/TLS-|<TLS/.test(p[2])) name = code + " – " + p[2];
  if (/Férié|Ferie/i.test(summary)) {
    type = "Férié";
    name = summary;
  }
  if (/Vacances/i.test(summary)) {
    type = "Vacances";
    name = summary;
  }
  if (/Remédiation/i.test(summary)) {
    type = "Remédiation";
    name = "Remédiation";
  }
  if (/^Projets?$/i.test(type) && /Jury/i.test(note)) type = "Jury";
  if (!note && key === "LV") note = "LV1/LV2";
  if (!note && key === "IA") note = "Formation IA";
  if (!note && key === "TOEIC") note = "TOEIC Prep";
  return { type, key, note, name };
}

/**
 * Date iCal → Date UTC. Les heures sans « Z » sont considérées comme l'heure locale de Paris
 * (HyperPlanning), avec le changement d'heure européen : dernier dimanche de mars / d'octobre, 01:00 UTC.
 */
export function toDate(raw: string): { d: Date; allDay: boolean } | null {
  const m = raw.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  const Y = Number(m[1]), M = Number(m[2]), D = Number(m[3]);
  const h = m[4], mi = m[5], z = m[7];
  if (!h) return { d: new Date(Date.UTC(Y, M - 1, D)), allDay: true };
  let d = new Date(Date.UTC(Y, M - 1, D, Number(h), Number(mi)));
  if (!z) {
    const lastSun = (mon: number) => {
      const x = new Date(Date.UTC(Y, mon + 1, 0));
      return x.getUTCDate() - x.getUTCDay();
    };
    const t = Date.UTC(Y, M - 1, D, Number(h));
    const summer = t >= Date.UTC(Y, 2, lastSun(2), 1) && t < Date.UTC(Y, 9, lastSun(9), 1);
    d = new Date(d.getTime() - (summer ? 2 : 1) * 3600e3);
  }
  return { d, allDay: false };
}

export function parseIcs(txt: string): RawEvent[] {
  const t = txt.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
  const out: RawEvent[] = [];
  for (const b of t.split("BEGIN:VEVENT").slice(1)) {
    const g = (k: string) => {
      const m = b.match(new RegExp("\\n" + k + "((?:;[^:\\n]*)?):([^\\n]*)"));
      return m ? { params: m[1] ?? "", v: (m[2] ?? "").trim() } : null;
    };
    const ds = g("DTSTART"), de = g("DTEND");
    if (!ds) continue;
    const s = toDate(ds.v);
    if (!s) continue;
    const e = (de && toDate(de.v)) || s;
    const unesc = (x: string | undefined) => (x || "").replace(/\\n/gi, " ").replace(/\\([,;\\])/g, "$1");
    const summary = unesc(g("SUMMARY")?.v);
    const location = unesc(g("LOCATION")?.v);
    const c = classify(summary);
    const ymd = (d: Date) => d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate());
    const hm = (d: Date) => pad(d.getUTCHours()) + pad(d.getUTCMinutes());
    out.push({
      id: "e" + ymd(s.d) + (s.allDay ? "0000" : hm(s.d)),
      start: s.d.toISOString(),
      end: e.d.toISOString(),
      allDay: s.allDay,
      type: c.type,
      key: c.key,
      note: c.note,
      name: c.name,
      location,
    });
  }
  out.sort((a, b) => a.start.localeCompare(b.start));
  return out;
}
