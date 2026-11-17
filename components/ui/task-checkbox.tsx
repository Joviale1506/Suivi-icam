"use client";
import { motion } from "motion/react";
import { cx } from "./primitives";

/** Case à cocher carrée, tracé de coche animé (150 ms), cible tactile de 44 px */
export function TaskCheckbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className="group -m-3 grid h-11 w-11 shrink-0 cursor-pointer place-items-center"
    >
      <span
        className={cx(
          "grid h-[18px] w-[18px] place-items-center rounded-[4px] border transition-colors duration-150",
          checked ? "border-ok bg-ok" : "border-line-strong bg-raised group-hover:border-muted",
        )}
      >
        <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden>
          <motion.path
            d="M3.5 8.5l3 3 6-7"
            fill="none"
            stroke="var(--bg)"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
            transition={{ duration: 0.18 }}
          />
        </svg>
      </span>
    </button>
  );
}
