"use client";
import { fmtDay, fmtDayLong, keyToNoon, weekStart } from "@/lib/dates";
import type { PlanEvent } from "@/lib/types";
import { Empty, Stagger, StaggerItem, hueStyle } from "@/components/ui/primitives";
import { EventRow, TaskRow } from "@/components/planning/rows";
import type { DayItems } from "./shared";

/** Liste regroupée par semaine puis par jour, tâches de révision intercalées (en tête de journée) */
export function ListView({ days, today, onOpen }: { days: Map<string, DayItems>; today: string; onOpen: (e: PlanEvent) => void }) {
  const keys = [...days.keys()].sort();
  if (!keys.length) return <Empty>Rien sur cette période.</Empty>;
  const weeks = new Map<string, string[]>();
  for (const k of keys) {
    const w = weekStart(k);
    weeks.set(w, [...(weeks.get(w) ?? []), k]);
  }
  return (
    <div className="space-y-6">
      {[...weeks.entries()].map(([w, ks]) => (
        <section key={w}>
          <h2 className="sticky top-14 z-10 -mx-1 mb-2 rounded-lg bg-bg/80 px-1 py-1 text-xs font-semibold tracking-wider text-muted uppercase backdrop-blur lg:top-0">
            Semaine du {fmtDay.format(keyToNoon(w))}
          </h2>
          <Stagger className="space-y-3">
            {ks.map((k) => {
              const d = days.get(k)!;
              return (
                <StaggerItem key={k} className="card card-pad">
                  <h3 className="mb-3 text-sm font-semibold first-letter:uppercase">
                    {fmtDayLong.format(keyToNoon(k))}
                    {k === today && <span className="chip-accent ml-2 align-middle">Aujourd&apos;hui</span>}
                  </h3>
                  <div className="space-y-2">
                    {d.tasks.map((t) => (
                      <TaskRow key={t.id} t={t} />
                    ))}
                    {d.events.map((e) => (
                      <div key={e.id} style={hueStyle(e.key)}>
                        <EventRow e={e} onOpen={onOpen} showDate={false} />
                      </div>
                    ))}
                  </div>
                </StaggerItem>
              );
            })}
          </Stagger>
        </section>
      ))}
    </div>
  );
}
