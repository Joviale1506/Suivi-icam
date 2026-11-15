// Lecture d'un calendrier HyperPlanning (.ics) → créneaux normalisés
const pad = (n) => String(n).padStart(2, "0");

// Codes de cours de l'emploi du temps → clés utilisées par le site
export function classify(summary) {
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
  else if (C === "ERD") key = /BILLY|VIVIEN|Experiment|Cosmopolicam/i.test(summary) && !/Projet Pro/i.test(summary) ? "I4.7.ERD.03" : "ERDP";
  if (p[2] && !/TLS-|<TLS/.test(p[2])) name = code + " – " + p[2];
  if (/Férié|Ferie/i.test(summary)) { type = "Férié"; name = summary; }
  if (/Vacances/i.test(summary)) { type = "Vacances"; name = summary; }
  if (/Remédiation/i.test(summary)) { type = "Remédiation"; name = "Remédiation"; }
  if (/^Projets?$/i.test(type) && /Jury/i.test(note)) type = "Jury";
  if (!note && key === "LV") note = "LV1/LV2";
  if (!note && key === "IA") note = "Formation IA";
  if (!note && key === "TOEIC") note = "TOEIC Prep";
  return { type, key, note, name };
}

function toDate(raw, tzid) {
  const m = raw.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  const [, Y, M, D, h, mi, , z] = m;
  if (!h) return { d: new Date(Date.UTC(+Y, +M - 1, +D)), allDay: true };
  let d = new Date(Date.UTC(+Y, +M - 1, +D, +h, +mi));
  if (!z) {
    // Heure locale (Europe/Paris) → UTC, avec changement d'heure (dernier dimanche de mars/octobre)
    const lastSun = (mon) => { const x = new Date(Date.UTC(+Y, mon + 1, 0)); return x.getUTCDate() - x.getUTCDay(); };
    const t = Date.UTC(+Y, +M - 1, +D, +h);
    const summer = t >= Date.UTC(+Y, 2, lastSun(2), 1) && t < Date.UTC(+Y, 9, lastSun(9), 1);
    d = new Date(d.getTime() - (summer ? 2 : 1) * 3600e3);
  }
  return { d, allDay: false };
}

export function parseIcs(txt) {
  const t = txt.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
  const out = [];
  for (const b of t.split("BEGIN:VEVENT").slice(1)) {
    const g = (k) => {
      const m = b.match(new RegExp("\\n" + k + "((?:;[^:\\n]*)?):([^\\n]*)"));
      return m ? { params: m[1], v: m[2].trim() } : null;
    };
    const ds = g("DTSTART"), de = g("DTEND");
    if (!ds) continue;
    const s = toDate(ds.v), e = (de && toDate(de.v)) || s;
    if (!s) continue;
    const unesc = (x) => (x || "").replace(/\\n/gi, " ").replace(/\\([,;\\])/g, "$1");
    const summary = unesc(g("SUMMARY")?.v);
    const location = unesc(g("LOCATION")?.v);
    const c = classify(summary);
    const ymd = (d) => d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate());
    const hm = (d) => pad(d.getUTCHours()) + pad(d.getUTCMinutes());
    out.push({
      id: "e" + ymd(s.d) + (s.allDay ? "0000" : hm(s.d)),
      start: s.d.toISOString(), end: e.d.toISOString(), allDay: s.allDay,
      type: c.type, key: c.key, note: c.note, name: c.name, location,
    });
  }
  out.sort((a, b) => a.start.localeCompare(b.start));
  return out;
}
