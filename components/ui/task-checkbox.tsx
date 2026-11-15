"use client";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { cx } from "./primitives";

/** Coche ronde avec tracé animé et petite gerbe de particules */
export function TaskCheckbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  const reduce = useReducedMotion();
  const [burst, setBurst] = useState(0);
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        if (!checked) setBurst((b) => b + 1);
        onChange(!checked);
      }}
      className="relative grid h-6 w-6 shrink-0 cursor-pointer place-items-center"
    >
      <motion.span
        className={cx("absolute inset-0 rounded-full border-2", checked ? "border-transparent bg-gradient" : "border-muted/50 bg-card-strong")}
        animate={checked && !reduce ? { scale: [1, 0.8, 1.12, 1] } : { scale: 1 }}
        transition={{ duration: 0.4 }}
      />
      <svg viewBox="0 0 24 24" className="relative h-4 w-4" aria-hidden>
        <motion.path
          d="M5 12.5l4.2 4.2L19 7"
          fill="none"
          stroke="white"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={{ duration: 0.3, delay: checked ? 0.08 : 0 }}
        />
      </svg>
      <AnimatePresence>
        {!reduce && burst > 0 && checked && (
          <span key={burst} className="pointer-events-none absolute inset-0">
            {Array.from({ length: 8 }, (_, i) => {
              const a = (i / 8) * Math.PI * 2;
              return (
                <motion.span
                  key={i}
                  className="absolute top-1/2 left-1/2 h-1.5 w-1.5 rounded-full"
                  style={{ background: i % 2 ? "var(--a1)" : "var(--a2)", marginLeft: -3, marginTop: -3 }}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{ x: Math.cos(a) * 18, y: Math.sin(a) * 18, opacity: 0, scale: 0.4 }}
                  transition={{ duration: 0.55, ease: "easeOut" }}
                />
              );
            })}
          </span>
        )}
      </AnimatePresence>
    </button>
  );
}
