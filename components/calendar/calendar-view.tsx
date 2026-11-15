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
    else if (view === "week") setCursor((c) => addDays(c, 7 * dir));
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
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="h1">Planning</h1>
          <p className="sub">
            Heure de Paris · plan de révision J-14 / J-7 / J-3 / J-1 recalculé à chaque changement d&apos;examen · {done}/{tasks.length} tâches faites
          </p>
        </div>
        <Segmented
          id="cal-view"
          value={view}
          onChange={setView}
          options={[
            { value: "month", label: "Mois", icon: <CalendarDays className="h-4 w-4" /> },
            { value: "week", label: "Semaine", icon: <CalendarRange className="h-4 w-4" /> },
            { value: "list", label: "Liste", icon: <List className="h-4 w-4" /> },
          ]}
        />
      </header>

      <div className="card flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
        <div className="flex items-center gap-1">
          <button className="btn h-9 w-9 p-0" onClick={() => move(-1)} aria-label="Précédent">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button className="btn h-9 w-9 p-0" onClick={() => move(1)} aria-label="Suivant">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button className="btn h-9 px-3" onClick={() => setCursor(today)}>
            Aujourd&apos;hui
          </button>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.h2
            key={title}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="min-w-0 flex-1 text-base font-semibold first-letter:uppercase sm:text-lg"
          >
            {title}
          </motion.h2>
        </AnimatePresence>
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

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className={cx(planning.source === "live" ? "chip-ok" : "chip-warn", "max-w-full truncate")}>{planningSourceLabel(planning.source, planning.fetchedAt)}</span>
        <RefreshButton />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
          {view === "month" && <MonthView cursor={cursor} today={today} days={days} selected={selectedDay} onSelectDay={setCursor} onOpen={onOpen} />}
          {view === "week" && <WeekView cursor={cursor} today={today} days={days} onSelectDay={setCursor} onOpen={onOpen} />}
          {view === "list" && <ListView days={days} today={today} onOpen={onOpen} />}
        </motion.div>
      </AnimatePresence>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-exam exam-glow" /> évaluation
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border border-dashed border-a1" /> tâche de révision
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border border-bad bg-bad/20" /> tâche en retard
        </span>
      </div>

      <EventSheet event={openEvent} onClose={close} />
    </div>
  );
}
