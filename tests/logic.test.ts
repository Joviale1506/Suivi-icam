// Tests de la logique pure : npm test (node --test, sans dépendance)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { classify, parseIcs } from "../lib/ics.ts";
import { buildTasks, mapEvents, aaScore, compScore } from "../lib/progress.ts";
import { normalizeReferential } from "../lib/referential.ts";
import { dayKey, parisMinutes, weekStart, addMonths } from "../lib/dates.ts";
import { emptyProgress, type PitchRaw, type PlanningPayload } from "../lib/types.ts";

const planning = JSON.parse(readFileSync(new URL("../data/planning-snapshot.json", import.meta.url), "utf8")) as PlanningPayload;
const pitch = JSON.parse(readFileSync(new URL("../data/pitch-snapshot.json", import.meta.url), "utf8")) as PitchRaw;

test("classification des titres HyperPlanning (identique à la v1)", () => {
  assert.deepEqual(classify("Cours - I4.7.MEO.02 - Gestion financière - TLS-CPE"), { type: "Cours", key: "I4.7.MEO.02", note: "", name: "I4.7.MEO.02 – Gestion financière" });
  assert.equal(classify("TD - A4.7.MEO.01 - TLS-CPE").key, "I4.7.MEO.01");
  assert.equal(classify("Projet - I4.7.PROJ.01 - PCE - TLS-CPE - Mid Jury").type, "Jury");
  assert.equal(classify("Projet - I4.7.PROJ.01 - TLS").key, "I4.7-PROJ.01");
  assert.deepEqual(classify("Cours - LV - TLS-CPE"), { type: "Cours", key: "LV", note: "LV1/LV2", name: "LV" });
  assert.equal(classify("Cours - Portugais LV2 - TLS").key, "PORT");
  assert.equal(classify("TD - Anglais - TOEIC prep - TLS").key, "TOEIC");
  assert.equal(classify("Cours - Marketing - TLS").key, "MKT");
  assert.equal(classify("Atelier - X - Formation IA").key, "IA");
  assert.equal(classify("Cours - ERD - BILLY - TLS").key, "I4.7.ERD.03");
  assert.equal(classify("Cours - ERD - Projet Pro Experiment - TLS").key, "ERDP");
  assert.equal(classify("Jour Férié").type, "Férié");
  assert.equal(classify("Remédiation - I4.7.MEO.02").name, "Remédiation");
});

test("heures locales de Paris → UTC, avec changement d'heure", () => {
  const ics = (d: string) => `BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART;TZID=Europe/Paris:${d}\nSUMMARY:Cours - LV - TLS\nEND:VEVENT\nEND:VCALENDAR`;
  assert.equal(parseIcs(ics("20261116T080000"))[0]!.start, "2026-11-16T07:00:00.000Z"); // hiver UTC+1
  assert.equal(parseIcs(ics("20260615T080000"))[0]!.start, "2026-06-15T06:00:00.000Z"); // été UTC+2
  assert.equal(parseIcs(ics("20260329T030000"))[0]!.start, "2026-03-29T01:00:00.000Z"); // jour du passage à l'heure d'été
  assert.equal(parseIcs(ics("20261116T080000Z"))[0]!.start, "2026-11-16T08:00:00.000Z"); // déjà en UTC
  assert.equal(parseIcs(ics("20261116T080000"))[0]!.id, "e202611160700");
});

test("affichage en heure de Paris quel que soit le fuseau", () => {
  const d = new Date("2026-11-16T23:30:00Z"); // 00:30 le 17 à Paris
  assert.equal(dayKey(d), "2026-11-17");
  assert.equal(parisMinutes(d), 30);
  assert.equal(weekStart("2026-11-15"), "2026-11-09");
  assert.equal(addMonths("2026-12-15", 1), "2027-01-01");
});

test("tâches de révision : identifiants stables t-<id>-<J>, textes écrit / oral", () => {
  const events = mapEvents(planning.events);
  const tasks = buildTasks(events, emptyProgress(), (c) => c);
  assert.ok(tasks.length > 0);
  for (const t of tasks) assert.match(t.id, /^t-e\d{12}-(14|7|3|1)$/);
  const exam = events.find((e) => e.type === "Examen" && e.courses.length)!;
  const ids = tasks.filter((t) => t.evId === exam.id).map((t) => t.id);
  for (const id of ids) assert.ok([14, 7, 3, 1].map((j) => `t-${exam.id}-${j}`).includes(id));
  const oral = tasks.find((t) => t.oral);
  if (oral) assert.ok(oral.txt.startsWith("🎤 "));
  const written = tasks.find((t) => !t.oral);
  if (written) assert.ok(written.txt.startsWith("📝 "));
  // Rien avant la date de début du plan
  assert.ok(tasks.every((t) => t.date >= new Date("2026-11-15T00:00:00Z")));
});

test("référentiel : C02/C12 absentes, AA hors parcours, scores", () => {
  const ref = normalizeReferential(pitch);
  const missing = ref.competences.filter((c) => c.missing).map((c) => c.code);
  assert.deepEqual(missing, ["C02", "C12"]);
  assert.ok(ref.aaList.some((a) => a.off), "au moins un AA hors parcours (LV2 débutant / FLE)");
  assert.ok(ref.aa["AA-MEO-C07-CPE5-01"]?.courses.includes("MKT"), "Marketing rattaché à l'AA du PCE");
  const a = ref.aaList.find((x) => !x.off && x.crit.length >= 2)!;
  const s = emptyProgress();
  s.c[a.code + "#0"] = 2;
  s.c[a.code + "#1"] = 1;
  assert.equal(aaScore(a, s), 1.5 / a.crit.length);
  s.p[a.code] = 1;
  assert.equal(aaScore(a, s), 1);
  const comp = ref.competences.find((c) => c.code === a.comp)!;
  assert.ok(compScore(comp, s) > 0);
});
