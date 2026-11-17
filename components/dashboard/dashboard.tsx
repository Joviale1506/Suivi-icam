"use client";
import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { PROFILE } from "@/config/profile";
import { addDays, dayKey, daysUntil, fmtDay, fmtDayLong, fmtTime, greeting, keyToNoon } from "@/lib/dates";
import { aaState, allCriteria, compAAs, compOfficial, compState, critState, NON_COURSE_TYPES } from "@/lib/progress";
import { courseHref } from "@/lib/courses";
import { useApp } from "@/components/providers/app-provider";
import { Freshness } from "@/components/shell/shell";
import { Bar, CourseDot, Empty, Pct, Section, StateTag, cx } from "@/components/ui/primitives";
import { EventRow, TaskRow } from "@/components/planning/rows";
import { GradientField } from "@/components/ui/gradient-field";

/* ---------- En-tête : cadre « photo » à gauche, titre serif et boutons empilés à droite ---------- */
function Hero() {
  const { events, now, cname } = useApp();
  const next = events.find((e) => e.isExam && e.end > now);
  const d = next ? daysUntil(next.start, now) : null;
  const started = !!next && next.start <= now;
  const big = !next ? "—" : started ? "En cours" : d === 0 ? "Auj." : d === 1 ? "Demain" : `J-${d}`;
  return (
    <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-12">
      {/* Cadre arrondi, ombre douce, taches floues : la place de la photo du modèle */}
      <div className="relative order-2 aspect-[5/4] overflow-hidden rounded-2xl shadow-soft md:order-1 md:aspect-square md:max-w-[22rem]">
        <GradientField />
        <div className="relative flex h-full flex-col justify-between p-6">
          <p className="text-[11px] font-semibold tracking-[0.12em] uppercase">Prochaine évaluation</p>
          <div>
            <p className="num font-serif text-[72px] leading-[0.9] tracking-[-0.03em] sm:text-[88px]">{big}</p>
            {next && (
              <>
                <p className="mt-3 text-[15px] font-semibold">{next.name}</p>
                <p className="num mt-0.5 text-[13px]">
                  {next.type} · {fmtDay.format(next.start)} · {fmtTime.format(next.start)}
                  {next.location && ` · ${next.location}`}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="order-1 md:order-2">
        <h1 className="font-serif text-[40px] leading-[1.05] tracking-[-0.02em] sm:text-[52px]">
          {greeting(now)},
          <br />
          {PROFILE.displayName}.
        </h1>
        <p className="mt-3 text-[16px] leading-snug sm:text-[17px]">
          <span className="first-letter:uppercase">{fmtDayLong.format(now)}</span>.{" "}
          {next && !started && d != null && d > 1 ? `Ta prochaine évaluation est dans ${d} jours.` : next ? "Une évaluation approche." : "Aucune évaluation planifiée."}
        </p>
        <div className="mt-6 flex max-w-sm flex-col gap-2.5">
          {next?.courses[0] && (
            <Link href={courseHref(next.courses[0], "fiches")} className="btn-stack">
              Fiche {cname(next.courses[0])}
            </Link>
          )}
          <Link href="/planning" className="btn-stack">
            Planning
          </Link>
          <Link href="/competences" className="btn-stack">
            Compétences
          </Link>
        </div>
        <Freshness className="mt-5 lg:hidden" />
      </div>
    </div>
  );
}

/* ---------- Frise des évaluations (6 semaines) ---------- */
function Timeline() {
  const { events, now } = useApp();
  const DAYS = 42;
  const today = dayKey(now);
  const exams = events.filter((e) => e.isExam && e.end > now && daysUntil(e.start, now) < DAYS);
  const weeks = Array.from({ length: DAYS / 7 + 1 }, (_, i) => i * 7);
  return (
    <Section label="Évaluations · 6 semaines" action={<Link href="/planning" className="text-muted hover:text-fg">Planning</Link>}>
      <div className="relative mt-5 mb-2 h-10" aria-hidden>
        <div className="absolute top-3 right-0 left-0 h-px bg-line-strong" />
        {weeks.map((w, i) => (
          <span key={w} className="absolute top-1.5 h-3 w-px bg-line-strong" style={{ left: `${(w / DAYS) * 100}%` }}>
            {/* Extrémités alignées sur les bords : aucune étiquette ne dépasse à 375 px */}
            <span
              className={cx(
                "num absolute top-4 text-[10.5px] whitespace-nowrap text-faint",
                i === 0 ? "left-0" : i === weeks.length - 1 ? "right-0" : "-translate-x-1/2",
              )}
            >
              {w === 0 ? "auj." : fmtDay.format(keyToNoon(addDays(today, w))).replace(/^\S+\s/, "")}
            </span>
          </span>
        ))}
        {exams.map((e) => (
          <span
            key={e.id}
            className="absolute top-[7px] h-[11px] w-[11px] -translate-x-1/2 rounded-full border-2 border-bg bg-accent"
            style={{ left: `${(Math.max(0, daysUntil(e.start, now)) / DAYS) * 100}%` }}
            title={`${e.name} · ${fmtDay.format(e.start)}`}
          />
        ))}
      </div>
      {exams.length ? (
        <div>
          {exams.map((e) => (
            <div key={e.id} className="row">
              <span className="num w-14 shrink-0 text-[13px] text-accent">J-{Math.max(0, daysUntil(e.start, now))}</span>
              <CourseDot code={e.key} />
              <span className="min-w-0 flex-1 truncate text-[13.5px]">{e.name}</span>
              <span className="num hidden text-[12.5px] text-muted sm:inline">{fmtDay.format(e.start)}</span>
              <span className="chip">{e.type}</span>
            </div>
          ))}
        </div>
      ) : (
        <Empty>Aucune évaluation dans les 6 prochaines semaines.</Empty>
      )}
    </Section>
  );
}

/* ---------- Vigilance / points forts (données officielles uniquement) ---------- */
function Insights() {
  const { ref, events, now } = useApp();
  const crits = allCriteria(ref);
  const failed = crits.filter((x) => x.c.status === "failed");
  const evaluated = crits.filter((x) => x.c.status !== "pending");
  const strongAA = ref.aaList.filter((a) => !a.off && aaState(a) === "validated");
  const strongComp = ref.competences.filter((c) => !c.missing && compState(c) === "validated");
  const nextExamFor = (courses: string[]) => events.find((e) => e.isExam && e.end > now && e.courses.some((c) => courses.includes(c)));
  const soon = ref.aaList
    .filter((a) => !a.off && aaState(a) !== "validated")
    .map((a) => ({ a, e: nextExamFor(a.courses) }))
    .filter((x) => x.e && daysUntil(x.e.start, now) <= 14)
    .slice(0, 4);

  return (
    <div className="grid grid-cols-1 gap-x-10 gap-y-8 md:grid-cols-2">
      <Section label={`Vigilance${failed.length ? ` · ${failed.length}` : ""}`}>
        {failed.map(({ a, c, i }) => {
          const ex = nextExamFor(c.courses);
          return (
            <Link key={a.code + i} href={`/competences?c=${a.comp}&aa=${encodeURIComponent(a.code)}&k=${i}`} className="row row-link items-start">
              <StateTag state="failed" short className="mt-1.5" />
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] leading-snug">{c.title}</span>
                <span className="t-code block truncate">
                  {c.code ?? a.code} · {ex ? `prochaine itération ${fmtDay.format(ex.start)}` : "pas de nouvelle évaluation prévue"}
                </span>
              </span>
            </Link>
          );
        })}
        {soon.map(({ a, e }) => (
          <Link key={a.code} href={`/competences?c=${a.comp}&aa=${encodeURIComponent(a.code)}`} className="row row-link items-start">
            <span className="num mt-0.5 w-9 shrink-0 text-[12.5px] text-accent">J-{daysUntil(e!.start, now)}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] leading-snug">{a.title}</span>
              <span className="t-code block truncate">
                {a.code} · évalué {fmtDay.format(e!.start)}
              </span>
            </span>
          </Link>
        ))}
        {!failed.length && !soon.length && (
          <Empty>{evaluated.length ? "Aucun critère évalué non validé." : "Aucune donnée d'évaluation officielle pour l'instant."}</Empty>
        )}
      </Section>
      <Section label={`Points forts${strongAA.length ? ` · ${strongAA.length}` : ""}`}>
        {strongComp.map((c) => (
          <div key={c.code} className="row">
            <span className="t-code w-9 shrink-0 text-fg">{c.code}</span>
            <span className="min-w-0 flex-1 truncate text-[13.5px]">{c.title}</span>
            <Pct value={compOfficial(c)} className="text-[13px] text-ok" />
          </div>
        ))}
        {strongAA.slice(0, 6).map((a) => (
          <div key={a.code} className="row">
            <StateTag state="validated" short />
            <span className="min-w-0 flex-1 truncate text-[13.5px]">{a.title}</span>
            <span className="t-code hidden sm:inline">{a.comp}</span>
          </div>
        ))}
        {!strongAA.length && !strongComp.length && (
          <Empty>{evaluated.length ? "Pas encore d'AA démontré." : "Les AA démontrés apparaîtront ici après une évaluation."}</Empty>
        )}
      </Section>
    </div>
  );
}

