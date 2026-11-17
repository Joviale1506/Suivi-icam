"use client";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import type { AA, Criterion } from "@/lib/types";
import { COURSES, courseGroups, courseHref } from "@/lib/courses";
import { aaState, courseAA, courseOfficial, critState } from "@/lib/progress";
import { slotsFor } from "@/lib/activities";
import { fmtDay, fmtTime, daysUntil } from "@/lib/dates";
import { useApp } from "@/components/providers/app-provider";
import { Bar, CourseDot, Empty, PageHeader, Pct, Section, StateTag, hueStyle } from "@/components/ui/primitives";
import { EventRow } from "@/components/planning/rows";

export function CoursesIndex() {
  const { ref, events, now } = useApp();
  return (
    <div>
      <PageHeader title="Cours" sub="Les AA PITCH que chaque cours permet de valider, leur progression officielle et la prochaine évaluation." />
      <div className="space-y-10">
        {courseGroups().map(([g, codes]) => (
          <Section key={g} label={g}>
            {codes.map((k) => {
              const p = courseOfficial(ref, k);
              const n = courseAA(ref, k).length;
              const exam = events.find((e) => e.isExam && e.end > now && e.courses.includes(k));
              return (
                <Link key={k} href={courseHref(k, "cours")} className="row row-link gap-3">
                  <CourseDot code={k} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px]">{COURSES[k]!.n}</span>
                    <span className="t-code block">
                      {k} · {n} AA
                    </span>
                  </span>
                  {exam && (
                    <span className="num hidden shrink-0 text-[12.5px] text-accent sm:inline">
                      {exam.type} · J-{daysUntil(exam.start, now)}
                    </span>
                  )}
                  <span className="hidden w-20 shrink-0 sm:block">
                    <Bar value={p} />
                  </span>
                  <Pct value={p} className="w-11 shrink-0 text-right text-[12.5px]" />
                </Link>
              );
            })}
          </Section>
        ))}
      </div>
    </div>
  );
}

/** Critère du cours avec son activité, sa date, ses itérations restantes et comment le valider */
function CriterionToValidate({ a, c, code }: { a: AA; c: Criterion; code: string }) {
  const { events, now } = useApp();
  const evs = c.evals.filter((e) => e.course === code);
  const slots = evs.flatMap((e) => slotsFor(e, events).slots);
  const upcoming = [...new Map(slots.filter((s) => s.end > now).map((s) => [s.id, s])).values()].sort((x, y) => x.start.getTime() - y.start.getTime());
  const modality = evs.map((e) => e.modality).find(Boolean) ?? c.eval;
  const st = critState(c);
  return (
    <div className="row items-start py-3">
      <StateTag state={st} short className="mt-1.5" />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] leading-snug">{c.title}</p>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[12.5px] text-muted">
          <span>
            Comment : <span className="text-fg">{modality ?? "modalité non précisée"}</span>
          </span>
          {upcoming[0] ? (
            <span className="num">
              Prochaine évaluation : <span className="text-accent">{fmtDay.format(upcoming[0].start)} · {fmtTime.format(upcoming[0].start)}</span>
            </span>
          ) : (
            <span>Pas de date dans l&apos;emploi du temps</span>
          )}
          <span className="num">
            {upcoming.length} itération{upcoming.length > 1 ? "s" : ""} restante{upcoming.length > 1 ? "s" : ""}
          </span>
        </div>
        <p className="t-code mt-1">
          {c.code ? `${c.code} · ` : ""}
          {a.code}
        </p>
      </div>
    </div>
  );
}

export function CourseDetail({ code }: { code: string }) {
  const { ref, progress, events, now, setNote } = useApp();
  const c = COURSES[code]!;
  const aas = courseAA(ref, code);
  const up = events.filter((e) => e.courses.includes(code) && e.end > now);
  const p = courseOfficial(ref, code);
  const toValidate = aas.flatMap((a) => a.crit.filter((x) => x.courses.includes(code) && critState(x) !== "validated").map((x) => ({ a, c: x })));
  const validated = aas.flatMap((a) => a.crit.filter((x) => x.courses.includes(code) && critState(x) === "validated"));
  const nextExam = up.find((e) => e.isExam);

  return (
    <div style={hueStyle(code)}>
      <Link href="/cours" className="btn-ghost -ml-2 mb-4">
        <ArrowLeft className="h-4 w-4" /> Cours
      </Link>
      <PageHeader
        title={c.n}
        sub={
          <span className="flex flex-wrap items-center gap-x-3">
            <span className="t-code">{code}</span>
            <span>{c.g}</span>
          </span>
        }
        action={
          <Link href={courseHref(code, "fiches")} className="btn-accent">
            <FileText className="h-4 w-4" /> Ouvrir la fiche
          </Link>
        }
      />
      {c.x && <p className="-mt-2 mb-6 border-l-2 border-warn pl-3 text-[13px]">{c.x}</p>}

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-line py-5 sm:grid-cols-4">
        <Stat label="Progression officielle" value={<Pct value={p} />} />
        <Stat label="Critères validés" value={<span className="num">{validated.length}/{validated.length + toValidate.length}</span>} />
        <Stat label="Prochaine évaluation" value={nextExam ? <span className="num text-accent">J-{daysUntil(nextExam.start, now)}</span> : <span className="text-faint">—</span>} />
        <Stat label="Séances restantes" value={<span className="num">{up.filter((e) => !e.isExam).length}</span>} />
      </dl>

      <div className="mt-10 space-y-12">
        <Section label={`À valider dans ce cours · ${toValidate.length}`}>
          {toValidate.length ? toValidate.map(({ a, c: x }, i) => <CriterionToValidate key={a.code + i} a={a} c={x} code={code} />) : <Empty>Aucun critère en attente pour ce cours.</Empty>}
        </Section>

        <Section label={`AA liés · ${aas.length}`}>
          {aas.map((a) => (
            <Link key={a.code} href={`/competences?c=${a.comp}&aa=${encodeURIComponent(a.code)}`} className="row row-link">
              <StateTag state={aaState(a)} short />
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] leading-snug">{a.title}</span>
                <span className="t-code block truncate">
                  {a.comp} · {a.code}
                </span>
              </span>
            </Link>
          ))}
          {!aas.length && <Empty>Aucun AA PITCH n&apos;est rattaché directement à ce cours.</Empty>}
        </Section>

        <div className="grid grid-cols-1 gap-x-10 gap-y-12 lg:grid-cols-2">
          <Section label="Séances à venir">
            {up.length ? up.map((e) => <EventRow key={e.id} e={e} />) : <Empty>Aucune séance à venir dans HyperPlanning.</Empty>}
          </Section>
          <Section label="Mes notes">
            <textarea
              value={progress.n[code] ?? ""}
              onChange={(e) => setNote(code, e.target.value)}
              placeholder="Questions pour le prof, points flous, liens vers le Moodle…"
              className="input mt-3 min-h-48 resize-y py-2.5 leading-relaxed"
            />
            <p className="mt-1.5 text-[12px] text-faint">Enregistré automatiquement.</p>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="t-label">{label}</dt>
      <dd className="mt-1 font-serif text-[28px] leading-none">{value}</dd>
    </div>
  );
}
