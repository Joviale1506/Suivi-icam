// Tests de la logique pure : npm test (node --test, sans dépendance)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { classify, parseIcs } from "../lib/ics.ts";
import { aaOfficial, aaState, buildTasks, compOfficial, compState, critId, critState, isFeelingReady, mapEvents } from "../lib/progress.ts";
import { criterionStatus, interpretStatus, normalizeReferential } from "../lib/referential.ts";
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

test("référentiel : C02/C12 absentes, AA hors parcours, Marketing rattaché", () => {
  const ref = normalizeReferential(pitch);
  assert.deepEqual(ref.competences.filter((c) => c.missing).map((c) => c.code), ["C02", "C12"]);
  assert.ok(ref.aaList.some((a) => a.off), "au moins un AA hors parcours (LV2 débutant / FLE)");
  assert.ok(ref.aa["AA-MEO-C07-CPE5-01"]?.courses.includes("MKT"));
});

test("instantané sans résultats : aucune progression officielle (— et non 0 %)", () => {
  const ref = normalizeReferential(pitch);
  for (const a of ref.aaList) {
    assert.equal(aaOfficial(a), null);
    assert.equal(aaState(a), "pending");
  }
  for (const c of ref.competences) assert.equal(compOfficial(c), null);
});

test("statut brut PITCH → statut officiel (prudence : inconnu ≠ validé)", () => {
  assert.equal(interpretStatus("A"), "validated");
  assert.equal(interpretStatus("Acquis"), "validated");
  assert.equal(interpretStatus("Validé"), "validated");
  assert.equal(interpretStatus("NA"), "failed");
  assert.equal(interpretStatus("Non acquis"), "failed");
  assert.equal(interpretStatus(null), "pending");
  assert.equal(interpretStatus("", "12"), "evaluated");
  assert.equal(interpretStatus("Bizarre"), "evaluated");
  const ev = (status: "validated" | "failed" | "evaluated" | "pending") => ({ course: "X", status });
  assert.equal(criterionStatus([ev("failed"), ev("validated")]), "validated", "une itération validée suffit");
  assert.equal(criterionStatus([ev("failed"), ev("pending")]), "failed");
  assert.equal(criterionStatus([]), "pending");
});

test("progression officielle : PITCH prime, l'auto-évaluation n'entre jamais dans le calcul", () => {
  const raw: PitchRaw = {
    program: "CP_FISE",
    competences: [
      {
        code: "C07",
        title: "Stratégie",
        minPct: 70,
        progress: null,
        ra: [
          {
            code: "RA1",
            title: "RA",
            aa: [
              {
                code: "AA1",
                title: "AA évalué",
                progress: null,
                crit: [
                  { code: "CRIT_1", title: "c1", courses: [{ code: "I4.7.MEO.06", eval: "Soutenance", status: "A" }] },
                  { code: "CRIT_2", title: "c2", courses: [{ code: "I4.7.MEO.06", status: "NA" }, { code: "I4.7.MEO.06", status: null }] },
                ],
              },
              { code: "AA2", title: "AA officiel", progress: 100, crit: [{ title: "c", courses: [{ code: "I4.7.MEO.06" }] }] },
            ],
          },
        ],
      },
    ],
  };
  const ref = normalizeReferential(raw);
  const a1 = ref.aa["AA1"]!;
  assert.equal(a1.crit[0]!.code, "CRIT_1");
  assert.equal(a1.crit[0]!.evals[0]!.modality, "Soutenance");
  assert.equal(a1.crit[1]!.evals.length, 2, "deux itérations conservées");
  assert.equal(aaOfficial(a1), 0.5);
  assert.equal(aaState(a1), "failed");
  assert.equal(critState(a1.crit[1]!), "failed");
  assert.equal(aaState(ref.aa["AA2"]!), "validated");
  const comp = ref.competences.find((c) => c.code === "C07")!;
  assert.equal(compOfficial(comp), 0.75);
  assert.equal(compState(comp), "validated");
  // L'auto-évaluation « prête » est stockée à part
  const s = emptyProgress();
  s.c[critId(a1, 1)] = 2;
  assert.ok(isFeelingReady(s, critId(a1, 1)));
  assert.equal(aaOfficial(a1), 0.5, "inchangé par l'auto-évaluation");
});
