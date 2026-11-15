"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { useTheme } from "next-themes";
import { useEffect, useState, type ReactNode } from "react";
import { BookOpen, CalendarDays, CloudOff, FileText, GraduationCap, LayoutDashboard, Loader2, Monitor, Moon, RefreshCw, Sun, Check, TriangleAlert } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { cx } from "@/components/ui/primitives";

const NAV = [
  { href: "/", label: "Tableau de bord", short: "Accueil", icon: LayoutDashboard },
  { href: "/competences", label: "Compétences", short: "Compét.", icon: GraduationCap },
  { href: "/cours", label: "Cours", short: "Cours", icon: BookOpen },
  { href: "/planning", label: "Planning", short: "Planning", icon: CalendarDays },
  { href: "/fiches", label: "Fiches", short: "Fiches", icon: FileText },
  { href: "/synchro", label: "Synchro", short: "Synchro", icon: RefreshCw },
] as const;
const MOBILE_TABS = NAV.slice(0, 5);

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));

export function Logo() {
  return (
    <span className="bg-gradient grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white shadow-lift">
      <svg viewBox="0 0 64 64" className="h-6 w-6" aria-hidden>
        <path d="M10 26 32 15l22 11-22 11z" fill="currentColor" />
        <path d="M19 32v9c0 3.5 6 7.5 13 7.5S45 44.5 45 41v-9l-13 6.5z" fill="currentColor" opacity=".8" />
      </svg>
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
    const i = opts.findIndex((o) => o.v === cur);
    const next = opts[(i + 1) % opts.length]!;
    const Icon = (opts[i] ?? opts[2]).icon;
    return (
      // Désactivé tant que le thème réel n'est pas connu (avant l'hydratation, un clic partirait du mauvais état)
      <button className="btn h-9 w-9 p-0" disabled={!mounted} onClick={() => setTheme(next.v)} aria-label={`Thème : passer en ${next.label.toLowerCase()}`}>
        <motion.span key={cur} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}>
          <Icon className="h-4 w-4" />
        </motion.span>
      </button>
    );
  }
  return (
    <div className="flex rounded-xl border border-line bg-soft/60 p-1" role="radiogroup" aria-label="Thème">
      {opts.map((o) => {
        const on = mounted && theme === o.v;
        return (
          <button
            key={o.v}
            role="radio"
            aria-checked={on}
            title={o.label}
            onClick={() => setTheme(o.v)}
            className={cx("relative grid flex-1 cursor-pointer place-items-center rounded-lg py-1.5", on ? "text-fg" : "text-muted hover:text-fg")}
          >
            {on && <motion.span layoutId="theme-pill" className="absolute inset-0 rounded-lg bg-card-strong shadow-soft ring-1 ring-line" />}
            <o.icon className="relative h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}

export function SaveIndicator() {
  const { saveState, status } = useApp();
  const map = {
    idle: { icon: Check, text: "Synchronisé", cls: "text-ok" },
    saved: { icon: Check, text: "Synchronisé", cls: "text-ok" },
    saving: { icon: Loader2, text: "Enregistrement…", cls: "text-muted" },
    local: { icon: CloudOff, text: "Sur cet appareil", cls: "text-warn" },
    error: { icon: TriangleAlert, text: "Hors ligne · enregistré localement", cls: "text-bad" },
  } as const;
  const m = map[status.store ? saveState : "local"];
  return (
    <span className={cx("inline-flex items-center gap-1.5 text-xs font-medium", m.cls)} aria-live="polite">
      <m.icon className={cx("h-3.5 w-3.5", saveState === "saving" && "animate-spin")} />
      <span className="truncate">{m.text}</span>
    </span>
  );
}

export function AnimatedBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="halo halo-1 -top-40 -left-32 h-[34rem] w-[34rem]" />
      <div className="halo halo-2 top-1/3 -right-40 h-[30rem] w-[30rem]" />
      <div className="halo halo-3 -bottom-48 left-1/4 h-[28rem] w-[28rem]" />
      <div
        className="absolute inset-0 opacity-[0.35] dark:opacity-[0.25]"
        style={{
          backgroundImage: "radial-gradient(color-mix(in oklab, var(--fg) 12%, transparent) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          maskImage: "radial-gradient(ellipse at top, black 20%, transparent 70%)",
        }}
      />
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  return (
    <div className="min-h-dvh">
      {/* Barre latérale (ordinateur) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-card/70 px-4 py-5 backdrop-blur-xl lg:flex">
        <Link href="/" className="flex items-center gap-3 px-2">
          <Logo />
          <span className="leading-tight">
            <span className="block font-semibold tracking-tight">Mon Suivi ICAM</span>
            <span className="block text-xs text-muted">CP_FISE · I4.7</span>
          </span>
        </Link>
        <nav className="mt-8 flex flex-col gap-1">
          {NAV.map((n) => {
            const on = isActive(path, n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cx("relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors", on ? "text-fg" : "text-muted hover:text-fg")}
              >
                {on && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-xl bg-soft ring-1 ring-line"
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                )}
                {on && <motion.span layoutId="nav-bar" className="bg-gradient absolute top-2 bottom-2 left-0 w-1 rounded-full" />}
                <n.icon className={cx("relative h-[18px] w-[18px]", on && "text-a1")} />
                <span className="relative">{n.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto space-y-3 px-1">
          <SaveIndicator />
          <ThemeToggle />
        </div>
      </aside>

      {/* Barre du haut (mobile) */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-bg/75 px-4 py-2.5 backdrop-blur-xl lg:hidden">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <Logo />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">Mon Suivi ICAM</span>
            <SaveIndicator />
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <Link href="/synchro" className={cx("btn h-9 w-9 p-0", isActive(path, "/synchro") && "text-a1")} aria-label="Synchronisation">
            <RefreshCw className="h-4 w-4" />
          </Link>
          <ThemeToggle compact />
        </div>
      </header>

      <div className="lg:pl-64">
        <main className="mx-auto w-full max-w-6xl px-4 pt-5 pb-28 sm:px-6 lg:px-8 lg:pt-8 lg:pb-12">{children}</main>
      </div>

      {/* Onglets (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {MOBILE_TABS.map((n) => {
            const on = isActive(path, n.href);
            return (
              <Link key={n.href} href={n.href} className="relative flex flex-col items-center gap-0.5 py-2 text-[10.5px] font-medium">
                {on && <motion.span layoutId="tab-active" className="bg-gradient absolute top-0 h-0.5 w-10 rounded-full" />}
                <motion.span animate={{ y: on ? -1 : 0, scale: on ? 1.08 : 1 }} className={on ? "text-a1" : "text-muted"}>
                  <n.icon className="h-5 w-5" />
                </motion.span>
                <span className={on ? "text-fg" : "text-muted"}>{n.short}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
