"use client";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";
import { buildIndex, search, type SearchItem } from "@/lib/search";
import { useApp } from "@/components/providers/app-provider";
import { cx } from "@/components/ui/primitives";

const KIND: Record<SearchItem["kind"], string> = {
  page: "Page",
  competence: "Compétence",
  aa: "AA",
  critere: "Critère",
  cours: "Cours",
  fiche: "Fiche",
};

const Ctx = createContext<{ open: () => void }>({ open: () => {} });
export const useCommandPalette = () => useContext(Ctx);

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "/" && !/input|textarea|select/i.test((e.target as HTMLElement)?.tagName ?? "")) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  const value = useMemo(() => ({ open: () => setOpen(true) }), []);
  return (
    <Ctx.Provider value={value}>
      {children}
      <Palette open={open} onClose={() => setOpen(false)} />
    </Ctx.Provider>
  );
}

function Palette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { ref } = useApp();
  const router = useRouter();
  const index = useMemo(() => buildIndex(ref), [ref]);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const results = useMemo(() => search(index, q), [index, q]);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (open) {
      setQ("");
      setSel(0);
      setTimeout(() => input.current?.focus(), 10);
    }
  }, [open]);
  useEffect(() => setSel(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-i="${sel}"]`)?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  const go = useCallback(
    (it: SearchItem | undefined) => {
      if (!it) return;
      onClose();
      router.push(it.href);
    },
    [onClose, router],
  );

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-start justify-center bg-black/25 px-3 pt-[10vh] dark:bg-black/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Recherche"
            className="w-full max-w-xl overflow-hidden rounded-lg border border-line-strong bg-raised shadow-[0_16px_48px_-12px_rgb(0_0_0/0.3)]"
            initial={{ y: -6, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -6, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="flex items-center gap-2.5 border-b border-line px-4">
              <Search className="h-4 w-4 shrink-0 text-muted" />
              <input
                ref={input}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setSel((s) => Math.min(results.length - 1, s + 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setSel((s) => Math.max(0, s - 1));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    go(results[sel]);
                  } else if (e.key === "Escape") onClose();
                }}
                placeholder="Code (I4.7.MEO.02, AA-…, CRIT_…) ou mot-clé"
                aria-label="Rechercher"
                className="h-12 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-faint"
              />
              <kbd className="kbd">Échap</kbd>
            </div>
            <ul ref={listRef} className="max-h-[60vh] overflow-y-auto py-1" role="listbox">
              {results.length === 0 && <li className="px-4 py-6 text-[13px] text-muted">Aucun résultat pour « {q} ».</li>}
              {results.map((it, i) => (
                <li
                  key={it.kind + it.href + it.title}
                  data-i={i}
                  role="option"
                  aria-selected={i === sel}
                  onMouseMove={() => setSel(i)}
                  onClick={() => go(it)}
                  className={cx("flex min-h-11 cursor-pointer items-center gap-3 px-4 py-1.5", i === sel && "bg-hover")}
                >
                  <span className="w-[72px] shrink-0 text-[11px] text-faint">{KIND[it.kind]}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px]">{it.title}</span>
                    {(it.code || it.hint) && <span className="t-code block truncate">{[it.code, it.hint].filter(Boolean).join(" · ")}</span>}
                  </span>
                  {i === sel && <kbd className="kbd hidden sm:inline-flex">↵</kbd>}
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
