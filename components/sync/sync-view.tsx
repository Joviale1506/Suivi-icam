"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bookmark, CalendarDays, Database, Download, GraduationCap, LogOut, RefreshCw, ShieldCheck, Upload } from "lucide-react";
import { fmtDateTime, dayKey } from "@/lib/dates";
import { isBackup, sanitizeProgress } from "@/lib/progress";
import { useApp } from "@/components/providers/app-provider";
import { Card, Stagger, StaggerItem, cx } from "@/components/ui/primitives";

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line py-2 text-sm last:border-0">
      <span className="text-muted">{k}</span>
      <span className="text-right font-medium">{v}</span>
    </div>
  );
}

export function RefreshButton({ className }: { className?: string }) {
  const { refreshPlanning, status } = useApp();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  if (!status.ical) return null;
  return (
    <span className={cx("inline-flex flex-wrap items-center gap-2", className)}>
      <button
        className="btn"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMsg("");
          try {
            await refreshPlanning();
            router.refresh();
            setMsg("✓ À jour");
          } catch (e) {
            setMsg("Échec : " + (e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <RefreshCw className={cx("h-4 w-4", busy && "animate-spin")} />
        {busy ? "Actualisation…" : "Actualiser"}
      </button>
      {msg && <span className={cx("text-xs", msg.startsWith("✓") ? "text-ok" : "text-bad")}>{msg}</span>}
    </span>
  );
}

export function planningSourceLabel(source: string, fetchedAt?: string) {
  const at = fetchedAt ? fmtDateTime(new Date(fetchedAt)) : "—";
  if (source === "live") return `HyperPlanning en direct · lu ${at}`;
  if (source === "cache") return `Dernière version connue (${at}) · HyperPlanning injoignable`;
  return "Instantané du 15/11/2026 (configure ICAL_URL pour la mise à jour automatique)";
}

function Bookmarklet() {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    // React bloque les URL javascript: dans href : on la pose directement sur l'élément
    const bm = `javascript:(function(){var s=document.createElement('script');s.src='${location.origin}/pitch-sync.js?'+Date.now();document.body.appendChild(s);})();`;
    ref.current?.setAttribute("href", bm);
  }, []);
  return (
    <a ref={ref} onClick={(e) => e.preventDefault()} className="btn-primary cursor-grab" draggable>
      <Bookmark className="h-4 w-4" /> Synchroniser PITCH
    </a>
  );
}

export function SyncView() {
  const { planning, events, ref, status, progress, restore } = useApp();
  const [bk, setBk] = useState<{ ok: boolean; text: string } | null>(null);

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(progress, null, 1)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "suivi-icam-sauvegarde-" + dayKey(new Date()) + ".json";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importBackup = async (file: File) => {
    try {
      const d: unknown = JSON.parse(await file.text());
      if (!isBackup(d)) throw new Error("fichier invalide");
      restore(sanitizeProgress(d));
      setBk({ ok: true, text: "✓ Sauvegarde restaurée." });
    } catch (e) {
      setBk({ ok: false, text: "Restauration impossible : " + (e as Error).message });
    }
  };
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="h1">Synchronisation</h1>
        <p className="sub">D&apos;où viennent tes données et comment les mettre à jour.</p>
      </header>
      <Stagger className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StaggerItem>
          <Card className="card-pad h-full">
            <h2 className="flex items-center gap-2 font-semibold">
              <CalendarDays className="h-4 w-4 text-a1" /> HyperPlanning
            </h2>
            <div className="mt-3">
              <Row k="Source" v={planning.source === "live" ? "Lien iCal, en direct" : planning.source === "cache" ? "Dernière version connue" : "Instantané du 15/11"} />
              <Row k="Mis à jour" v={planning.fetchedAt ? fmtDateTime(new Date(planning.fetchedAt)) : "—"} />
              <Row k="Créneaux" v={events.length} />
            </div>
            {planning.warning && <div className="mt-3 rounded-xl border border-warn/30 bg-warn/10 px-3 py-2 text-xs">{planning.warning}</div>}
            <p className="mt-3 text-xs text-muted">
              Le serveur relit ton lien iCal (variable <code className="font-mono">ICAL_URL</code>, jamais visible dans le navigateur) au plus toutes les 15
              minutes.
            </p>
            <div className="mt-3">
              {status.ical ? (
                <RefreshButton />
              ) : (
                <div className="rounded-xl border border-warn/30 bg-warn/10 px-3 py-2 text-xs">Non configuré : ajoute ICAL_URL dans Vercel.</div>
              )}
            </div>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card className="card-pad h-full">
            <h2 className="flex items-center gap-2 font-semibold">
              <GraduationCap className="h-4 w-4 text-a1" /> PITCH
            </h2>
            <div className="mt-3">
              <Row k="Référentiel" v={status.pitchOrigin === "sync" ? "Synchronisé" : "Instantané du 15/11"} />
              <Row k="Date" v={ref.meta.extractedAt ? fmtDateTime(new Date(ref.meta.extractedAt)) : "—"} />
              <Row k="Contenu" v={`${ref.competences.filter((c) => !c.missing).length} compétences · ${Object.keys(ref.ra).length} RA · ${ref.aaList.length} AA`} />
            </div>
            <p className="mt-3 text-sm">
              PITCH n&apos;a pas d&apos;accès public : la synchro passe par <b>ta</b> session, avec un favori.
            </p>
            {status.store ? (
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
                <li>
                  Glisse ce bouton dans ta barre de favoris :<div className="mt-2">
                    <Bookmarklet />
                  </div>
                </li>
                <li>Ouvre PITCH (connectée) et clique sur le favori.</li>
                <li>Recharge ce site : compétences, RA, AA, critères et progression officielle sont à jour.</li>
              </ol>
            ) : (
              <div className="mt-3 rounded-xl border border-warn/30 bg-warn/10 px-3 py-2 text-xs">Disponible après le déploiement sur Vercel avec le stockage Upstash.</div>
            )}
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card className="card-pad h-full">
            <h2 className="flex items-center gap-2 font-semibold">
              <Database className="h-4 w-4 text-a1" /> Ma progression
            </h2>
            <p className="mt-2 text-sm text-muted">
              {status.storeKind === "redis"
                ? "Enregistrée sur ton serveur (Upstash Redis) : la même sur ordinateur et téléphone."
                : status.storeKind === "file"
                  ? "Mode développement : enregistrée dans .data/store.json sur cet ordinateur."
                  : "Enregistrée dans ce navigateur uniquement."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn" onClick={exportBackup}>
                <Download className="h-4 w-4" /> Exporter une sauvegarde
              </button>
              <label className="btn">
                <Upload className="h-4 w-4" /> Restaurer…
                <input
                  type="file"
                  accept="application/json"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void importBackup(f);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            {bk && <p className={cx("mt-2 text-sm", bk.ok ? "text-ok" : "text-bad")}>{bk.text}</p>}
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card className="card-pad h-full">
            <h2 className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="h-4 w-4 text-a1" /> Session
            </h2>
            <p className="mt-2 text-sm text-muted">
              {status.auth ? "Connectée à ton site (session de 180 jours sur cet appareil)." : "Accès libre (aucun APP_PASSWORD en local)."}
            </p>
            {status.auth && (
              <button className="btn mt-4" onClick={logout}>
                <LogOut className="h-4 w-4" /> Se déconnecter de cet appareil
              </button>
            )}
          </Card>
        </StaggerItem>
      </Stagger>
    </div>
  );
}
