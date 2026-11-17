"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { COURSES, courseGroups, courseHref } from "@/lib/courses";
import { courseAA } from "@/lib/progress";
import { fmtDay, daysUntil } from "@/lib/dates";
import { useApp } from "@/components/providers/app-provider";
import { CourseDot, PageHeader, Section, cx } from "@/components/ui/primitives";

function FicheNav({ current }: { current?: string }) {
  return (
    <nav className="space-y-6" aria-label="Fiches">
      {courseGroups().map(([g, codes]) => (
        <div key={g}>
          <div className="t-label mb-1.5">{g}</div>
          {codes.map((k) => (
            <Link
              key={k}
              href={courseHref(k, "fiches")}
              aria-current={k === current ? "page" : undefined}
              className={cx(
                "flex min-h-8 items-center gap-2 rounded-md px-2 text-[13px] transition-colors duration-150",
                k === current ? "bg-hover text-fg" : "text-muted hover:text-fg",
              )}
            >
              <CourseDot code={k} />
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
    <div>
      <PageHeader title="Fiches" sub="Une fiche de révision par cours, construite à partir des critères PITCH." />
      <div className="space-y-10">
        {courseGroups().map(([g, codes]) => (
          <Section key={g} label={g}>
            {codes.map((k) => {
              const exam = events.find((e) => e.isExam && e.end > now && e.courses.includes(k));
              return (
                <Link key={k} href={courseHref(k, "fiches")} className="row row-link">
                  <CourseDot code={k} />
                  <span className="min-w-0 flex-1 truncate text-[14px]">{COURSES[k]!.n}</span>
                  {!available.includes(k) && <span className="chip">à venir</span>}
                  {exam && (
                    <span className="num shrink-0 text-[12.5px] text-accent">
                      {exam.type} · J-{daysUntil(exam.start, now)}
                    </span>
                  )}
                  <span className="t-code hidden w-28 shrink-0 text-right sm:inline">{k}</span>
                </Link>
              );
            })}
          </Section>
        ))}
      </div>
    </div>
  );
}

export function FicheView({ code, html }: { code: string; html: string | null }) {
  const { ref, events, now } = useApp();
  const router = useRouter();
  const aas = courseAA(ref, code);
  const exams = events.filter((e) => e.isExam && e.end > now && e.courses.includes(code));
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[13rem_minmax(0,1fr)]">
      <aside className="hidden lg:block">
        <div className="sticky top-10 max-h-[calc(100dvh-5rem)] overflow-y-auto pr-1">
          <FicheNav current={code} />
        </div>
      </aside>
      <article className="min-w-0">
        <select aria-label="Changer de fiche" value={code} onChange={(e) => router.push(courseHref(e.target.value, "fiches"))} className="input mb-6 lg:hidden">
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
        <PageHeader
          title={COURSES[code]?.n ?? code}
          sub={
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="t-code">{code}</span>
              {exams.map((e) => (
                <span key={e.id} className="num text-accent">
                  {e.type} · {fmtDay.format(e.start)}
                </span>
              ))}
            </span>
          }
        />
        {aas.length > 0 && (
          <div className="mb-8 border-y border-line py-4 text-[13.5px]">
            <p className="t-label mb-2">Ce que PITCH évalue ici</p>
            <ul className="space-y-1">
              {aas.map((a) => (
                <li key={a.code} className="flex gap-2">
                  <span className="t-code w-9 shrink-0">{a.comp}</span>
                  <span>{a.title}</span>
                </li>
              ))}
            </ul>
            <Link href={courseHref(code, "cours")} className="mt-3 inline-flex items-center gap-1 text-[13px] text-accent hover:underline">
              Critères à valider et dates <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
        {html ? <div className="fiche-prose" dangerouslySetInnerHTML={{ __html: html }} /> : <p className="text-muted">Fiche à venir.</p>}
      </article>
    </div>
  );
}
