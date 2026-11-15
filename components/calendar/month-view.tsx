"use client";
import { motion } from "motion/react";
import { CheckCircle2, Circle } from "lucide-react";
import type { PlanEvent, RevisionTask } from "@/lib/types";
import { addDays, fmtDayLong, fmtTime, keyToNoon, monthStart, weekStart } from "@/lib/dates";
import { useApp } from "@/components/providers/app-provider";
import { Empty, Stagger, StaggerItem, cx, hueStyle } from "@/components/ui/primitives";
import { EventRow, TaskRow } from "@/components/planning/rows";
import type { DayItems } from "./shared";

const WEEKDAYS = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];
const MAX = 3;

type Pill = { kind: "event"; e: PlanEvent } | { kind: "task"; t: RevisionTask };

export function MonthView({
  cursor,
  today,
  days,
  selected,
  onSelectDay,
  onOpen,
}: {
  cursor: string;
  today: string;
  days: Map<string, DayItems>;
  selected: string;
  onSelectDay: (k: string) => void;
  onOpen: (e: PlanEvent) => void;
}) {
  const { progress, events, cname } = useApp();
  const eventById = (id: string) => events.find((e) => e.id === id);
  const first = monthStart(cursor);
  const start = weekStart(first);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const month = first.slice(0, 7);
  const sel = days.get(selected);

  return (
    <div className="space-y-4">
      <div className="card overflow-hidden p-1.5 sm:p-2">
        <div className="grid grid-cols-7 pb-1 text-center text-[11px] font-semibold tracking-wide text-muted uppercase">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-1.5">
              {d}
            </div>
          ))}
        </div>
        <motion.div key={month} className="grid grid-cols-7 gap-1" initial={{ opacity: 0, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25 }}>
          {cells.map((k) => {
            const items = days.get(k);
            const pills: Pill[] = [
              // Les évaluations d'abord : toujours visibles parmi les 3 pastilles
              ...(items?.events ?? []).filter((e) => e.isExam).map((e) => ({ kind: "event" as const, e })),
              ...(items?.events ?? []).filter((e) => !e.isExam).map((e) => ({ kind: "event" as const, e })),
              ...(items?.tasks ?? []).map((t) => ({ kind: "task" as const, t })),
            ];
            const hasExam = pills.some((p) => p.kind === "event" && p.e.isExam);
            const out = k.slice(0, 7) !== month;
            const isToday = k === today;
            const isSel = k === selected;
            return (
              <button
                key={k}
                type="button"
                onClick={() => onSelectDay(k)}
                aria-label={fmtDayLong.format(keyToNoon(k)) + (pills.length ? ` : ${pills.length} élément(s)` : "")}
                className={cx(
                  "relative flex min-h-16 min-w-0 cursor-pointer flex-col rounded-xl p-1 text-left transition-colors sm:min-h-24 sm:p-1.5",
                  out ? "opacity-40" : "",
                  isSel ? "bg-soft ring-2 ring-a1/60" : "hover:bg-soft/70",
                  hasExam && !isSel && "bg-exam/[0.06] ring-1 ring-exam/30",
                )}
              >
                <span
                  className={cx(
                    "mb-1 grid h-6 w-6 place-items-center rounded-full text-xs font-semibold tabular-nums",
                    isToday ? "bg-gradient text-white shadow-lift" : "text-fg",
                  )}
                >
                  {Number(k.slice(8))}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  {pills.slice(0, MAX).map((p) =>
                    p.kind === "event" ? (
                      <span
                        key={p.e.id}
                        role="presentation"
                        title={p.e.name}
                        onClick={(x) => {
                          x.stopPropagation();
                          onOpen(p.e);
                        }}
                        className={cx("pill", p.e.isExam ? "pill-exam exam-glow" : p.e.key ? "pill-course" : "pill-neutral")}
                        style={hueStyle(p.e.key || null)}
                      >
                        <span className="hidden sm:inline">
                          {!p.e.allDay && <span className="mr-1 tabular-nums opacity-70">{fmtTime.format(p.e.start)}</span>}
                          {p.e.name}
                        </span>
                      </span>
                    ) : (
                      <span
                        key={p.t.id}
                        role="presentation"
                        title={p.t.txt}
                        onClick={(x) => {
                          const ev = eventById(p.t.evId);
                          if (!ev) return;
                          x.stopPropagation();
                          onOpen(ev);
                        }}
                        className={cx("pill pill-task", progress.t[p.t.id] && "opacity-50")}
                      >
                        <span className="hidden min-w-0 items-center gap-1 sm:flex">
                          {progress.t[p.t.id] ? <CheckCircle2 className="h-3 w-3 shrink-0" /> : <Circle className="h-3 w-3 shrink-0" />}
                          <span className="truncate">
                            J-{p.t.j} {cname(p.t.course)}
                          </span>
                        </span>
                      </span>
                    ),
                  )}
                  {pills.length > MAX && <span className="text-[10px] font-semibold text-muted sm:text-[11px]">+{pills.length - MAX}</span>}
                </span>
              </button>
            );
          })}
        </motion.div>
      </div>

      <motion.section key={selected} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card card-pad">
        <h2 className="mb-3 font-semibold first-letter:uppercase">
          {fmtDayLong.format(keyToNoon(selected))}
          {selected === today && <span className="chip-accent ml-2 align-middle">Aujourd&apos;hui</span>}
        </h2>
        {sel && (sel.events.length || sel.tasks.length) ? (
          <Stagger className="space-y-2">
            {sel.tasks.map((t) => (
              <StaggerItem key={t.id}>
                <TaskRow t={t} compact />
              </StaggerItem>
            ))}
            {sel.events.map((e) => (
              <StaggerItem key={e.id} style={hueStyle(e.key)}>
                <EventRow e={e} onOpen={onOpen} showDate={false} />
              </StaggerItem>
            ))}
          </Stagger>
        ) : (
          <Empty>Rien ce jour-là.</Empty>
        )}
      </motion.section>
    </div>
  );
}
