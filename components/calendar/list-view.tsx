"use client";
import { fmtDay, fmtDayLong, keyToNoon, weekStart } from "@/lib/dates";
import type { PlanEvent } from "@/lib/types";
import { Empty, Section } from "@/components/ui/primitives";
import { EventRow, TaskRow } from "@/components/planning/rows";
import type { DayItems } from "./shared";

/** Liste regroupée par semaine puis par jour, tâches de révision en tête de journée */
export function ListView({ days, today, onOpen }: { days: Map<string, DayItems>; today: string; onOpen: (e: PlanEvent) => void }) {
  const keys = [...days.keys()].sort();
  if (!keys.length) return <Empty>Rien sur cette période.</Empty>;
  const weeks = new Map<string, string[]>();
  for (const k of keys) {
    const w = weekStart(k);
    weeks.set(w, [...(weeks.get(w) ?? []), k]);
  }
  return (
    <div className="space-y-12">
      {[...weeks.entries()].map(([w, ks]) => (
        <Section key={w} label={`Semaine du ${fmtDay.format(keyToNoon(w))}`}>
          {ks.map((k) => {
            const d = days.get(k)!;
            return (
              <div key={k} className="grid grid-cols-1 gap-x-6 border-b border-line py-3 last:border-0 md:grid-cols-[9rem_minmax(0,1fr)]">
                <h3 className="pt-2.5 text-[13px] first-letter:uppercase md:pt-3">
                  {fmtDayLong.format(keyToNoon(k))}
                  {k === today && <span className="ml-2 text-accent">aujourd&apos;hui</span>}
                </h3>
                <div className="[&>*:last-child]:border-0">
                  {d.tasks.map((t) => (
                    <TaskRow key={t.id} t={t} />
                  ))}
                  {d.events.map((e) => (
                    <EventRow key={e.id} e={e} onOpen={onOpen} showDate={false} />
                  ))}
                </div>
              </div>
            );
          })}
        </Section>
      ))}
    </div>
  );
}
