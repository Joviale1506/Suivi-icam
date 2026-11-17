"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, type KeyboardEvent, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Info, Search } from "lucide-react";
import { MISSING_COMPETENCES, PROFILE } from "@/config/profile";
import type { AA, Competence, Criterion } from "@/lib/types";
import { aaOfficial, aaState, compAAs, compOfficial, compState, critId, critState, isFeelingReady, type State } from "@/lib/progress";
import { moduleOf, slotsFor } from "@/lib/activities";
import { COURSES, courseHref } from "@/lib/courses";
import { ago, fmtDay } from "@/lib/dates";
import { useApp } from "@/components/providers/app-provider";
import { useCommandPalette } from "@/components/shell/command-palette";
import { Bar, Empty, Pct, StateTag, Switch, cx } from "@/components/ui/primitives";

type Scope = "semester" | "all";
interface Filters {
  module: string;
  course: string;
  period: string;
  status: "" | State;
  scope: Scope;
}

/* ---------- État dans l'URL : sélection + filtres (partageable, conservé au retour) ---------- */
function useUrlState() {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const get = (k: string) => params.get(k) ?? "";
  const set = useCallback(
    (patch: Record<string, string | null>) => {
      const p = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v == null || v === "") p.delete(k);
        else p.set(k, v);
      }
      router.replace(`${path}?${p.toString()}`, { scroll: false });
    },
    [params, router, path],
  );
  const filters: Filters = {
    module: get("module"),
    course: get("cours"),
    period: get("periode"),
    status: get("statut") as Filters["status"],
    scope: get("portee") === "tout" ? "all" : "semester",
  };
  return { c: get("c"), aa: get("aa"), k: get("k"), filters, set };
}

/* ---------- Liste au clavier (↑ ↓, → / Entrée pour descendre, ← / Échap pour remonter) ---------- */
function KeyList({
  label,
  ids,
  selected,
  onSelect,
  onForward,
  onBack,
  children,
  listRef,
}: {
  label: string;
  ids: string[];
  selected: string;
  onSelect: (id: string) => void;
  onForward?: () => void;
  onBack?: () => void;
  children: ReactNode;
  listRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const onKey = (e: KeyboardEvent) => {
    const i = ids.indexOf(selected);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      onSelect(ids[Math.min(ids.length - 1, i + 1)] ?? ids[0]!);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      onSelect(ids[Math.max(0, i - 1)] ?? ids[0]!);
    } else if ((e.key === "ArrowRight" || e.key === "Enter") && onForward) {
      e.preventDefault();
      onForward();
    } else if ((e.key === "ArrowLeft" || e.key === "Escape") && onBack) {
      e.preventDefault();
      onBack();
    }
  };
  return (
    <div ref={listRef} role="listbox" aria-label={label} tabIndex={0} onKeyDown={onKey} className="outline-none focus-visible:ring-2 focus-visible:ring-accent/40">
      {children}
    </div>
  );
}

