"use client";
import { motion, useAnimationControls } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { ThemeToggle, Wordmark } from "@/components/shell/shell";

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
      void shake.start({ x: [0, -6, 6, -3, 3, 0], transition: { duration: 0.3 } });
    }
  }

  return (
    <div className="w-full max-w-[22rem]">
      <div className="flex items-center justify-between">
        <Wordmark className="text-[28px]" />
        <ThemeToggle compact />
      </div>
      <motion.form animate={shake} onSubmit={submit} className="mt-10 border-t border-line-strong pt-8">
        <h1 className="t-page">Connexion</h1>
        <p className="mt-2 text-[13px] text-muted">Compétences, planning et révisions.</p>
        <label className="t-label mt-8 block" htmlFor="pwd">
          Mot de passe
        </label>
        <div className="relative mt-2">
          <input
            id="pwd"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            autoFocus
            required
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            className="input min-h-11 pr-11"
          />
          <button type="button" onClick={() => setShow((s) => !s)} className="btn-ghost absolute top-0 right-0 h-11 w-11 p-0" aria-label={show ? "Masquer" : "Afficher"}>
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <div className="mt-2 min-h-5 text-[13px] text-bad" role="alert">
          {err}
        </div>
        <button className="btn-accent mt-3 min-h-11 w-full" disabled={busy || !pwd}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          Se connecter
        </button>
      </motion.form>
    </div>
  );
}
