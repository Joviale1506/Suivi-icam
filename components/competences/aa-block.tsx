"use client";
import Link from "next/link";
import { motion } from "motion/react";
import { Check } from "lucide-react";
import type { AA, CritLevel } from "@/lib/types";
import { aaScore, aaState, critId } from "@/lib/progress";
import { courseHref } from "@/lib/courses";
import { useApp } from "@/components/providers/app-provider";
import { CourseDot, ProgressBar, cx, hueStyle } from "@/components/ui/primitives";

export function AAStateChip({ aa }: { aa: AA }) {
  const { progress } = useApp();
  const s = aaState(aa, progress);
  return (
    <span className="flex flex-wrap justify-end gap-1">
      {s === "pitch" ? (
        <span className="chip-ok">Validé PITCH</span>
      ) : s === "ok" ? (
        <span className="chip-ok">Prêt</span>
      ) : s === "wip" ? (
        <span className="chip-warn">En cours</span>
      ) : (
        <span className="chip">À travailler</span>
      )}
      {aa.progress != null && (
        <span className="chip-accent" title="Progression officielle PITCH">
          PITCH {Math.round(aa.progress)} %
        </span>
      )}
    </span>
  );
}

const LEVELS: { v: CritLevel | 0; label: string; title: string }[] = [
  { v: 0, label: "·", title: "Pas encore vu" },
  { v: 1, label: "En cours", title: "En cours (50 %)" },
  { v: 2, label: "Maîtrisé", title: "Maîtrisé (100 %)" },
];

/** Sélecteur à 3 états d'un critère */
export function TriState({ id, value, onChange }: { id: string; value: CritLevel | 0; onChange: (v: CritLevel | 0) => void }) {
  return (
    <div className="inline-flex shrink-0 rounded-lg border border-line bg-soft/60 p-0.5" role="radiogroup">
      {LEVELS.map((l) => {
        const on = l.v === value;
        return (
          <button
            key={l.v}
            type="button"
            role="radio"
            aria-checked={on}
            title={l.title}
            onClick={() => onChange(l.v)}
            className={cx(
              "relative cursor-pointer rounded-md px-2 py-1 text-[11.5px] font-semibold transition-colors",
              l.v === 0 && "w-6 px-0",
              on ? (l.v === 2 ? "text-white" : l.v === 1 ? "text-warn" : "text-fg") : "text-muted hover:text-fg",
            )}
          >
            {on && (
              <motion.span
                layoutId={`tri-${id}`}
                className={cx(
                  "absolute inset-0 rounded-md",
                  l.v === 2 ? "bg-ok" : l.v === 1 ? "bg-warn/15 ring-1 ring-warn/40" : "bg-card-strong ring-1 ring-line",
                )}
                transition={{ type: "spring", stiffness: 550, damping: 38 }}
              />
            )}
            <span className="relative">{l.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function AABlock({ aa, showCourses = true }: { aa: AA; showCourses?: boolean }) {
  const { progress, setCrit, togglePitch, cname } = useApp();
  const score = aaScore(aa, progress);
  const validated = !!progress.p[aa.code];
  return (
    <div className="rounded-2xl border border-line bg-card-strong/60 p-3.5 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[14.5px] font-medium leading-snug">{aa.title}</div>
          <div className="code mt-0.5">
            {aa.code}
            {aa.sem && ` · ${aa.sem}`}
          </div>
        </div>
        <AAStateChip aa={aa} />
      </div>
      {showCourses && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted">
          <span>Se valide dans :</span>
          {aa.courses.length ? (
            aa.courses.map((c) => (
              <Link key={c} href={courseHref(c, "cours")} className="cc-soft inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium" style={hueStyle(c)}>
                <CourseDot code={c} className="h-1.5 w-1.5" />
                {cname(c)}
              </Link>
            ))
          ) : (
            <span>—</span>
          )}
        </div>
      )}
      <ProgressBar value={score} className="mt-3" />
      <div className="mt-3 space-y-2">
        {aa.crit.length ? (
          aa.crit.map((c, i) => {
            const k = critId(aa, i);
            return (
              <div key={k} className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-3">
                <TriState id={k} value={progress.c[k] ?? 0} onChange={(v) => setCrit(k, v)} />
                <div className="min-w-0 text-[13.5px] leading-snug">
                  {c.title}
                  {c.mandatory && <span className="chip-bad ml-1.5 align-middle">obligatoire</span>}
                  {c.eval && <span className="text-muted"> · {c.eval}</span>}
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-lg bg-soft px-3 py-2 text-xs text-muted">
            Critères non détaillés (hors de ton parcours langues). Lance une synchro PITCH pour les récupérer.
          </div>
        )}
      </div>
      <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
        <span
          className={cx(
            "grid h-5 w-5 place-items-center rounded-md border transition-colors",
            validated ? "border-transparent bg-ok text-white" : "border-muted/50",
          )}
        >
          {validated && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </span>
        <input type="checkbox" className="sr-only" checked={validated} onChange={(e) => togglePitch(aa.code, e.target.checked)} />
        Validé officiellement dans PITCH
      </label>
    </div>
  );
}
