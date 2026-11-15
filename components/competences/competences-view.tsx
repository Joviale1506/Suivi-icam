"use client";
import { AnimatePresence, motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, Info } from "lucide-react";
import { MISSING_COMPETENCES } from "@/config/profile";
import type { Competence } from "@/lib/types";
import { compAAs, compScore, isReady } from "@/lib/progress";
import { fmtDateTime } from "@/lib/dates";
import { useApp } from "@/components/providers/app-provider";
import { AnimatedNumber, ProgressBar, ProgressRing, Stagger, StaggerItem, Switch, cx } from "@/components/ui/primitives";
import { AABlock } from "./aa-block";

function MissingCompetence({ c }: { c: Competence }) {
  return (
    <div className="card card-pad opacity-60 grayscale">
      <div className="flex items-start justify-between gap-3">
        <span className="text-lg font-bold text-muted">{c.code}</span>
        <span className="chip">Pas dans PITCH CP_FISE</span>
      </div>
      <p className="mt-1 text-sm text-muted">{c.title}</p>
      <p className="mt-3 flex gap-2 rounded-xl bg-soft px-3 py-2 text-xs leading-relaxed text-muted">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Cette compétence fait partie du référentiel ICAM, mais PITCH ne lui rattache <b>aucun RA ni AA</b> dans ton programme CP_FISE (elle n&apos;apparaît
          que dans le programme Bachelor). {MISSING_COMPETENCES[c.code]?.hint} Si des RA apparaissent plus tard, la synchro PITCH les ajoutera ici
          automatiquement.
        </span>
      </p>
    </div>
  );
}

function CompetenceCard({ c, open, onToggle }: { c: Competence; open: boolean; onToggle: () => void }) {
  const { progress } = useApp();
  const p = compScore(c, progress);
  const aas = compAAs(c);
  const ready = aas.filter((a) => isReady(a, progress)).length;
  return (
    <div id={c.code} className={cx("card scroll-mt-24 overflow-hidden transition-shadow", open && "shadow-lift")}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full cursor-pointer items-center gap-4 p-4 text-left sm:p-5">
        <ProgressRing
          value={p}
          threshold={c.min / 100}
          size={60}
          stroke={6}
          gradientId={`cring-${c.code}`}
          label={<span className="text-xs font-bold tabular-nums">{Math.round(p * 100)}%</span>}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-lg font-bold">{c.code}</span>
            <span className="text-xs tabular-nums text-muted">
              <AnimatedNumber value={ready} />/{aas.length} AA prêts
            </span>
          </div>
          <p className={cx("mt-0.5 text-sm text-muted", !open && "line-clamp-2")}>{c.title}</p>
          <ProgressBar value={p} threshold={c.min / 100} className="mt-2.5" />
        </div>
        <motion.span animate={{ rotate: open ? 180 : 0 }} className="shrink-0 text-muted">
          <ChevronDown className="h-5 w-5" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-5 border-t border-line px-3 pt-4 pb-4 sm:px-5">
              {c.ra.map((r) => {
                const visible = r.aa.filter((a) => !a.off || progress.off);
                if (!visible.length) return null;
                return (
                  <section key={r.code}>
                    <h3 className="mb-2 text-sm font-semibold">
                      <span className="text-muted">RA · </span>
                      {r.title} <span className="code">{r.code}</span>
                    </h3>
                    <div className="space-y-3">
                      {visible.map((a) => (
                        <div key={a.code} className={cx(a.off && "opacity-70")}>
                          {a.off && <div className="mb-1 text-xs text-warn">Hors de ton parcours</div>}
                          <AABlock aa={a} />
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function CompetencesView() {
  const { ref, progress, setShowOff } = useApp();
  const params = useSearchParams();
  const [open, setOpen] = useState<Set<string>>(() => new Set(params.get("open") ? [params.get("open")!] : []));
  useEffect(() => {
    const o = params.get("open");
    if (o) {
      setOpen((s) => new Set(s).add(o));
      setTimeout(() => document.getElementById(o)?.scrollIntoView({ behavior: "smooth", block: "start" }), 250);
    }
  }, [params]);
  const toggle = (code: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(code)) n.delete(code);
      else n.add(code);
      return n;
    });
  return (
    <div className="space-y-5">
      <header>
        <h1 className="h1">Compétences, RA et AA</h1>
        <p className="sub">
          Auto-évalue chaque critère PITCH : <b>En cours</b> = 50 %, <b>Maîtrisé</b> = 100 %. Un AA coché « Validé PITCH » compte à 100 %.{" "}
          {ref.meta.snapshot
            ? "Référentiel du 15/11 : lance une synchro PITCH pour la version à jour."
            : ref.meta.extractedAt && `Référentiel PITCH synchronisé le ${fmtDateTime(new Date(ref.meta.extractedAt))}.`}
        </p>
      </header>
      <div className="card flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Switch checked={progress.off} onChange={setShowOff} label="Afficher les AA hors de mon parcours (LV2 débutant, FLE)" />
        <div className="flex gap-2">
          <button className="btn text-xs" onClick={() => setOpen(new Set(ref.competences.filter((c) => !c.missing).map((c) => c.code)))}>
            Tout ouvrir
          </button>
          <button className="btn text-xs" onClick={() => setOpen(new Set())}>
            Tout fermer
          </button>
        </div>
      </div>
      <Stagger className="space-y-3">
        {ref.competences.map((c) => (
          <StaggerItem key={c.code}>{c.missing ? <MissingCompetence c={c} /> : <CompetenceCard c={c} open={open.has(c.code)} onToggle={() => toggle(c.code)} />}</StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}
