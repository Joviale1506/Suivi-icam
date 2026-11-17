"use client";
import { motion } from "motion/react";
import { Mic, PenLine } from "lucide-react";
import type { PlanEvent } from "@/lib/types";
import { addDays, fmtTime, fmtWeekday, keyToNoon, parisMinutes, weekStart } from "@/lib/dates";
import { useApp } from "@/components/providers/app-provider";
import { cx, hueStyle } from "@/components/ui/primitives";
import { layoutLanes, type DayItems } from "./shared";

const START_H = 7;
const END_H = 20;
const HOUR_PX = 52;
const HEIGHT = (END_H - START_H) * HOUR_PX;
const toY = (min: number) => Math.min(HEIGHT, Math.max(0, ((min - START_H * 60) / 60) * HOUR_PX));

export function WeekView({
  cursor,
  today,
  days,
  onSelectDay,
  onOpen,
}: {
  cursor: string;
  today: string;
  days: Map<string, DayItems>;
  onSelectDay: (k: string) => void;
  onOpen: (e: PlanEvent) => void;
}) {
  const { now, progress, events, cname } = useApp();
  const start = weekStart(cursor);
  const week = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const nowMin = parisMinutes(now);
  const hasAllDay = week.some((k) => {
    const d = days.get(k);
    return d && (d.tasks.length || d.events.some((e) => e.allDay));
  });

  return (
    <div className="space-y-3">
      {/* Choix du jour (mobile : une colonne à la fois) */}
      <div className="grid grid-cols-7 gap-1 sm:hidden">
        {week.map((k) => {
          const n = days.get(k);
          const exam = n?.events.some((e) => e.isExam);
          return (
            <button
              key={k}
              onClick={() => onSelectDay(k)}
              className={cx(
                "relative flex min-h-11 cursor-pointer flex-col items-center justify-center rounded-md py-1 text-xs",
                k === cursor ? "bg-accent text-accent-fg" : "border border-line text-fg",
              )}
            >
              <span className="opacity-75">{fmtWeekday.format(keyToNoon(k)).replace(".", "")}</span>
              <span className={cx("text-base font-semibold tabular-nums", k === today && k !== cursor && "text-accent")}>{Number(k.slice(8))}</span>
              {exam && <span className="absolute top-1 right-1.5 h-1.5 w-1.5 rounded-full bg-accent" />}
            </button>
          );
        })}
      </div>

      <motion.div key={start} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-hidden rounded-lg border border-line">
        {/* En-têtes de jours */}
        <div className="hidden grid-cols-[3rem_repeat(7,minmax(0,1fr))] border-b border-line sm:grid">
          <div />
          {week.map((k) => (
            <button key={k} onClick={() => onSelectDay(k)} className="cursor-pointer py-2 text-center">
              <div className="text-[11px] font-medium tracking-[0.08em] text-muted uppercase">{fmtWeekday.format(keyToNoon(k))}</div>
              <div className={cx("mx-auto mt-0.5 grid h-7 w-7 place-items-center rounded-full text-sm font-semibold tabular-nums", k === today && "bg-accent text-accent-fg")}>
                {Number(k.slice(8))}
              </div>
            </button>
          ))}
        </div>

        {/* Journée entière + tâches */}
        {hasAllDay && (
          <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] border-b border-line sm:grid-cols-[3rem_repeat(7,minmax(0,1fr))]">
            <div className="px-1 py-1.5 text-right text-[10px] text-muted">jour</div>
            {week.map((k) => {
              const d = days.get(k);
              return (
                <div key={k} className={cx("min-w-0 space-y-0.5 border-l border-line p-1", k === cursor ? "block" : "hidden sm:block")}>
                  {d?.events
                    .filter((e) => e.allDay)
                    .map((e) => (
                      <button key={e.id} onClick={() => onOpen(e)} className="block w-full cursor-pointer truncate rounded-md bg-hover px-1.5 py-0.5 text-left text-[11px]">
                        {e.name}
                      </button>
                    ))}
                  {d?.tasks.map((t) => {
                    const ev = events.find((e) => e.id === t.evId);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        title={t.txt}
                        className={cx(
                          "flex w-full cursor-pointer items-center gap-1 truncate rounded-md border border-dashed border-line-strong px-1.5 py-0.5 text-left text-[11px] text-muted",
                          progress.t[t.id] && "line-through opacity-50",
                        )}
                        onClick={() => ev && onOpen(ev)}
                      >
                        {t.oral ? <Mic className="h-3 w-3 shrink-0" /> : <PenLine className="h-3 w-3 shrink-0" />}
                        <span className="truncate">
                          J-{t.j} {cname(t.course)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* Grille horaire */}
        <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] sm:grid-cols-[3rem_repeat(7,minmax(0,1fr))]">
          <div className="relative" style={{ height: HEIGHT }}>
            {Array.from({ length: END_H - START_H }, (_, i) => (
              <div key={i} className="absolute right-1.5 -translate-y-1/2 text-[10px] tabular-nums text-muted" style={{ top: i * HOUR_PX }}>
                {i === 0 ? "" : `${START_H + i} h`}
              </div>
            ))}
          </div>
          {week.map((k) => {
            const d = days.get(k);
            const timed = (d?.events ?? []).filter((e) => !e.allDay);
            const lanes = layoutLanes(timed);
            const isToday = k === today;
            return (
              <div key={k} className={cx("relative border-l border-line", k === cursor ? "block" : "hidden sm:block", isToday && "bg-accent/[0.035]")} style={{ height: HEIGHT }}>
                {Array.from({ length: END_H - START_H }, (_, i) => (
                  <div key={i} className="absolute inset-x-0 border-t border-line/70" style={{ top: i * HOUR_PX }} />
                ))}
                {lanes.map(({ e, lane, lanes: n }, i) => {
                  const top = toY(parisMinutes(e.start));
                  const bottom = toY(parisMinutes(e.end) || 24 * 60);
                  const h = Math.max(22, bottom - top - 2);
                  return (
                    <motion.button
                      key={e.id}
                      onClick={() => onOpen(e)}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      whileHover={{ scale: 1.02, zIndex: 5 }}
                      className={cx(
                        "absolute cursor-pointer overflow-hidden rounded-lg border px-1.5 py-1 text-left",
                        e.key ? "cc-soft" : "border-line bg-hover",
                        e.isExam && "exam-mark",
                      )}
                      style={{
                        ...hueStyle(e.key || null),
                        top: top + 1,
                        height: h,
                        left: `calc(${(lane / n) * 100}% + 2px)`,
                        width: `calc(${100 / n}% - 4px)`,
                      }}
                    >
                      <div className={cx("truncate text-[11.5px] font-semibold leading-tight", e.isExam && "text-accent")}>{e.name}</div>
                      {h > 34 && (
                        <div className="truncate text-[10.5px] tabular-nums opacity-75">
                          {fmtTime.format(e.start)}–{fmtTime.format(e.end)}
                        </div>
                      )}
                      {h > 52 && <div className="truncate text-[10.5px] opacity-75">{[e.type, e.location].filter(Boolean).join(" · ")}</div>}
                    </motion.button>
                  );
                })}
                {isToday && nowMin >= START_H * 60 && nowMin <= END_H * 60 && (
                  <motion.div
                    className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1, top: toY(nowMin) - 4 }}
                    transition={{ duration: 0.6 }}
                    style={{ originX: 0 }}
                  >
                    <span className="now-dot -ml-1 h-2 w-2 rounded-full bg-accent" />
                    <span className="h-px flex-1 bg-accent" />
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>
      <p className="text-xs text-muted">Heure de Paris · 7 h – 20 h. Les créneaux hors de cette plage sont ramenés au bord de la grille.</p>
    </div>
  );
}
