"use client";
import Link from "next/link";
import { AnimatePresence, motion, useDragControls } from "motion/react";
import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, Clock, FileText, MapPin, Tag, X } from "lucide-react";
import type { PlanEvent } from "@/lib/types";
import { daysUntil, fmtDayLong, fmtTime, relativeDays } from "@/lib/dates";
import { COURSES, courseHref } from "@/lib/courses";
import { aaScore, courseAA } from "@/lib/progress";
import { useApp } from "@/components/providers/app-provider";
import { AAStateChip } from "@/components/competences/aa-block";
import { TaskRow } from "@/components/planning/rows";
import { Empty, ProgressBar, hueStyle } from "@/components/ui/primitives";

function useIsDesktop() {
  const [d, setD] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(min-width: 1024px)");
    const on = () => setD(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return d;
}

function SheetBody({ e, onClose, onHandle }: { e: PlanEvent; onClose: () => void; onHandle: (x: React.PointerEvent) => void }) {
  const { ref, progress, tasks, now, cname } = useApp();
  const aas = [...new Map(e.courses.flatMap((c) => courseAA(ref, c)).map((a) => [a.code, a])).values()];
  const related = e.isExam
    ? tasks.filter((t) => t.evId === e.id)
    : tasks.filter((t) => e.courses.includes(t.course) && daysUntil(t.date, now) >= 0).slice(0, 4);
  const colorKey = e.key || null;
  const d = daysUntil(e.start, now);
  return (
    <div className="flex h-full flex-col">
      <div className="cc-soft relative shrink-0 touch-none border-b px-5 pt-5 pb-4 lg:touch-auto" style={hueStyle(colorKey)} onPointerDown={onHandle}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-current opacity-25 lg:hidden" />
        <button onClick={onClose} className="absolute top-4 right-4 cursor-pointer rounded-lg p-1.5 hover:bg-black/5 dark:hover:bg-white/10" aria-label="Fermer">
          <X className="h-5 w-5" />
        </button>
        <div className="flex flex-wrap items-center gap-1.5 pr-10">
          <span className={e.isExam ? "chip-exam" : "chip"}>{e.type}</span>
          {e.isExam && <span className="chip-exam">{relativeDays(d)}</span>}
        </div>
        <h2 className="mt-2 pr-8 text-xl font-semibold leading-tight tracking-tight">{e.name}</h2>
        {e.courses.length > 0 && <div className="mt-1 text-sm opacity-80">{e.courses.map(cname).join(" · ")}</div>}
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <div className="space-y-2.5 text-sm">
          <div className="flex items-start gap-2.5">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
            <span>
              <span className="first-letter:uppercase">{fmtDayLong.format(e.start)}</span>
              <br />
              <span className="text-muted">{e.allDay ? "Toute la journée" : `${fmtTime.format(e.start)} – ${fmtTime.format(e.end)} (heure de Paris)`}</span>
            </span>
          </div>
          <div className="flex items-start gap-2.5">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
            <span className={e.location ? "" : "text-muted"}>{e.location || "Salle non précisée"}</span>
          </div>
          {e.note && (
            <div className="flex items-start gap-2.5">
              <Tag className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
              <span>{e.note}</span>
            </div>
          )}
        </div>

        {e.courses.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {e.courses
              .filter((c) => COURSES[c])
              .map((c) => (
                <span key={c} className="contents">
                  <Link href={courseHref(c, "fiches")} className="btn-primary text-xs">
                    <FileText className="h-3.5 w-3.5" /> Fiche {e.courses.length > 1 ? cname(c) : ""}
                  </Link>
                  <Link href={courseHref(c, "cours")} className="btn text-xs">
                    <BookOpen className="h-3.5 w-3.5" /> Cours
                  </Link>
                </span>
              ))}
          </div>
        )}

        <section>
          <h3 className="mb-2 text-sm font-semibold">AA PITCH liés</h3>
          {aas.length ? (
            <div className="space-y-2">
              {aas.map((a) => (
                <Link key={a.code} href={courseHref(a.courses[0] ?? e.courses[0]!, "cours")} className="block rounded-xl border border-line bg-card-strong/60 p-3 transition-colors hover:bg-soft">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[13px] leading-snug">{a.title}</span>
                    <AAStateChip aa={a} />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <ProgressBar value={aaScore(a, progress)} className="flex-1" />
                    <span className="w-9 text-right text-xs tabular-nums text-muted">{Math.round(aaScore(a, progress) * 100)}%</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <Empty>Aucun AA PITCH rattaché à ce créneau.</Empty>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold">{e.isExam ? "Plan de révision" : "Prochaines tâches de ce cours"}</h3>
          {related.length ? (
            <div className="space-y-2">
              {related.map((t) => (
                <TaskRow key={t.id} t={t} />
              ))}
            </div>
          ) : (
            <Empty>Aucune tâche de révision.</Empty>
          )}
          {e.isExam && (
            <Link href="/planning" onClick={onClose} className="mt-2 inline-flex items-center gap-1 text-xs text-a1 hover:underline">
              Tout le planning <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </section>
      </div>
    </div>
  );
}

export function EventSheet({ event, onClose }: { event: PlanEvent | null; onClose: () => void }) {
  const desktop = useIsDesktop();
  const drag = useDragControls();
  useEffect(() => {
    if (!event) return;
    const k = (x: KeyboardEvent) => x.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [event, onClose]);
  return (
    <AnimatePresence>
      {event && (
        <>
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={event.name}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-hidden rounded-t-3xl border border-line bg-card-strong shadow-2xl lg:inset-y-3 lg:right-3 lg:left-auto lg:max-h-none lg:w-[26rem] lg:rounded-3xl"
            initial={desktop ? { x: "110%" } : { y: "100%" }}
            animate={desktop ? { x: 0 } : { y: 0 }}
            exit={desktop ? { x: "110%" } : { y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            drag={desktop ? false : "y"}
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose();
            }}
          >
            <SheetBody e={event} onClose={onClose} onHandle={(x) => !desktop && drag.start(x)} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
