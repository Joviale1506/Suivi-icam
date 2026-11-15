import type { PlanEvent, ProgressState, RevisionTask } from "@/lib/types";
import { dayKey } from "@/lib/dates";

export type CalView = "month" | "week" | "list";
export type CalFilter = "all" | "exam" | "todo";

export interface DayItems {
  events: PlanEvent[];
  tasks: RevisionTask[];
}

/**
 * Filtres (mêmes règles que la v1) :
 *  - all  : créneaux + toutes les tâches
 *  - exam : évaluations seulement (pas de tâches)
 *  - todo : créneaux + tâches non faites
 */
export function applyFilter(events: PlanEvent[], tasks: RevisionTask[], filter: CalFilter, progress: ProgressState) {
  return {
    events: filter === "exam" ? events.filter((e) => e.isExam) : events,
    tasks: filter === "exam" ? [] : filter === "todo" ? tasks.filter((t) => !progress.t[t.id]) : tasks,
  };
}

export function groupByDay(events: PlanEvent[], tasks: RevisionTask[], taskDay: (t: RevisionTask) => string = (t) => dayKey(t.date)) {
  const m = new Map<string, DayItems>();
  const get = (k: string) => {
    let v = m.get(k);
    if (!v) m.set(k, (v = { events: [], tasks: [] }));
    return v;
  };
  for (const e of events) get(dayKey(e.start)).events.push(e);
  for (const t of tasks) get(taskDay(t)).tasks.push(t);
  for (const v of m.values()) {
    v.events.sort((a, b) => a.start.getTime() - b.start.getTime());
    v.tasks.sort((a, b) => a.date.getTime() - b.date.getTime());
  }
  return m;
}

export interface Lane {
  e: PlanEvent;
  lane: number;
  lanes: number;
}
/** Répartit les créneaux qui se chevauchent sur plusieurs colonnes */
export function layoutLanes(evs: PlanEvent[]): Lane[] {
  const sorted = [...evs].sort((a, b) => a.start.getTime() - b.start.getTime() || b.end.getTime() - a.end.getTime());
  const out: Lane[] = [];
  let cluster: Lane[] = [];
  let clusterEnd = 0;
  let laneEnds: number[] = [];
  const close = () => {
    const n = laneEnds.length;
    for (const l of cluster) l.lanes = n;
    cluster = [];
    laneEnds = [];
  };
  for (const e of sorted) {
    const s = e.start.getTime();
    if (cluster.length && s >= clusterEnd) close();
    let lane = laneEnds.findIndex((end) => end <= s);
    if (lane < 0) {
      lane = laneEnds.length;
      laneEnds.push(0);
    }
    laneEnds[lane] = e.end.getTime();
    const l = { e, lane, lanes: 1 };
    cluster.push(l);
    out.push(l);
    clusterEnd = Math.max(clusterEnd, e.end.getTime());
  }
  close();
  return out;
}
