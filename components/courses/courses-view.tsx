"use client";
import Link from "next/link";
import { ArrowLeft, CalendarClock, FileText } from "lucide-react";
import { COURSES, courseGroups, courseHref } from "@/lib/courses";
import { courseAA, courseScore } from "@/lib/progress";
import { fmtDay } from "@/lib/dates";
import { useApp } from "@/components/providers/app-provider";
import { AnimatedNumber, Card, Empty, ProgressRing, SectionTitle, Stagger, StaggerItem, hueStyle } from "@/components/ui/primitives";
import { AABlock } from "@/components/competences/aa-block";
import { EventRow } from "@/components/planning/rows";

export function CoursesIndex() {
  const { ref, progress, events, now } = useApp();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="h1">Par cours</h1>
        <p className="sub">Pour chaque cours : les AA PITCH qu&apos;il permet de valider, les séances restantes et les évaluations.</p>
      </header>
      {courseGroups().map(([g, codes]) => (
        <section key={g}>
          <h2 className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">{g}</h2>
          <Stagger className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {codes.map((k) => {
              const p = courseScore(ref, k, progress);
              const n = courseAA(ref, k).length;
              const nextExam = events.find((e) => e.isExam && e.end > now && e.courses.includes(k));
              return (
                <StaggerItem key={k}>
                  <Link href={courseHref(k, "cours")} className="block h-full">
                    <Card hover className="flex h-full items-center gap-3 p-4 cc-edge" style={hueStyle(k)}>
                      <ProgressRing value={p} size={48} stroke={5} gradientId={`co-${k}`} label={<span className="text-[10px] font-bold">{Math.round(p * 100)}%</span>} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">{COURSES[k]!.n}</div>
                        <div className="code">{k}</div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <span className="chip">{n} AA</span>
                          {nextExam && (
                            <span className="chip-exam">
                              {nextExam.type} · {fmtDay.format(nextExam.start)}
                            </span>
                          )}
                        </div>
                      </div>
                    </Card>
                  </Link>
                </StaggerItem>
              );
            })}
          </Stagger>
        </section>
      ))}
    </div>
  );
}

export function CourseDetail({ code }: { code: string }) {
  const { ref, progress, events, now, setNote } = useApp();
  const c = COURSES[code]!;
  const aas = courseAA(ref, code);
  const evs = events.filter((e) => e.courses.includes(code));
  const up = evs.filter((e) => e.end > now);
  const exams = evs.filter((e) => e.isExam);
  const p = courseScore(ref, code, progress);
  return (
    <div className="space-y-5">
      <Link href="/cours" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Tous les cours
      </Link>
      <Card className="relative overflow-hidden p-5 sm:p-6" style={hueStyle(code)}>
        <div className="cc-solid pointer-events-none absolute -top-20 -right-16 h-48 w-48 rounded-full opacity-20 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="cc-soft inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold">{c.g}</span>
            <h1 className="h1 mt-2">{c.n}</h1>
            <div className="code mt-1">{code}</div>
          </div>
          {(
            <Link href={courseHref(code, "fiches")} className="btn-primary">
              <FileText className="h-4 w-4" /> Ouvrir la fiche
            </Link>
          )}
        </div>
        {c.x && <div className="relative mt-4 rounded-xl border border-warn/30 bg-warn/10 px-3 py-2 text-sm">{c.x}</div>}
        <div className="relative mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="AA liés" value={<AnimatedNumber value={aas.length} />} />
          <Stat label="Séances restantes" value={<AnimatedNumber value={up.filter((e) => !e.isExam).length} />} />
          <Stat label="Évaluations" value={<span className="text-base">{exams.length ? exams.map((e) => fmtDay.format(e.start)).join(", ") : "Pendant l'activité"}</span>} />
          <Stat label="Progression" value={<AnimatedNumber value={Math.round(p * 100)} suffix=" %" />} />
        </div>
      </Card>

      <section>
        <SectionTitle>AA à valider dans ce cours</SectionTitle>
        {aas.length ? (
          <Stagger className="space-y-3">
            {aas.map((a) => (
              <StaggerItem key={a.code}>
                <div className="mb-1 text-xs text-muted">
                  {a.comp} · RA : {ref.ra[a.ra]?.title}
                </div>
                <AABlock aa={a} showCourses={false} />
              </StaggerItem>
            ))}
          </Stagger>
        ) : (
          <Empty>Aucun AA PITCH n&apos;est rattaché directement à ce cours.</Empty>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="card-pad">
          <SectionTitle action={<CalendarClock className="h-4 w-4 text-muted" />}>Séances à venir</SectionTitle>
          {up.length ? (
            <Stagger className="space-y-2">
              {up.map((e) => (
                <StaggerItem key={e.id}>
                  <EventRow e={e} />
                </StaggerItem>
              ))}
            </Stagger>
          ) : (
            <Empty>Aucune séance à venir dans HyperPlanning.</Empty>
          )}
        </Card>
        <Card className="card-pad">
          <SectionTitle>Mes notes</SectionTitle>
          <textarea
            value={progress.n[code] ?? ""}
            onChange={(e) => setNote(code, e.target.value)}
            placeholder="Questions pour le prof, points flous, liens vers le Moodle…"
            className="min-h-44 w-full resize-y rounded-xl border border-line bg-card-strong p-3 text-sm outline-none focus:ring-2 focus:ring-a1/40"
          />
          <p className="mt-1 text-xs text-muted">Enregistré automatiquement.</p>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-0.5 text-2xl font-bold tracking-tight">{value}</div>
    </div>
  );
}
