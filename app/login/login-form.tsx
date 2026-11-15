"use client";
import { motion, useAnimationControls } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { Logo, ThemeToggle } from "@/components/shell/shell";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [pwd, setPwd] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const shake = useAnimationControls();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: pwd }) });
      if (!r.ok) {
        const d = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error || "Erreur " + r.status);
      }
      const next = params.get("next");
      router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
      router.refresh();
    } catch (x) {
      setErr((x as Error).message);
      setBusy(false);
      void shake.start({ x: [0, -10, 10, -6, 6, 0], transition: { duration: 0.4 } });
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="w-full max-w-sm">
      <motion.form animate={shake} onSubmit={submit} className="card p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <Logo />
          <ThemeToggle compact />
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">
          Mon Suivi <span className="text-gradient">ICAM</span>
        </h1>
        <p className="sub">Compétences, planning et révisions. Entre ton mot de passe pour continuer.</p>
        <label className="mt-6 block text-sm font-medium" htmlFor="pwd">
          Mot de passe
        </label>
        <div className="relative mt-1.5">
          <Lock className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            id="pwd"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            autoFocus
            required
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            className="w-full rounded-xl border border-line bg-card-strong py-2.5 pr-10 pl-9 text-[15px] outline-none transition-shadow focus:ring-2 focus:ring-a1/50"
          />
          <button type="button" onClick={() => setShow((s) => !s)} className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer p-1 text-muted hover:text-fg" aria-label={show ? "Masquer" : "Afficher"}>
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <div className="mt-2 min-h-5 text-sm text-bad" role="alert">
          {err}
        </div>
        <button className="btn-primary mt-2 w-full py-2.5" disabled={busy || !pwd}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          Se connecter
        </button>
      </motion.form>
    </motion.div>
  );
}