function ColumnHead({ title, count, back }: { title: ReactNode; count?: ReactNode; back?: () => void }) {
  return (
    <div className="sticky top-14 z-10 flex min-h-11 items-center gap-2 border-b border-line-strong bg-bg lg:top-0">
      {back && (
        <button onClick={back} className="btn-ghost -ml-2 h-11 w-11 p-0 lg:hidden" aria-label="Retour">
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      <h2 className="t-label min-w-0 flex-1 truncate">{title}</h2>
      {count != null && <span className="num text-[12px] text-muted">{count}</span>}
    </div>
  );
}

/* ---------- Colonne 1 : compétences ---------- */
function CompetenceItem({ c, on, onClick, aas }: { c: Competence; on: boolean; onClick: () => void; aas: AA[] }) {
  if (c.missing)
    return (
      <div className="border-b border-line py-3 opacity-60" title="Pas de RA dans PITCH pour le CP_FISE">
        <div className="flex items-baseline gap-2">
          <span className="t-code">{c.code}</span>
          <span className="chip">hors PITCH</span>
        </div>
        <p className="mt-1 line-clamp-2 text-[12.5px] text-muted">{c.title}</p>
      </div>
    );
  const p = compOfficial(c);
  const demo = aas.filter((a) => aaState(a) === "validated").length;
  return (
    <button
      role="option"
      aria-selected={on}
      onClick={onClick}
      className={cx("relative w-full cursor-pointer border-b border-line py-3 pr-2 pl-3 text-left transition-colors duration-150", on ? "bg-hover" : "hover:bg-hover/60")}
    >
      {on && <span className="absolute inset-y-0 left-0 w-[2px] bg-accent" />}
      <div className="flex items-baseline justify-between gap-2">
        <span className="t-code text-fg">{c.code}</span>
        <Pct value={p} className="text-[12.5px]" />
      </div>
      <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug">{c.title}</p>
      <div className="mt-2 flex items-center gap-3">
        <Bar value={p} threshold={c.min / 100} state={compState(c)} className="flex-1" />
        <span className="num shrink-0 text-[11.5px] text-muted">
          {demo}/{aas.length} AA
        </span>
      </div>
    </button>
  );
}

/* ---------- Colonne 2 : AA ---------- */
function AAItem({ a, on, onClick }: { a: AA; on: boolean; onClick: () => void }) {
  const p = aaOfficial(a);
  const st = aaState(a);
  return (
    <button
      role="option"
      aria-selected={on}
      onClick={onClick}
      className={cx("relative w-full cursor-pointer border-b border-line py-3 pr-2 pl-3 text-left transition-colors duration-150", on ? "bg-hover" : "hover:bg-hover/60")}
    >
      {on && <span className="absolute inset-y-0 left-0 w-[2px] bg-accent" />}
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-[13.5px] leading-snug">{a.title}</p>
        <Pct value={p} className="shrink-0 text-[12.5px]" />
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <StateTag state={st} />
        <span className="t-code truncate">
          {a.code}
          {a.sem && ` · ${a.sem}`}
        </span>
      </div>
      {a.off && <p className="mt-1 text-[11.5px] text-warn">Hors de ton parcours</p>}
    </button>
  );
}

/* ---------- Colonne 3 : critères et itérations ---------- */
function CriterionBlock({ a, c, i, focus }: { a: AA; c: Criterion; i: number; focus: boolean }) {
  const { events, now, progress, setCrit, cname } = useApp();
  const id = critId(a, i);
  const ready = isFeelingReady(progress, id);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focus) ref.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focus]);
  const st = critState(c);
  return (
    <div ref={ref} className={cx("border-b border-line py-4", focus && "bg-accent/[0.04]")}>
      <div className="flex items-start gap-3">
        <StateTag state={st} short className="mt-1.5" />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] leading-snug">{c.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            {c.code && <span className="t-code">{c.code}</span>}
            <span className={cx("text-[12px] st-text", `st-${st}`)}>{STATE_TEXT[st]}</span>
            {c.mandatory && <span className="chip border-warn text-warn">obligatoire</span>}
          </div>
        </div>
      </div>

      {/* Itérations : une ligne par activité évaluatrice */}
      <div className="mt-3 ml-5 border-l border-line pl-3">
        {c.evals.length ? (
          c.evals.map((ev, j) => {
            const { slots, confidence } = slotsFor(ev, events);
            const upcoming = slots.filter((s) => s.end > now);
            const past = slots.filter((s) => s.end <= now);
            const slot = ev.status === "pending" ? (upcoming[0] ?? past.at(-1)) : (past.at(-1) ?? upcoming[0]);
            return (
              <div key={j} className="flex min-h-9 flex-wrap items-center gap-x-2.5 gap-y-0.5 py-1 text-[12.5px]">
                <StateTag state={ev.status === "validated" ? "validated" : ev.status === "failed" ? "failed" : ev.status === "evaluated" ? "progress" : "pending"} short />
                <Link href={courseHref(ev.course, "cours")} className="hover:underline">
                  {COURSES[ev.course] ? cname(ev.course) : ev.courseTitle ?? ev.course}
                </Link>
                <span className="t-code">{ev.course}</span>
                {ev.modality && <span className="text-muted">· {ev.modality}</span>}
                {ev.period && <span className="t-code">· {ev.period}</span>}
                {slot ? (
                  <span className={cx("num", slot.end > now ? "text-accent" : "text-muted")}>
                    · {fmtDay.format(slot.start)}
                    {confidence === "likely" && <span title="Correspondance probable (ajustable dans config/activity-map.ts)"> ?</span>}
                  </span>
                ) : (
                  <span className="text-faint">· date inconnue</span>
                )}
                {(ev.rawStatus || ev.note) && (
                  <span className="text-muted">
                    · {[ev.rawStatus, ev.note].filter(Boolean).join(" · ")}
                  </span>
                )}
                {ev.comment && <span className="basis-full pl-4 text-[12px] text-muted italic">« {ev.comment} »</span>}
              </div>
            );
          })
        ) : (
          <p className="py-1 text-[12.5px] text-muted">Activité non détaillée dans PITCH (hors de ton parcours langues ?).</p>
        )}
      </div>

      {/* Auto-évaluation secondaire, jamais comptée */}
      <label className="mt-2 ml-5 inline-flex min-h-9 cursor-pointer items-center gap-2 text-[12.5px] text-muted">
        <input type="checkbox" checked={ready} onChange={(e) => setCrit(id, e.target.checked ? 2 : 0)} className="h-4 w-4 accent-[var(--accent)]" />
        Je me sens prête sur ce critère
        <span className="text-faint">(personnel, hors pourcentage)</span>
      </label>
    </div>
  );
}

