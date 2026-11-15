"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, FileText } from "lucide-react";
import { COURSES, courseGroups, courseHref } from "@/lib/courses";
import { courseAA } from "@/lib/progress";
import { fmtDay } from "@/lib/dates";
import { useApp } from "@/components/providers/app-provider";
import { Card, CourseDot, Stagger, StaggerItem, cx, hueStyle } from "@/components/ui/primitives";

function FicheNav({ current }: { current?: string }) {
  return (
    <nav className="space-y-4">
      {courseGroups().map(([g, codes]) => (
        <div key={g}>
          <div className="mb-1 px-2 text-[11px] font-semibold tracking-wider text-muted uppercase">{g}</div>
          {codes.map((k) => (
            <Link
              key={k}
              href={courseHref(k, "fiches")}
              className={cx(
                "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                k === current ? "bg-soft font-semibold text-fg ring-1 ring-line" : "text-muted hover:bg-soft/60 hover:text-fg",
              )}
            >
              <CourseDot code={k} className="h-2 w-2" />
              <span className="truncate">{COURSES[k]!.n}</span>
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}

export function FichesIndex({ available }: { available: string[] }) {
  const { events, now } = useApp();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="h1">Fiches de révision</h1>
        <p className="sub">Construites à partir des critères PITCH de chaque cours. À compléter avec tes supports de cours.</p>
      </header>
      {courseGroups().map(([g, codes]) => (
        <section key={g}>
          <h2 className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">{g}</h2>
          <Stagger className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {codes.map((k) => {
              const exam = events.find((e) => e.isExam && e.end > now && e.courses.includes(k));
              return (
                <StaggerItem key={k}>
                  <Link href={courseHref(k, "fiches")} className="block h-full">
                    <Card hover className="flex h-full items-start gap-3 p-4" style={hueStyle(k)}>
                      <span className="cc-soft grid h-10 w-10 shrink-0 place-items-center rounded-xl border">
                        <FileText className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold leading-snug">{COURSES[k]!.n}</div>
                        <div className="code">{k}</div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {!available.includes(k) && <span className="chip">à venir</span>}
                          {exam && (
                            <span className="chip-exam">
                              {exam.type} · {fmtDay.format(exam.start)}
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

export function FicheView({ code, html }: { code: string; html: string | null }) {
  const { ref, events, now } = useApp();
  const router = useRouter();
  const aas = courseAA(ref, code);
  const exams = events.filter((e) => e.isExam && e.end > now && e.courses.includes(code));
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="hidden lg:block">
        <div className="sticky top-8 max-h-[calc(100dvh-4rem)] overflow-y-auto pr-1">
          <FicheNav current={code} />
        </div>
      </aside>
      <div className="min-w-0 space-y-4">
        <select
          aria-label="Changer de fiche"
          value={code}
          onChange={(e) => router.push(courseHref(e.target.value, "fiches"))}
          className="w-full rounded-xl border border-line bg-card-strong px-3 py-2.5 text-sm lg:hidden"
        >
          {courseGroups().map(([g, codes]) => (
            <optgroup key={g} label={g}>
              {codes.map((k) => (
                <option key={k} value={k}>
                  {COURSES[k]!.n}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <Card className="overflow-hidden" style={hueStyle(code)}>
          <div className="cc-soft border-b px-5 py-5 sm:px-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{COURSES[code]?.n ?? code}</h1>
                <div className="code mt-0.5 !text-current opacity-70">{code}</div>
              </div>
              <div className="flex flex-wrap gap-1">
                {exams.map((e) => (
                  <span key={e.id} className="chip-exam">
                    {e.type} · {fmtDay.format(e.start)}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="px-5 py-5 sm:px-7 sm:py-6">
            {aas.length > 0 && (
              <div className="mb-5 rounded-xl border border-a1/25 bg-a1/5 px-4 py-3 text-sm">
                <b>Ce que PITCH évalue ici :</b> {aas.map((a) => `${a.title} (${a.comp})`).join(" ; ")}.{" "}
                <Link href={courseHref(code, "cours")} className="inline-flex items-center gap-0.5 font-medium text-a1 hover:underline">
                  S&apos;auto-évaluer <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
            {html ? <article className="fiche-prose" dangerouslySetInnerHTML={{ __html: html }} /> : <p className="text-muted">Fiche à venir.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
