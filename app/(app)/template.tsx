"use client";
import { motion } from "motion/react";

/** Transition de page : fondu de 180 ms (sans transform ni filter, pour ne pas piéger les éléments `fixed`) */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}>
      {children}
    </motion.div>
  );
}