/* ---------- Programme du jour ---------- */
function Agenda() {
  const { events, now } = useApp();
  const today = dayKey(now);
  const real = events.filter((e) => !NON_COURSE_TYPES.has(e.type));
  const todays = real.filter((e) => dayKey(e.start) === today && e.end > now);
  const nextEv = real.find((e) => dayKey(e.start) > today);
  const nextDay = nextEv ? dayKey(nextEv.start) : null;
  const list = todays.length ? todays : nextDay ? real.filter((e) => dayKey(e.start) === nextDay) : [];
  const label = todays.length ? "Aujourd'hui" : nextDay === addDays(today, 1) ? "Demain" : nextEv ? fmtDayLong.format(nextEv.start) : "À venir";
  return (
    <Section label={label}>
      {list.length ? list.map((e) => <EventRow key={e.id} e={e} showDate={false} />) : <Empty>Plus de cours prévu.</Empty>}
    </Section>
  );
}

function WeekTasks() {
  const { tasks, progress, now, events } = useApp();
  const examEnd = useMemo(() => new Map(events.map((e) => [e.id, e.end.getTime()])), [events]);
  // Comme la v1 : tâches des 7 prochains jours (et en retard) dont l'évaluation n'est pas passée ; les faites restent visibles en bas.
  const list = tasks
    .filter((t) => {
      const d = daysUntil(t.date, now);
      return d <= 7 && (examEnd.get(t.evId) ?? 0) > now.getTime() && (!progress.t[t.id] || d >= 0);
    })
    .sort((a, b) => Number(!!progress.t[a.id]) - Number(!!progress.t[b.id]) || a.date.getTime() - b.date.getTime())
    .slice(0, 8);
  const open = list.filter((t) => !progress.t[t.id]).length;
  return (
    <Section label={`Révisions · 7 jours${open ? ` · ${open} à faire` : ""}`}>
      {list.length ? list.map((t) => <TaskRow key={t.id} t={t} />) : <Empty>Rien d&apos;urgent.</Empty>}
    </Section>
  );
}

