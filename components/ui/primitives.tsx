"use client";
import { motion } from "motion/react";
import type { CSSProperties, ReactNode } from "react";
import { courseHue } from "@/lib/courses";
import { STATE_LABEL, type State } from "@/lib/progress";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/* ---------- Mouvement : discret, 150–200 ms ---------- */
const list = { hidden: {}, show: { transition: { staggerChildren: 0.025 } } };
const item = { hidden: { opacity: 0, y: 4 }, show: { opacity: 1, y: 0, transition: { duration: 0.18, ease: [0.2, 0.8, 0.2, 1] as const } } };
export function Stagger({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <motion.div className={className} variants={list} initial="hidden" animate="show">
      {children}
    </motion.div>
  );
}
export function StaggerItem({ className, children, style }: { className?: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <motion.div className={className} style={style} variants={item}>
      {children}
    </motion.div>
  );
}

/* ---------- Section : étiquette + filet ---------- */
export function Section({
  label,
  action,
  children,
  className,
  id,
}: {
  label: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cx("min-w-0", className)}>
      <div className="flex min-h-9 items-end justify-between gap-3 border-b border-line-strong pb-2">
        <h2 className="t-label">{label}</h2>
        {action && <div className="flex items-center gap-2 text-[12px]">{action}</div>}
      </div>
      {children}
    </section>
  );
}

/* ---------- Barre fine avec seuil ---------- */
export function Bar({ value, threshold, state, className }: { value: number | null; threshold?: number; state?: State; className?: string }) {
  const st = state ?? (value == null ? "pending" : threshold != null && value >= threshold ? "validated" : value >= 0.999 ? "validated" : "progress");
  return (
    <div className={cx("relative h-[3px] w-full rounded-full bg-line", `st-${st}`, className)}>
      {value != null && (
        <motion.div
          className="h-full rounded-full"
          style={{ background: st === "progress" ? "var(--fg)" : "var(--st)" }}
          initial={false}
          animate={{ width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%` }}
          transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
        />
      )}
      {threshold != null && (
        <span className="absolute -top-[3px] h-[9px] w-px bg-fg/60" style={{ left: `${threshold * 100}%` }} title={`Seuil PITCH ${Math.round(threshold * 100)} %`} />
      )}
    </div>
  );
}

/** Pourcentage officiel ou « — » s'il n'y a pas de donnée */
export function Pct({ value, className }: { value: number | null; className?: string }) {
  return <span className={cx("num", value == null && "text-faint", className)}>{value == null ? "—" : `${Math.round(value * 100)} %`}</span>;
}

/* ---------- État officiel ---------- */
export function StateTag({ state, className, short = false }: { state: State; className?: string; short?: boolean }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 text-[12px] whitespace-nowrap", `st-${state}`, className)}>
      <span className={cx("st-dot", `st-${state}`)} />
      {!short && <span className={cx("st-text", `st-${state}`)}>{STATE_LABEL[state]}</span>}
    </span>
  );
}

/* ---------- Sélecteur segmenté ---------- */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  id,
  className,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; icon?: ReactNode }[];
  id: string;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div role="tablist" aria-label={id} className={cx("inline-flex rounded-md border border-line-strong p-0.5", className)}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={cx(
              "relative flex cursor-pointer items-center gap-1.5 rounded-[4px] font-medium transition-colors duration-150",
              size === "sm" ? "min-h-7 px-2 text-[12px]" : "min-h-8 px-2.5 text-[13px]",
              on ? "text-fg" : "text-muted hover:text-fg",
            )}
          >
            {on && <motion.span layoutId={`seg-${id}`} className="absolute inset-0 rounded-[4px] bg-hover" transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }} />}
            <span className="relative flex items-center gap-1.5">
              {o.icon}
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Interrupteur ---------- */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  return (
    <label className="inline-flex min-h-9 cursor-pointer items-center gap-2.5 text-[13px] select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx("relative h-5 w-9 shrink-0 cursor-pointer rounded-full border transition-colors duration-150", checked ? "border-accent bg-accent" : "border-line-strong bg-hover")}
      >
        <motion.span
          className={cx("absolute top-[2px] left-[2px] h-3.5 w-3.5 rounded-full", checked ? "bg-accent-fg" : "bg-muted")}
          animate={{ x: checked ? 16 : 0 }}
          transition={{ duration: 0.15 }}
        />
      </button>
      <span>{label}</span>
    </label>
  );
}

/* ---------- Couleur de cours (discrète) ---------- */
export const hueStyle = (key: string | null | undefined): CSSProperties | undefined => (key ? ({ "--h": courseHue(key) } as CSSProperties) : undefined);

export function CourseDot({ code, className }: { code: string | null | undefined; className?: string }) {
  return <span className={cx("inline-block h-2 w-2 shrink-0 rounded-[2px]", code ? "cc-solid" : "bg-line-strong", className)} style={hueStyle(code)} />;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-[13px] text-muted">{children}</p>;
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}

/** En-tête de page : titre serif + sous-titre */
export function PageHeader({ title, sub, action }: { title: ReactNode; sub?: ReactNode; action?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pb-6">
      <div className="min-w-0">
        <h1 className="t-page">{title}</h1>
        {sub && <p className="mt-1.5 max-w-[68ch] text-[13px] text-muted">{sub}</p>}
      </div>
      {action}
    </header>
  );
}