const STATE_TEXT: Record<State, string> = {
  validated: "Validé officiellement",
  progress: "Évalué, résultat à confirmer",
  failed: "Évalué, non validé : à rattraper",
  pending: "Non évalué",
};

/* ---------- Filtres ---------- */
function FilterBar({ filters, set, modules, periods }: { filters: Filters; set: (p: Record<string, string | null>) => void; modules: string[]; periods: string[] }) {
  const { open } = useCommandPalette();
  const sel = "input min-h-9 w-auto py-0 pr-7 text-[13px]";
  const any = filters.module || filters.course || filters.period || filters.status;
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line pb-4">
      <button onClick={open} className="btn text-muted">
        <Search className="h-3.5 w-3.5" /> Rechercher <kbd className="kbd ml-1 hidden sm:inline-flex">⌘K</kbd>
      </button>
      <select aria-label="Module" className={sel} value={filters.module} onChange={(e) => set({ module: e.target.value })}>
        <option value="">Module</option>
        {modules.map((m) => (
          <option key={m}>{m}</option>
        ))}
      </select>
      <select aria-label="Cours" className={cx(sel, "max-w-44")} value={filters.course} onChange={(e) => set({ cours: e.target.value })}>
        <option value="">Cours</option>
        {Object.entries(COURSES).map(([k, v]) => (
          <option key={k} value={k}>
            {v.n}
          </option>
        ))}
      </select>
      <select aria-label="Période" className={sel} value={filters.period} onChange={(e) => set({ periode: e.target.value })}>
        <option value="">Période</option>
        {periods.map((p) => (
          <option key={p}>{p}</option>
        ))}
      </select>
      <select aria-label="Statut" className={sel} value={filters.status} onChange={(e) => set({ statut: e.target.value })}>
        <option value="">Statut</option>
        <option value="validated">Validé</option>
        <option value="progress">En cours</option>
        <option value="failed">À rattraper</option>
        <option value="pending">Non évalué</option>
      </select>
      <div role="tablist" aria-label="Portée" className="inline-flex rounded-md border border-line-strong p-0.5">
        {(
          [
            ["semester", "Ce semestre"],
            ["all", "Tout le diplôme"],
          ] as const
        ).map(([v, l]) => (
          <button
            key={v}
            role="tab"
            aria-selected={filters.scope === v}
            onClick={() => set({ portee: v === "all" ? "tout" : null })}
            className={cx("min-h-8 cursor-pointer rounded-[4px] px-2.5 text-[13px] transition-colors duration-150", filters.scope === v ? "bg-hover text-fg" : "text-muted hover:text-fg")}
          >
            {l}
          </button>
        ))}
      </div>
      {any && (
        <button className="btn-ghost" onClick={() => set({ module: null, cours: null, periode: null, statut: null })}>
          Effacer les filtres
        </button>
      )}
    </div>
  );
}

