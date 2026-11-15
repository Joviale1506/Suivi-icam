"use client";
import Link from "next/link";
import { useMemo } from "react";
import { motion } from "motion/react";
import { ArrowRight, CalendarClock, CheckCircle2, ListTodo, Sparkles, Target } from "lucide-react";
import { PROFILE } from "@/config/profile";
import { addDays, dayKey, daysUntil, fmtDayLong, fmtDateTime, fmtTime, greeting } from "@/lib/dates";
import { compAAs, compScore, courseAA, aaScore, critId, isReady, NON_COURSE_TYPES } from "@/lib/progress";
import { useApp } from "@/components/providers/app-provider";
import { AnimatedNumber, Card, Empty, ProgressRing, SectionTitle, Stagger, StaggerItem, cx, hueStyle } from "@/components/ui/primitives";
import { EventRow, TaskRow } from "@/components/planning/rows";

function Countdown() {
  const { events, now, ref, progress, cname } = useApp();
  const next = events.find((e) => e.isExam && e.end > now);
  if (!next)
    return (
      <Card className="card-pad flex h-full flex-col justify-center">
        <div className="text-sm text-muted">Prochaine évaluation</div>
        <div className="mt-2 text-lg font-semibold">Aucune évaluation planifiée 🎉</div>
      </Card>
    );
  const ms = next.start.getTime() - now.getTime();
  const started = ms <= 0;
  const days = Math.floor(Math.max(0, ms) / 864e5);
  const hours = Math.floor((Math.max(0, ms) % 864e5) / 36e5);
  const aas = next.courses.flatMap((c) => courseAA(ref, c));
  const p = aas.length ? aas.reduce((x, a) => x + aaScore(a, progress), 0) / aas.length : 0;
  return (
    <Card hover className="relative h-full overflow-hidden p-5 sm:p-6">
      <div className="bg-gradient pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full opacity-25 blur-3xl" />
      <div className="relative flex items-center gap-2 text-sm text-muted">
        <CalendarClock className="h-4 w-4 text-exam" /> Prochaine évaluation
      </div>
      <div className="relative mt-3 flex items-end gap-4">
        {started ? (
          <span className="text-gradient text-5xl font-bold tracking-tight">En cours</span>
        ) : (
          <>
            <span className="flex items-baseline gap-1">
              <AnimatedNumber value={days} className="text-gradient text-6xl font-bold tracking-tighter sm:text-7xl" />
              <span className="text-xl font-semibold text-muted">j</span>
            </span>
            <span className="mb-2 flex items-baseline gap-1">
              <AnimatedNumber value={hours} className="text-3xl font-semibold tracking-tight" />
              <span className="text-sm text-muted">h</span>
            </span>
          </>
        )}
      </div>
      <div className="relative mt-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-lg font-semibold leading-tight">{next.name}</span>
          <span className="chip-exam">{next.type}</span>
        </div>
        <div className="mt-1 text-sm text-muted">
          {fmtDateTime(next.start)}
          {next.location && ` · ${next.location}`}
        </div>
        {aas.length > 0 && (
          <div className="mt-4 flex items-center gap-3 text-sm">
            <div className="h-2 flex-1 rounded-full bg-soft">
              <motion.div className="bg-gradient h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${p * 100}%` }} transition={{ duration: 1 }} />
            </div>
            <span className="tabular-nums text-muted">
              {Math.round(p * 100)} % prêt · {cname(next.courses[0]!)}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

function Stats() {
  const { ref, progress, tasks, now } = useApp();
  const inP = ref.aaList.filter((a) => !a.off);
  const ready = inP.filter((a) => isReady(a, progress)).length;
  const allCrit = inP.reduce((x, a) => x + a.crit.length, 0);
  const okCrit = inP.reduce((x, a) => x + a.crit.filter((_, i) => progress.c[critId(a, i)] === 2).length, 0);
  const comps = ref.competences.filter((c) => !c.missing);
  const compsOk = comps.filter((c) => compScore(c, progress) * 100 >= c.min).length;
  const weekTasks = tasks.filter((t) => !progress.t[t.id] && daysUntil(t.date, now) <= 7 && daysUntil(t.date, now) >= 0).length;
  const items = [
    { icon: Target, v: ready, of: inP.length, l: "AA prêts ou validés" },
    { icon: CheckCircle2, v: okCrit, of: allCrit, l: "critères maîtrisés" },
    { icon: Sparkles, v: compsOk, of: comps.length, l: "compétences ≥ seuil" },
    { icon: ListTodo, v: weekTasks, l: "tâches sous 7 jours" },
  ];
  return (
    <Stagger className="grid h-full grid-cols-2 gap-3">
      {items.map((s) => (
        <StaggerItem key={s.l}>
          <Card hover className="h-full p-4">
            <s.icon className="h-4 w-4 text-a1" />
            <div className="mt-2 text-3xl font-bold tracking-tight">
              <AnimatedNumber value={s.v} />
              {s.of != null && <span className="text-base font-medium text-muted">/{s.of}</span>}
            </div>
            <div className="text-xs text-muted">{s.l}</div>
          </Card>
        </StaggerItem>
      ))}
    </Stagger>
  );
}

function Today() {
  const { events, now } = useApp();
  const today = dayKey(now);
  const real = events.filter((e) => !NON_COURSE_TYPES.has(e.type));
  const todays = real.filter((e) => dayKey(e.start) === today && e.end > now);
  const nextDayEvent = real.find((e) => dayKey(e.start) > today);
  const nextDay = nextDayEvent ? dayKey(nextDayEvent.start) : null;
  const upcoming = nextDay ? real.filter((e) => dayKey(e.start) === nextDay) : [];
  const title = todays.length ? "Aujourd'hui" : nextDay === addDays(today, 1) ? "Demain" : nextDay ? fmtDayLong.format(nextDayEvent!.start) : "À venir";
  const list = todays.length ? todays : upcoming;
  return (
    <Card className="card-pad h-full">
      <SectionTitle
        action={
          <Link href="/planning" className="inline-flex items-center gap-1 text-xs font-medium text-a1 hover:underline">
            Planning <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      >
        <span className="first-letter:uppercase">{title}</span>
      </SectionTitle>
      {list.length ? (
        <Stagger className="space-y-2">
          {list.map((e) => (
            <StaggerItem key={e.id}>
              <EventRow e={e} showDate={false} />
            </StaggerItem>
          ))}
        </Stagger>
      ) : (
        <Empty>Plus de cours prévu.</Empty>
      )}
      {todays.length > 0 && nextDayEvent && (
        <p className="mt-3 text-xs text-muted">
          Ensuite : {nextDayEvent.name}, {fmtDayLong.format(nextDayEvent.start)} à {fmtTime.format(nextDayEvent.start)}
        </p>
      )}
    </Card>
  );
}

function WeekTasks() {
  const { tasks, progress, now, events } = useApp();
  const examEnd = useMemo(() => new Map(events.map((e) => [e.id, e.end.getTime()])), [events]);
  // Comme la v1 : tâches des 7 prochains jours (et en retard) dont l'évaluation n'est pas passée.
  // Les tâches faites restent visibles (en bas) tant que leur date n'est pas passée.
  const list = tasks
    .filter((t) => {
      const d = daysUntil(t.date, now);
      return d <= 7 && (examEnd.get(t.evId) ?? 0) > now.getTime() && (!progress.t[t.id] || d >= 0);
    })
    .sort((a, b) => Number(!!progress.t[a.id]) - Number(!!progress.t[b.id]) || a.date.getTime() - b.date.getTime())
    .slice(0, 8);
  const open = list.filter((t) => !progress.t[t.id]).length;
  return (
    <Card className="card-pad h-full">
      <SectionTitle action={<span className="chip-accent">{open} à faire</span>}>Tâches de la semaine</SectionTitle>
      {list.length ? (
        <Stagger className="space-y-2">
          {list.map((t) => (
            <StaggerItem key={t.id}>
              <TaskRow t={t} />
            </StaggerItem>
          ))}
        </Stagger>
      ) : (
        <Empty>Rien d&apos;urgent. Avance sur un AA « à travailler ».</Empty>
      )}
    </Card>
  );
}

function CompetenceRings() {
  const { ref, progress } = useApp();
  const comps = ref.competences.filter((c) => !c.missing);
  return (
    <Card className="card-pad">
      <SectionTitle action={<span className="text-xs text-muted">Seuil PITCH : {PROFILE.defaultThreshold} %</span>}>Progression par compétence</SectionTitle>
      <Stagger className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {comps.map((c) => {
          const p = compScore(c, progress);
          const as = compAAs(c);
          return (
            <StaggerItem key={c.code}>
              <Link href={`/competences?open=${c.code}`} className="group flex flex-col items-center rounded-2xl p-2 transition-colors hover:bg-soft" title={c.title}>
                <ProgressRing
                  value={p}
                  threshold={c.min / 100}
                  gradientId={`ring-${c.code}`}
                  size={76}
                  label={
                    <span className="text-sm font-bold">
                      <AnimatedNumber value={Math.round(p * 100)} suffix="%" />
                    </span>
                  }
                />
                <span className="mt-1.5 text-xs font-semibold">{c.code}</span>
                <span className="text-[11px] text-muted">
                  {as.filter((a) => isReady(a, progress)).length}/{as.length} AA
                </span>
              </Link>
            </StaggerItem>
          );
        })}
      </Stagger>
      <p className="mt-3 text-xs text-muted">C02 et C12 : aucun RA rattaché dans PITCH pour le CP_FISE (voir Compétences).</p>
    </Card>
  );
}

function UpcomingExams() {
  const { events, now } = useApp();
  const exams = events.filter((e) => e.isExam && e.end > now).slice(0, 6);
  return (
    <Card className="card-pad h-full">
      <SectionTitle>Évaluations à venir</SectionTitle>
      {exams.length ? (
        <Stagger className="space-y-2">
          {exams.map((e) => (
            <StaggerItem key={e.id}>
              <EventRow e={e} />
            </StaggerItem>
          ))}
        </Stagger>
      ) : (
        <Empty>Aucune</Empty>
      )}
    </Card>
  );
}

export function Dashboard() {
  const { now, planning } = useApp();
  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm text-muted first-letter:uppercase">{fmtDayLong.format(now)}</p>
        <h1 className="h1 mt-1">
          {greeting(now)} <span className="text-gradient">{PROFILE.displayName}</span> 👋
        </h1>
        {planning.source !== "live" && (
          <p className={cx("sub", planning.source === "snapshot" && "text-warn")}>
            {planning.source === "cache" ? "HyperPlanning injoignable : dernière version connue." : "Planning : instantané du 15/11/2026."}
          </p>
        )}
      </header>
      <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <Countdown />
        <Stats />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Today />
        <WeekTasks />
      </div>
      <CompetenceRings />
      <div className="grid gap-4 lg:grid-cols-2">
        <UpcomingExams />
        <NextCourses />
      </div>
    </div>
  );
}

function NextCourses() {
  const { events, now } = useApp();
  const next = events.filter((e) => e.end > now && !NON_COURSE_TYPES.has(e.type)).slice(0, 7);
  return (
    <Card className="card-pad h-full">
      <SectionTitle>Prochains créneaux</SectionTitle>
      <Stagger className="space-y-2">
        {next.map((e) => (
          <StaggerItem key={e.id} style={hueStyle(e.key)}>
            <EventRow e={e} />
          </StaggerItem>
        ))}
      </Stagger>
    </Card>
  );
}
