"use client";
import type { PlanEvent, RevisionTask } from "@/lib/types";
import { addDays, fmtDayLong, fmtTime, keyToNoon, monthStart, weekStart } from "@/lib/dates";
import { useApp } from "@/components/providers/app-provider";
import { Empty, Section, cx, hueStyle } from "@/components/ui/primitives";
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
  const cells = Array.from({ length: 42 }, (_, i) => addDays(weekStart(first), i));
  const month = first.slice(0, 7);
  const sel = days.get(selected);

  return (
    <div className="space-y-10">
      <div className="overflow-hidden rounded-lg border border-line">
        <div className="grid grid-cols-7 border-b border-line">
          {WEEKDAYS.map((d) => (
            <div key={d} className="t-label py-2 text-center">
              {d}
            </div>
          ))}
        </div>
        {/* Filets de 1 px : la grille a un fond de la couleur des filets, les cases la couleur de la page */}
        <div className="grid grid-cols-7 gap-px bg-line">
          {cells.map((k) => {
            const items = days.get(k);
            const pills: Pill[] = [
              ...(items?.events ?? []).filter((e) => e.isExam).map((e) => ({ kind: "event" as const, e })),
              ...(items?.events ?? []).filter((e) => !e.isExam).map((e) => ({ kind: "event" as const, e })),
              ...(items?.tasks ?? []).map((t) => ({ kind: "task" as const, t })),
            ];
            const out = k.slice(0, 7) !== month;
            const isToday = k === today;
            const isSel = k === selected;
            return (
              <button
                key={k}
                type="button"
                onClick={() => onSelectDay(k)}
                aria-label={fmtDayLong.format(keyToNoon(k)) + (pills.length ? ` : ${pills.length} élément(s)` : "")}
                aria-pressed={isSel}
                className={cx(
                  "relative flex min-h-16 min-w-0 cursor-pointer flex-col p-1 text-left transition-colors duration-150 sm:min-h-[104px] sm:p-1.5",
                  isSel ? "bg-hover" : "bg-bg hover:bg-hover/60",
                )}
              >
                <span
                  className={cx(
                    "num mb-1 grid h-6 w-6 place-items-center rounded-full text-[12px]",
                    isToday ? "bg-accent font-medium text-accent-fg" : out ? "text-faint" : "text-fg",
                  )}
                >
                  {Number(k.slice(8))}
                </span>
                <span className={cx("flex min-w-0 flex-col gap-[3px]", out && "opacity-50")}>
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
                        className={cx("pill", p.e.isExam ? "pill-exam" : p.e.key ? "pill-course" : "pill-neutral")}
                        style={hueStyle(p.e.key || null)}
                      >
                        <span className="hidden sm:inline">
                          {!p.e.allDay && <span className="num mr-1 opacity-70">{fmtTime.format(p.e.start)}</span>}
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
                        className={cx("pill pill-task", progress.t[p.t.id] && "line-through opacity-50")}
                      >
                        <span className="hidden sm:inline">
                          J-{p.t.j} {cname(p.t.course)}
                        </span>
                      </span>
                    ),
                  )}
                  {pills.length > MAX && <span className="num text-[10.5px] text-muted sm:text-[11px]">+{pills.length - MAX}</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Section label={<span className="first-letter:uppercase">{fmtDayLong.format(keyToNoon(selected)) + (selected === today ? " · aujourd'hui" : "")}</span>}>
        {sel && (sel.events.length || sel.tasks.length) ? (
          <>
            {sel.tasks.map((t) => (
              <TaskRow key={t.id} t={t} compact />
            ))}
            {sel.events.map((e) => (
              <EventRow key={e.id} e={e} onOpen={onOpen} showDate={false} />
            ))}
          </>
        ) : (
          <Empty>Rien ce jour-là.</Empty>
        )}
      </Section>
    </div>
  );
}
