"use client";
import Link from "next/link";
import { motion } from "motion/react";
import { FileText, Mic, PenLine } from "lucide-react";
import type { PlanEvent, RevisionTask } from "@/lib/types";
import { daysUntil, fmtDay, fmtTime, relativeDays } from "@/lib/dates";
import { courseHref } from "@/lib/courses";
import { useApp } from "@/components/providers/app-provider";
import { TaskCheckbox } from "@/components/ui/task-checkbox";
import { cx, hueStyle } from "@/components/ui/primitives";

/** Clé de couleur d'un créneau (null = neutre : férié, vacances, autonomie…) */
export const eventColorKey = (e: PlanEvent) => e.key || null;

export function TypeChip({ e }: { e: PlanEvent }) {
  return <span className={e.isExam ? "chip-exam" : "chip"}>{e.type}</span>;
}

export function EventRow({ e, onOpen, showDate = true }: { e: PlanEvent; onOpen?: (e: PlanEvent) => void; showDate?: boolean }) {
  const { now } = useApp();
  const live = e.start <= now && e.end > now;
  const content = (
    <>
      <div className="w-16 shrink-0 text-xs tabular-nums text-muted sm:w-20">
        {showDate && <b className="block text-[13px] font-semibold text-fg">{fmtDay.format(e.start)}</b>}
        {e.allDay ? "Journée" : fmtTime.format(e.start)}
        {!e.allDay && !showDate && <span className="block">{fmtTime.format(e.end)}</span>}
      </div>
      <div className={cx("min-w-0 flex-1 rounded-xl border px-3 py-2", eventColorKey(e) ? "cc-soft" : "border-line bg-soft", e.isExam && "exam-glow")} style={hueStyle(eventColorKey(e))}>
        <div className="flex items-start justify-between gap-2">
          <span className="min-w-0 truncate text-sm font-semibold">{e.name}</span>
          <span className="flex shrink-0 items-center gap-1">
            {live && <span className="chip-accent">en cours</span>}
            <TypeChip e={e} />
          </span>
        </div>
        <div className="truncate text-xs opacity-80">
          {[e.note, e.location, e.isExam ? relativeDays(daysUntil(e.start, now)) : ""].filter(Boolean).join(" · ") || " "}
        </div>
      </div>
    </>
  );
  return onOpen ? (
    <button type="button" onClick={() => onOpen(e)} className="flex w-full cursor-pointer items-start gap-3 text-left transition-transform active:scale-[0.99]">
      {content}
    </button>
  ) : (
    <div className="flex items-start gap-3">{content}</div>
  );
}

export function TaskRow({ t, compact = false }: { t: RevisionTask; compact?: boolean }) {
  const { progress, toggleTask, now, cname } = useApp();
  const done = !!progress.t[t.id];
  const late = !done && daysUntil(t.date, now) < 0;
  const Icon = t.oral ? Mic : PenLine;
  return (
    <motion.div
      layout
      className={cx(
        "flex items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors",
        late ? "border-bad/40 bg-bad/5" : "border-line bg-card-strong/50",
        done && "opacity-60",
      )}
    >
      <TaskCheckbox checked={done} onChange={(v) => toggleTask(t.id, v)} label={t.txt} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
          <span className="inline-flex items-center gap-1 font-semibold cc-text" style={hueStyle(t.course)}>
            <Icon className="h-3.5 w-3.5" />
            {cname(t.course)}
          </span>
          <span className="chip">J-{t.j}</span>
          {!compact && <span>{fmtDay.format(t.date)}</span>}
          <span>~{t.h} h</span>
          {late && <span className="chip-bad">en retard</span>}
        </div>
        <div className={cx("mt-0.5 text-[13.5px] leading-snug", done && "line-through decoration-muted/60")}>{t.label}</div>
      </div>
      <Link href={courseHref(t.course, "fiches")} className="shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:bg-soft hover:text-fg" title="Ouvrir la fiche" aria-label="Ouvrir la fiche">
        <FileText className="h-4 w-4" />
      </Link>
    </motion.div>
  );
}
