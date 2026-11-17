"use client";
import Link from "next/link";
import { AnimatePresence, motion, useDragControls } from "motion/react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, BookOpen, FileText, X } from "lucide-react";
import type { PlanEvent } from "@/lib/types";
import { daysUntil, fmtDayLong, fmtTime, relativeDays } from "@/lib/dates";
import { COURSES, courseHref } from "@/lib/courses";
import { aaOfficial, aaState, courseAA } from "@/lib/progress";
import { useApp } from "@/components/providers/app-provider";
import { TaskRow } from "@/components/planning/rows";
import { CourseDot, Empty, Pct, Section, StateTag } from "@/components/ui/primitives";

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
  const { ref, tasks, now, cname } = useApp();
  const aas = [...new Map(e.courses.flatMap((c) => courseAA(ref, c)).map((a) => [a.code, a])).values()];
  const related = e.isExam ? tasks.filter((t) => t.evId === e.id) : tasks.filter((t) => e.courses.includes(t.course) && daysUntil(t.date, now) >= 0).slice(0, 4);
  return (
    <div className="flex h-full flex-col">
      <div className="relative shrink-0 touch-none border-b border-line px-5 pt-4 pb-5 lg:touch-auto lg:pt-6" onPointerDown={onHandle}>
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-line-strong lg:hidden" />
        <button onClick={onClose} className="btn-ghost absolute top-2 right-2 h-11 w-11 p-0 lg:top-3" aria-label="Fermer">
          <X className="h-5 w-5" />
        </button>
        <div className="flex flex-wrap items-center gap-2 pr-10 text-[12px]">
          <CourseDot code={e.key || null} />
          <span className={e.isExam ? "chip border-accent text-accent" : "chip"}>{e.type}</span>
          {e.isExam && <span className="num text-accent">{relativeDays(daysUntil(e.start, now))}</span>}
        </div>
        <h2 className="t-title mt-3 pr-6 text-[24px]">{e.name}</h2>
        {e.courses.length > 0 && <p className="mt-1 text-[13px] text-muted">{e.courses.map(cname).join(" · ")}</p>}
      </div>
      <div className="flex-1 space-y-8 overflow-y-auto px-5 py-5">
        <dl className="text-[13.5px]">
          <div className="row justify-between">
            <dt className="text-muted">Date</dt>
            <dd className="first-letter:uppercase">{fmtDayLong.format(e.start)}</dd>
          </div>
          <div className="row justify-between">
            <dt className="text-muted">Horaire</dt>
            <dd className="num">{e.allDay ? "Toute la journée" : `${fmtTime.format(e.start)} – ${fmtTime.format(e.end)}`}</dd>
          </div>
          <div className="row justify-between">
            <dt className="text-muted">Salle</dt>
            <dd className={e.location ? "" : "text-faint"}>{e.location || "non précisée"}</dd>
          </div>
          {e.note && (
            <div className="row justify-between">
              <dt className="text-muted">Note</dt>
              <dd className="text-right">{e.note}</dd>
            </div>
          )}
        </dl>

        {e.courses.some((c) => COURSES[c]) && (
          <div className="flex flex-wrap gap-2">
            {e.courses
              .filter((c) => COURSES[c])
              .map((c) => (
                <span key={c} className="contents">
                  <Link href={courseHref(c, "fiches")} className="btn-accent">
                    <FileText className="h-3.5 w-3.5" /> Fiche{e.courses.length > 1 ? ` ${cname(c)}` : ""}
                  </Link>
                  <Link href={courseHref(c, "cours")} className="btn">
                    <BookOpen className="h-3.5 w-3.5" /> Cours
                  </Link>
                </span>
              ))}
          </div>
        )}

        <Section label={`AA PITCH liés · ${aas.length}`}>
          {aas.length ? (
            aas.map((a) => (
              <Link key={a.code} href={`/competences?c=${a.comp}&aa=${encodeURIComponent(a.code)}`} onClick={onClose} className="row row-link items-start">
                <StateTag state={aaState(a)} short className="mt-1.5" />
                <span className="min-w-0 flex-1 text-[13px] leading-snug">{a.title}</span>
                <Pct value={aaOfficial(a)} className="shrink-0 text-[12.5px]" />
              </Link>
            ))
          ) : (
            <Empty>Aucun AA PITCH rattaché à ce créneau.</Empty>
          )}
        </Section>

        <Section
          label={e.isExam ? "Plan de révision" : "Prochaines révisions de ce cours"}
          action={
            e.isExam ? (
              <Link href="/planning" onClick={onClose} className="inline-flex items-center gap-1 text-muted hover:text-fg">
                Planning <ArrowRight className="h-3 w-3" />
              </Link>
            ) : undefined
          }
        >
          {related.length ? related.map((t) => <TaskRow key={t.id} t={t} />) : <Empty>Aucune tâche de révision.</Empty>}
        </Section>
      </div>
    </div>
  );
}

export function EventSheet({ event, onClose }: { event: PlanEvent | null; onClose: () => void }) {
  const desktop = useIsDesktop();
  const drag = useDragControls();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!event) return;
    const k = (x: KeyboardEvent) => x.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [event, onClose]);
  // Portail vers <body> : un ancêtre animé (transform / filter) piégerait sinon les éléments « fixed »
  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {event && (
        <>
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-40 bg-black/25 dark:bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />
          <motion.aside
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={event.name}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[88dvh] overflow-hidden rounded-t-xl border-t border-line-strong bg-bg lg:inset-y-0 lg:right-0 lg:left-auto lg:max-h-none lg:w-[28rem] lg:rounded-none lg:border-t-0 lg:border-l"
            initial={desktop ? { x: "100%" } : { y: "100%" }}
            animate={desktop ? { x: 0 } : { y: 0 }}
            exit={desktop ? { x: "100%" } : { y: "100%" }}
            transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
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
    </AnimatePresence>,
    document.body,
  );
}