/* ---------- Vue ---------- */
export function CompetencesView() {
  const { ref, progress, setShowOff, now } = useApp();
  const { c: selC, aa: selAA, k, filters, set } = useUrlState();

  const modules = useMemo(() => [...new Set(ref.aaList.map((a) => moduleOf(a.code)).filter((m): m is string => !!m))].sort(), [ref]);
  const periods = useMemo(() => [...new Set([...ref.meta.periods, ...ref.aaList.flatMap((a) => a.periods)])].sort(), [ref]);

  const aaMatches = useCallback(
    (a: AA) => {
      if (a.off && !progress.off) return false;
      if (filters.scope === "semester" && a.periods.length && !a.periods.includes(PROFILE.currentPeriod)) return false;
      if (filters.module && moduleOf(a.code) !== filters.module && !a.courses.some((c) => moduleOf(c) === filters.module)) return false;
      if (filters.course && !a.courses.includes(filters.course)) return false;
      if (filters.period && !a.periods.includes(filters.period)) return false;
      if (filters.status && aaState(a) !== filters.status && !a.crit.some((c) => critState(c) === filters.status)) return false;
      return true;
    },
    [filters, progress.off],
  );

  const visibleAAs = (c: Competence) => c.ra.flatMap((r) => r.aa).filter(aaMatches);
  const comps = ref.competences.filter((c) => c.missing || visibleAAs(c).length > 0);
  const comp = ref.competences.find((c) => c.code === selC && !c.missing);
  const aas = comp ? visibleAAs(comp) : [];
  const aa = aas.find((a) => a.code === selAA);
  const crits = aa ? aa.crit.map((c, i) => ({ c, i })).filter(({ c }) => !filters.status || critState(c) === filters.status || aaState(aa) === filters.status) : [];

  // Ordinateur : sélectionne la première compétence si rien n'est choisi
  useEffect(() => {
    if (!selC && window.matchMedia("(min-width: 1024px)").matches) {
      const first = comps.find((c) => !c.missing);
      if (first) set({ c: first.code });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selC]);

  const col2 = useRef<HTMLDivElement>(null);
  const col3 = useRef<HTMLDivElement>(null);
  const depth = aa ? 2 : comp ? 1 : 0;
  const pitchAt = ref.meta.receivedAt || ref.meta.extractedAt;

  const column1 = (
    <KeyList
      label="Compétences"
      ids={comps.filter((c) => !c.missing).map((c) => c.code)}
      selected={selC}
      onSelect={(id) => set({ c: id, aa: null, k: null })}
      onForward={() => {
        if (aas[0]) set({ aa: aa?.code ?? aas[0].code });
        setTimeout(() => col2.current?.focus(), 30);
      }}
    >
      {comps.map((c) => (
        <CompetenceItem key={c.code} c={c} aas={compAAs(c)} on={c.code === selC} onClick={() => set({ c: c.code, aa: null, k: null })} />
      ))}
    </KeyList>
  );
  const column2 = comp ? (
    <KeyList
      label="Acquis d'apprentissage"
      listRef={col2}
      ids={aas.map((a) => a.code)}
      selected={selAA}
      onSelect={(id) => set({ aa: id, k: null })}
      onForward={() => setTimeout(() => col3.current?.focus(), 30)}
      onBack={() => set({ aa: null, k: null })}
    >
      {aas.map((a) => (
        <AAItem key={a.code} a={a} on={a.code === selAA} onClick={() => set({ aa: a.code, k: null })} />
      ))}
      {!aas.length && <Empty>Aucun AA ne correspond aux filtres.</Empty>}
    </KeyList>
  ) : (
    <Empty>Choisis une compétence.</Empty>
  );
  const column3 = aa ? (
    <div ref={col3} tabIndex={-1} className="outline-none">
      <div className="border-b border-line py-3">
        <p className="t-title">{aa.title}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <StateTag state={aaState(aa)} />
          <Pct value={aaOfficial(aa)} className="text-[13px]" />
          {aa.nbTotal != null && (
            <span className="num text-[12px] text-muted">
              {aa.nbA ?? 0}/{aa.nbTotal} critères acquis
            </span>
          )}
          <span className="t-code">{aa.code}</span>
        </div>
        <p className="mt-2 text-[12px] text-muted">RA · {ref.ra[aa.ra]?.title}</p>
      </div>
      {crits.map(({ c, i }) => (
        <CriterionBlock key={i} a={aa} c={c} i={i} focus={k === String(i)} />
      ))}
      {!crits.length && <Empty>Aucun critère ne correspond au filtre de statut.</Empty>}
    </div>
  ) : comp ? (
    <Empty>Choisis un AA pour voir ses critères et leurs évaluations.</Empty>
  ) : null;

  const missingNote = comp ? null : (
    <p className="mt-4 flex gap-2 text-[12px] text-muted">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      C02 et C12 font partie du référentiel ICAM mais n&apos;ont aucun RA dans PITCH pour le CP_FISE. {MISSING_COMPETENCES.C12?.hint}
    </p>
  );

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 pb-5">
        <div>
          <h1 className="t-page">Compétences</h1>
          <p className="mt-1.5 text-[13px] text-muted">
            Progression officielle PITCH ·{" "}
            {ref.meta.snapshot ? "instantané du 15/11, sans résultats : lance une synchro" : pitchAt ? `synchro ${ago(new Date(pitchAt), now)}` : "jamais synchronisé"}
          </p>
        </div>
        <Switch checked={progress.off} onChange={setShowOff} label="AA hors parcours" />
      </header>
      <FilterBar filters={filters} set={set} modules={modules} periods={periods} />

      {/* Ordinateur : 3 colonnes liées */}
      <div className="mt-2 hidden grid-cols-[minmax(0,15rem)_minmax(0,19rem)_minmax(0,1fr)] gap-6 lg:grid">
        <div className="min-w-0">
          <ColumnHead title="Compétence" count={comps.filter((c) => !c.missing).length} />
          {column1}
        </div>
        <div className="min-w-0">
          <ColumnHead title={comp ? `AA · ${comp.code}` : "AA"} count={comp ? aas.length : undefined} />
          {column2}
        </div>
        <div className="min-w-0">
          <ColumnHead title="Critères et évaluations" count={aa ? aa.crit.length : undefined} />
          {column3}
        </div>
      </div>

      {/* Mobile : pile, on glisse vers la droite pour remonter */}
      <div className="mt-2 lg:hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={depth}
            initial={{ x: 24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -24, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
            drag={depth > 0 ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: 0, right: 0.5 }}
            dragDirectionLock
            onDragEnd={(_, info) => {
              if (info.offset.x > 80) set(depth === 2 ? { aa: null, k: null } : { c: null, aa: null, k: null });
            }}
          >
            {depth === 0 && (
              <>
                <ColumnHead title="Compétence" count={comps.filter((c) => !c.missing).length} />
                {comps.map((c) =>
                  c.missing ? (
                    <CompetenceItem key={c.code} c={c} aas={[]} on={false} onClick={() => {}} />
                  ) : (
                    <MobileRow key={c.code} onClick={() => set({ c: c.code })}>
                      <CompetenceItem c={c} aas={compAAs(c)} on={false} onClick={() => set({ c: c.code })} />
                    </MobileRow>
                  ),
                )}
              </>
            )}
            {depth === 1 && comp && (
              <>
                <ColumnHead title={`${comp.code} · AA`} count={aas.length} back={() => set({ c: null, aa: null, k: null })} />
                <p className="border-b border-line py-3 text-[13px] text-muted">{comp.title}</p>
                {aas.map((a) => (
                  <MobileRow key={a.code} onClick={() => set({ aa: a.code })}>
                    <AAItem a={a} on={false} onClick={() => set({ aa: a.code })} />
                  </MobileRow>
                ))}
                {!aas.length && <Empty>Aucun AA ne correspond aux filtres.</Empty>}
              </>
            )}
            {depth === 2 && (
              <>
                <ColumnHead title={`${comp?.code} · critères`} count={aa?.crit.length} back={() => set({ aa: null, k: null })} />
                {column3}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      {missingNote}
    </div>
  );
}

function MobileRow({ children }: { children: ReactNode; onClick: () => void }) {
  return (
    <div className="relative [&>button]:pr-7">
      {children}
      <ChevronRight className="pointer-events-none absolute top-1/2 right-0 h-4 w-4 -translate-y-1/2 text-faint" />
    </div>
  );
}
