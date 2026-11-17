"use client";
import Link from "next/link";
import { FileText } from "lucide-react";
import type { PlanEvent, RevisionTask } from "@/lib/types";
import { daysUntil, fmtDay, fmtTime, relativeDays } from "@/lib/dates";
import { courseHref } from "@/lib/courses";
import { useApp } from "@/components/providers/app-provider";
import { TaskCheckbox } from "@/components/ui/task-checkbox";
import { CourseDot, cx } from "@/components/ui/primitives";

/** Clé de couleur d'un créneau (null = neutre : férié, vacances, autonomie…) */
export const eventColorKey = (e: PlanEvent) => e.key || null;

export function TypeChip({ e }: { e: PlanEvent }) {
  return <span className={cx("chip", e.isExam && "border-accent text-accent")}>{e.type}</span>;
}

/** Ligne de créneau : heure · repère couleur · intitulé · type */
export function EventRow({ e, onOpen, showDate = true }: { e: PlanEvent; onOpen?: (e: PlanEvent) => void; showDate?: boolean }) {
  const { now } = useApp();
  const live = e.start <= now && e.end > now;
  const content = (
    <>
      <span className="num w-[86px] shrink-0 text-[12.5px] text-muted sm:w-[104px]">
        {showDate && <span className="block text-fg">{fmtDay.format(e.start)}</span>}
        {e.allDay ? "Journée" : `${fmtTime.format(e.start)}–${fmtTime.format(e.end)}`}
      </span>
      <CourseDot code={eventColorKey(e)} className="mt-1.5 self-start" />
      <span className="min-w-0 flex-1 self-start">
        <span className={cx("block truncate text-[13.5px]", e.isExam && "font-medium")}>{e.name}</span>
        <span className="block truncate text-[12px] text-muted">
          {[e.note, e.location, e.isExam ? relativeDays(daysUntil(e.start, now)) : ""].filter(Boolean).join(" · ") || " "}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1.5 self-start">
        {live && <span className="chip border-ok text-ok">en cours</span>}
        <TypeChip e={e} />
      </span>
    </>
  );
  const cls = "row items-start";
  return onOpen ? (
    <button type="button" onClick={() => onOpen(e)} className={cx(cls, "row-link w-full cursor-pointer text-left")}>
      {content}
    </button>
  ) : (
    <div className={cls}>{content}</div>
  );
}

export function TaskRow({ t, compact = false }: { t: RevisionTask; compact?: boolean }) {
  const { progress, toggleTask, now, cname } = useApp();
  const done = !!progress.t[t.id];
  const late = !done && daysUntil(t.date, now) < 0;
  return (
    <div className={cx("row items-start", done && "text-muted")}>
      <span className="mt-[-2px] pl-3">
        <TaskCheckbox checked={done} onChange={(v) => toggleTask(t.id, v)} label={t.txt} />
      </span>
      <div className="min-w-0 flex-1">
        <div className={cx("text-[13.5px] leading-snug", done && "line-through decoration-faint")}>{t.label}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <CourseDot code={t.course} />
            {cname(t.course)}
          </span>
          <span className="num">J-{t.j}</span>
          {!compact && <span className="num">{fmtDay.format(t.date)}</span>}
          <span className="num">~{t.h} h</span>
          {t.oral && <span>oral</span>}
          {late && <span className="text-bad">en retard</span>}
        </div>
      </div>
      <Link href={courseHref(t.course, "fiches")} className="btn-ghost h-9 w-9 shrink-0 p-0" title="Ouvrir la fiche" aria-label="Ouvrir la fiche">
        <FileText className="h-4 w-4" />
      </Link>
    </div>
  );
}