/* ---------- Carte des critères par compétence ---------- */
function CompetenceMap() {
  const { ref } = useApp();
  const comps = ref.competences.filter((c) => !c.missing);
  return (
    <Section
      label="Critères par compétence"
      action={
        <span className="hidden items-center gap-3 sm:flex">
          <StateTag state="validated" />
          <StateTag state="failed" />
          <StateTag state="pending" />
        </span>
      }
    >
      <div className="mt-1">
        {comps.map((c) => {
          const crits = compAAs(c).flatMap((a) => a.crit);
          const p = compOfficial(c);
          return (
            <Link key={c.code} href={`/competences?c=${c.code}`} className="row row-link gap-4">
              <span className="t-code w-9 shrink-0 text-fg">{c.code}</span>
              <span className="flex min-w-0 flex-1 flex-wrap gap-[3px]" aria-label={`${crits.length} critères`}>
                {crits.map((x, i) => (
                  <span key={i} className={cx("h-2.5 w-2.5 rounded-[2px]", `st-${critState(x)}`)} style={{ background: critState(x) === "pending" ? "var(--line-strong)" : "var(--st)" }} />
                ))}
              </span>
              <span className="w-24 shrink-0">
                <Bar value={p} threshold={c.min / 100} state={compState(c)} />
              </span>
              <Pct value={p} className="w-11 shrink-0 text-right text-[12.5px]" />
            </Link>
          );
        })}
      </div>
      <p className="mt-3 text-[12px] text-muted">
        Progression officielle PITCH, seuil {PROFILE.defaultThreshold} % marqué. C02 et C12 n&apos;ont pas de RA dans PITCH pour le CP_FISE.
      </p>
    </Section>
  );
}

export function Dashboard() {
  return (
    <div className="space-y-14">
      <Hero />
      <Timeline />
      <Insights />
      <div className="grid grid-cols-1 gap-x-10 gap-y-12 md:grid-cols-2">
        <Agenda />
        <WeekTasks />
      </div>
      <CompetenceMap />
    </div>
  );
}