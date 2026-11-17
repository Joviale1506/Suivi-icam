"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, List } from "lucide-react";
import type { PlanEvent } from "@/lib/types";
import { addDays, addMonths, dayKey, daysUntil, fmtDay, fmtMonth, keyToNoon, monthStart, weekStart } from "@/lib/dates";
import { useApp } from "@/components/providers/app-provider";
import { Segmented, cx } from "@/components/ui/primitives";
import { RefreshButton, planningSourceLabel } from "@/components/sync/sync-view";
import { applyFilter, groupByDay, type CalFilter, type CalView } from "./shared";
import { MonthView } from "./month-view";
import { WeekView } from "./week-view";
import { ListView } from "./list-view";
import { EventSheet } from "./event-sheet";

const VIEW_KEY = "suivi-icam:calendar-view";
const LIST_DAYS = 28;

export function CalendarView() {
  const { events, tasks, progress, now, planning } = useApp();
  const today = dayKey(now);
  const [view, setViewState] = useState<CalView>("month");
  const [cursor, setCursor] = useState(today);
  const [filter, setFilter] = useState<CalFilter>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  // Vue mémorisée (lue après le montage : pas d'écart d'hydratation)
  useEffect(() => {
    try {
      const v = localStorage.getItem(VIEW_KEY);
      if (v === "month" || v === "week" || v === "list") setViewState(v);
    } catch {
      /* ignore */
    }
  }, []);
  const setView = (v: CalView) => {
    setViewState(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* ignore */
    }
  };

  const filtered = useMemo(() => applyFilter(events, tasks, filter, progress), [events, tasks, filter, progress]);

  const days = useMemo(() => {
    if (view !== "list") return groupByDay(filtered.events, filtered.tasks);
    // Liste : 4 semaines à partir de la semaine du curseur. Comme la v1, les tâches en retard non faites
    // dont l'évaluation n'est pas passée sont ramenées à aujourd'hui.
    const from = weekStart(cursor);
    const to = addDays(from, LIST_DAYS);
    const end = new Map(events.map((e) => [e.id, e.end.getTime()]));
    const inRange = (k: string) => k >= from && k < to;
    const evs = filtered.events.filter((e) => inRange(dayKey(e.start)));
    const ts = filtered.tasks.filter((t) => (end.get(t.evId) ?? 0) > now.getTime());
    const taskDay = (t: (typeof ts)[number]) => (daysUntil(t.date, now) < 0 ? today : dayKey(t.date));
    return groupByDay(
      evs,
      ts.filter((t) => inRange(taskDay(t))),
      taskDay,
    );
  }, [view, filtered, cursor, events, now, today]);

  const move = (dir: -1 | 1) => {
    if (view === "month") setCursor((c) => addMonths(monthStart(c), dir));
    else if (view === "week") setCursor((c) => addDays(weekStart(c), 7 * dir)); // lundi : 1re colonne affichée sur mobile
    else setCursor((c) => addDays(weekStart(c), LIST_DAYS * dir));
  };

  const title = useMemo(() => {
    if (view === "month") return fmtMonth.format(keyToNoon(monthStart(cursor)));
    const s = weekStart(cursor);
    const e = addDays(s, view === "week" ? 6 : LIST_DAYS - 1);
    return `${fmtDay.format(keyToNoon(s))} – ${fmtDay.format(keyToNoon(e))}`;
  }, [view, cursor]);

  // Le curseur est aussi le jour sélectionné (détail sous la grille du mois, colonne affichée sur mobile en semaine)
  const selectedDay = cursor;
  const openEvent = openId ? (events.find((e) => e.id === openId) ?? null) : null;
  const onOpen = useCallback((e: PlanEvent) => setOpenId(e.id), []);
  const close = useCallback(() => setOpenId(null), []);
  const done = tasks.filter((t) => progress.t[t.id]).length;

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pb-6">
        <div className="min-w-0">
          <h1 className="t-page">Planning</h1>
          <p className="mt-1.5 text-[13px] text-muted">
            Heure de Paris · révisions J-14, J-7, J-3, J-1 recalculées à chaque changement d&apos;examen ·{" "}
            <span className="num">
              {done}/{tasks.length}
            </span>{" "}
            faites
          </p>
        </div>
        <Segmented
          id="cal-view"
          value={view}
          onChange={setView}
          options={[
            { value: "month", label: "Mois", icon: <CalendarDays className="h-3.5 w-3.5" /> },
            { value: "week", label: "Semaine", icon: <CalendarRange className="h-3.5 w-3.5" /> },
            { value: "list", label: "Liste", icon: <List className="h-3.5 w-3.5" /> },
          ]}
        />
      </header>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-y border-line py-3">
        <div className="flex items-center gap-1">
          <button className="btn w-9 p-0" onClick={() => move(-1)} aria-label="Précédent">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button className="btn w-9 p-0" onClick={() => move(1)} aria-label="Suivant">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button className="btn" onClick={() => setCursor(today)}>
            Aujourd&apos;hui
          </button>
        </div>
        <h2 className="t-title min-w-0 flex-1 first-letter:uppercase">{title}</h2>
        <Segmented
          id="cal-filter"
          size="sm"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "Tout" },
            { value: "exam", label: "Évaluations" },
            { value: "todo", label: "Tâches à faire" },
          ]}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 py-3 text-[12px]">
        <span className={cx("inline-flex min-w-0 items-center gap-1.5", planning.source === "live" ? "text-muted" : "text-warn")}>
          <span className={cx("st-dot", planning.source === "live" ? "st-validated" : "st-failed")} />
          <span className="truncate">{planningSourceLabel(planning.source, planning.fetchedAt)}</span>
        </span>
        <RefreshButton />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={view} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          {view === "month" && <MonthView cursor={cursor} today={today} days={days} selected={selectedDay} onSelectDay={setCursor} onOpen={onOpen} />}
          {view === "week" && <WeekView cursor={cursor} today={today} days={days} onSelectDay={setCursor} onOpen={onOpen} />}
          {view === "list" && <ListView days={days} today={today} onOpen={onOpen} />}
        </motion.div>
      </AnimatePresence>

      <div className="mt-6 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[2px] bg-accent" /> évaluation
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[2px] border border-line-strong" /> tâche de révision
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[2px] bg-bad" /> tâche en retard
        </span>
      </div>

      <EventSheet event={openEvent} onClose={close} />
    </div>
  );
}
