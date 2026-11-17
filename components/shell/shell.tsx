"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState, type ReactNode } from "react";
import { BookOpen, CalendarDays, FileText, Home, Layers, Monitor, Moon, RefreshCw, Search, Sun } from "lucide-react";
import { ago } from "@/lib/dates";
import { useApp } from "@/components/providers/app-provider";
import { cx } from "@/components/ui/primitives";
import { CommandPaletteProvider, useCommandPalette } from "./command-palette";
import { GradientField } from "@/components/ui/gradient-field";

const NAV = [
  { href: "/", label: "Aujourd'hui", icon: Home },
  { href: "/competences", label: "Compétences", icon: Layers },
  { href: "/cours", label: "Cours", icon: BookOpen },
  { href: "/planning", label: "Planning", icon: CalendarDays },
  { href: "/fiches", label: "Fiches", icon: FileText },
  { href: "/synchro", label: "Synchro", icon: RefreshCw },
] as const;
const MOBILE_TABS = NAV.slice(0, 5);

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));

/** Marque : mot-symbole en serif */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cx("font-serif text-[22px] leading-none tracking-[-0.02em]", className)}>
      Carnet<span className="text-accent">.</span>
    </span>
  );
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const opts = [
    { v: "light", icon: Sun, label: "Clair" },
    { v: "dark", icon: Moon, label: "Sombre" },
    { v: "system", icon: Monitor, label: "Système" },
  ] as const;
  if (compact) {
    const cur = mounted ? theme : "system";
    const i = Math.max(0, opts.findIndex((o) => o.v === cur));
    const next = opts[(i + 1) % opts.length]!;
    const Icon = opts[i]!.icon;
    return (
      // Désactivé tant que le thème réel n'est pas connu (avant l'hydratation, un clic partirait du mauvais état)
      <button className="btn-ghost h-11 w-11 p-0" disabled={!mounted} onClick={() => setTheme(next.v)} aria-label={`Thème : passer en ${next.label.toLowerCase()}`}>
        <Icon className="h-[18px] w-[18px]" />
      </button>
    );
  }
  return (
    <div className="flex gap-0.5" role="radiogroup" aria-label="Thème">
      {opts.map((o) => {
        const on = mounted && theme === o.v;
        return (
          <button
            key={o.v}
            role="radio"
            aria-checked={on}
            aria-label={o.label}
            title={o.label}
            onClick={() => setTheme(o.v)}
            className={cx("grid h-8 w-8 cursor-pointer place-items-center rounded-md transition-colors duration-150", on ? "bg-hover text-fg" : "text-muted hover:text-fg")}
          >
            <o.icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}

/** Fraîcheur des données + état de l'enregistrement */
export function Freshness({ className }: { className?: string }) {
  const { ref, planning, saveState, status, now } = useApp();
  const pitchAt = ref.meta.receivedAt || ref.meta.extractedAt;
  const stale = !pitchAt || ref.meta.snapshot || now.getTime() - new Date(pitchAt).getTime() > 7 * 864e5;
  const save =
    !status.store ? "Sur cet appareil" : saveState === "saving" ? "Enregistrement…" : saveState === "error" ? "Hors ligne, enregistré localement" : "Enregistré";
  return (
    <div className={cx("space-y-1 text-[12px] leading-tight", className)} aria-live="polite">
      <Link href="/synchro" className="flex items-center gap-1.5 hover:text-fg">
        <span className={cx("st-dot", stale ? "st-failed" : "st-validated")} />
        <span className={stale ? "text-warn" : "text-muted"}>
          PITCH {ref.meta.snapshot ? "· instantané 15/11" : pitchAt ? ago(new Date(pitchAt), now) : "jamais"}
        </span>
      </Link>
      <div className="flex items-center gap-1.5 text-muted">
        <span className={cx("st-dot", planning.source === "live" ? "st-validated" : "st-failed")} />
        Planning {planning.source === "live" ? ago(new Date(planning.fetchedAt), now) : planning.source === "cache" ? "· dernière version" : "· instantané"}
      </div>
      <div className={cx("text-faint", saveState === "error" && "text-bad")}>{save}</div>
    </div>
  );
}

function SearchButton({ className }: { className?: string }) {
  const { open } = useCommandPalette();
  return (
    <button onClick={open} className={cx("flex min-h-9 w-full cursor-pointer items-center gap-2 rounded-md border border-line-strong px-2.5 text-[13px] text-muted transition-colors duration-150 hover:bg-hover hover:text-fg", className)}>
      <Search className="h-3.5 w-3.5" />
      <span className="flex-1 text-left">Rechercher</span>
      <kbd className="kbd">⌘K</kbd>
    </button>
  );
}

function MobileSearch() {
  const { open } = useCommandPalette();
  return (
    <button className="btn-ghost h-11 w-11 p-0" onClick={open} aria-label="Rechercher">
      <Search className="h-[18px] w-[18px]" />
    </button>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  return (
    <CommandPaletteProvider>
      <div className="min-h-dvh">
        {/* Barre latérale (ordinateur) */}
        {/* Barre latérale (ordinateur) : panneau de taches floues, navigation en boutons empilés */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col overflow-hidden px-5 py-7 lg:flex">
          <GradientField />
          <Link href="/" className="relative text-[12px] font-semibold tracking-[0.12em] uppercase">
            Jo <span className="mx-1 text-muted">|</span> Carnet
          </Link>
          <SearchButton className="relative mt-8 bg-raised/80" />
          <nav className="relative mt-6 flex flex-col gap-2" aria-label="Navigation principale">
            {NAV.map((n) => {
              const on = isActive(path, n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={on ? "page" : undefined}
                  className={cx(
                    "flex min-h-10 items-center gap-2.5 rounded-lg border px-3.5 text-[11.5px] font-semibold tracking-[0.07em] uppercase transition-colors duration-150",
                    on ? "border-fg bg-fg text-bg" : "border-line-strong bg-raised/85 text-fg hover:border-fg",
                  )}
                >
                  <n.icon className="h-4 w-4" strokeWidth={1.75} />
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="relative mt-auto space-y-3 rounded-lg bg-raised/70 p-3">
            <Freshness />
            <ThemeToggle />
          </div>
        </aside>

        {/* Barre du haut (mobile) : bande de taches */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 overflow-hidden border-b border-line px-4 lg:hidden">
          <GradientField variant="band" />
          <Link href="/" aria-label="Accueil" className="relative text-[12px] font-semibold tracking-[0.12em] uppercase">
            Jo <span className="mx-1 text-muted">|</span> Carnet
          </Link>
          <div className="relative -mr-2 flex items-center">
            <MobileSearch />
            <Link href="/synchro" className={cx("btn-ghost h-11 w-11 p-0", isActive(path, "/synchro") && "text-accent")} aria-label="Synchronisation">
              <RefreshCw className="h-[18px] w-[18px]" />
            </Link>
            <ThemeToggle compact />
          </div>
        </header>

        <div className="lg:pl-64">
          <main className="mx-auto w-full max-w-[1120px] px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-16">{children}</main>
        </div>

        {/* Onglets (mobile), cibles de 56 px */}
        <nav aria-label="Navigation principale" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg pb-[env(safe-area-inset-bottom)] lg:hidden">
          <div className="mx-auto grid max-w-md grid-cols-5">
            {MOBILE_TABS.map((n) => {
              const on = isActive(path, n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={on ? "page" : undefined}
                  className={cx("flex h-14 flex-col items-center justify-center gap-1 text-[10.5px] transition-colors duration-150", on ? "text-fg" : "text-muted")}
                >
                  <n.icon className={cx("h-5 w-5", on && "text-accent")} strokeWidth={on ? 2 : 1.6} />
                  <span className={on ? "font-medium" : ""}>{n.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </CommandPaletteProvider>
  );
}
