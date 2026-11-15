"use client";
import { motion, animate, useInView, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { courseHue } from "@/lib/courses";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/* ---------- Carte (soulevée au survol) ---------- */
export function Card({ hover = false, className, children, ...rest }: HTMLMotionProps<"div"> & { hover?: boolean }) {
  return (
    <motion.div
      whileHover={hover ? { y: -3, boxShadow: "var(--shadow-lift)" } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={cx("card", className)}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/* ---------- Apparition en cascade ---------- */
const listVariants = { hidden: {}, show: { transition: { staggerChildren: 0.045, delayChildren: 0.03 } } };
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 380, damping: 32 } },
};
export function Stagger({ className, children, as = "div" }: { className?: string; children: ReactNode; as?: "div" | "ul" }) {
  const C = as === "ul" ? motion.ul : motion.div;
  return (
    <C className={className} variants={listVariants} initial="hidden" animate="show">
      {children}
    </C>
  );
}
export function StaggerItem({ className, children, ...rest }: HTMLMotionProps<"div">) {
  return (
    <motion.div className={className} variants={itemVariants} {...rest}>
      {children}
    </motion.div>
  );
}

/* ---------- Compteur animé ---------- */
export function AnimatedNumber({ value, suffix = "", className }: { value: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setShown(value);
      from.current = value;
      return;
    }
    const c = animate(from.current, value, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setShown(v),
    });
    from.current = value;
    return () => c.stop();
  }, [value, inView, reduce]);
  return (
    <span ref={ref} className={cx("tabular-nums", className)}>
      {Math.round(shown)}
      {suffix}
    </span>
  );
}

/* ---------- Anneau de progression ---------- */
export function ProgressRing({
  value,
  size = 72,
  stroke = 7,
  threshold,
  label,
  className,
  gradientId,
}: {
  value: number; // 0..1
  size?: number;
  stroke?: number;
  threshold?: number; // 0..1
  label?: ReactNode;
  className?: string;
  gradientId: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ok = threshold != null && value >= threshold;
  const angle = threshold != null ? threshold * 2 * Math.PI - Math.PI / 2 : 0;
  return (
    <div className={cx("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={ok ? "var(--ok)" : "var(--a1)"} />
            <stop offset="100%" stopColor={ok ? "var(--ok)" : "var(--a2)"} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--soft)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - Math.min(1, Math.max(0, value))) }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      {threshold != null && (
        <span
          className="absolute h-2 w-0.5 rounded bg-muted/70"
          style={{
            left: size / 2 + Math.cos(angle) * r - 1,
            top: size / 2 + Math.sin(angle) * r - 4,
            transform: `rotate(${(angle * 180) / Math.PI + 90}deg)`,
          }}
          title={`Seuil ${Math.round(threshold * 100)} %`}
        />
      )}
      <div className="absolute inset-0 grid place-items-center text-center">{label}</div>
    </div>
  );
}

/* ---------- Barre de progression (avec repère de seuil) ---------- */
export function ProgressBar({ value, threshold, className }: { value: number; threshold?: number; className?: string }) {
  const ok = threshold != null ? value >= threshold : value >= 0.999;
  return (
    <div className={cx("relative h-2 rounded-full bg-soft", className)}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: ok ? "var(--ok)" : "linear-gradient(90deg, var(--a1), var(--a2))" }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.round(Math.min(1, value) * 100)}%` }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      />
      {threshold != null && (
        <span className="absolute -top-1 h-4 w-0.5 rounded bg-muted/60" style={{ left: `${threshold * 100}%` }} title={`Seuil ${Math.round(threshold * 100)} %`} />
      )}
    </div>
  );
}

/* ---------- Sélecteur segmenté animé ---------- */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  id,
  size = "md",
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; icon?: ReactNode }[];
  id: string;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div role="tablist" className={cx("inline-flex rounded-xl border border-line bg-soft/60 p-1", className)}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={cx(
              "relative flex items-center gap-1.5 rounded-lg font-medium transition-colors cursor-pointer",
              size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
              on ? "text-fg" : "text-muted hover:text-fg",
            )}
          >
            {on && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-lg bg-card-strong shadow-soft ring-1 ring-line"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
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
    <label className="inline-flex cursor-pointer select-none items-center gap-3 text-sm">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx("relative h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer", checked ? "bg-gradient" : "bg-soft ring-1 ring-line")}
      >
        <motion.span
          className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow"
          animate={{ x: checked ? 20 : 0 }}
          transition={{ type: "spring", stiffness: 600, damping: 35 }}
        />
      </button>
      <span>{label}</span>
    </label>
  );
}

/* ---------- Couleur de cours ---------- */
export const hueStyle = (key: string | null | undefined): CSSProperties | undefined =>
  key ? ({ "--h": courseHue(key) } as CSSProperties) : undefined;

export function CourseDot({ code, className }: { code: string | null | undefined; className?: string }) {
  return <span className={cx("inline-block h-2.5 w-2.5 shrink-0 rounded-full", code ? "cc-solid" : "bg-muted/50", className)} style={hueStyle(code)} />;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">{children}</div>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold tracking-tight">{children}</h2>
      {action}
    </div>
  );
}
