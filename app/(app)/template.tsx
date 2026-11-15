"use client";
import { motion } from "motion/react";

/** Transition de page (template : remonté à chaque navigation) */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </motion.div>
  );
}
