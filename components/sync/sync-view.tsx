"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Download, LogOut, RefreshCw, Upload } from "lucide-react";
import { ago, dayKey, fmtDateTime } from "@/lib/dates";
import { allCriteria, isBackup, sanitizeProgress } from "@/lib/progress";
import { useApp } from "@/components/providers/app-provider";
import { PageHeader, Section, cx } from "@/components/ui/primitives";

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="row justify-between">
      <span className="text-[13px] text-muted">{k}</span>
      <span className="num text-right text-[13px]">{v}</span>
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
            setMsg("À jour");
          } catch (e) {
            setMsg("Échec : " + (e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <RefreshCw className={cx("h-3.5 w-3.5", busy && "animate-spin")} />
        {busy ? "Actualisation…" : "Actualiser"}
      </button>
      {msg && <span className={cx("text-[12px]", msg === "À jour" ? "text-ok" : "text-bad")}>{msg}</span>}
    </span>
  );
}

export function planningSourceLabel(source: string, fetchedAt?: string) {
  const at = fetchedAt ? fmtDateTime(new Date(fetchedAt)) : "—";
  if (source === "live") return `HyperPlanning · lu ${at}`;
  if (source === "cache") return `Dernière version connue (${at}) · HyperPlanning injoignable`;
  return "Instantané du 15/11/2026 (ICAL_URL non configuré)";
}

/** Favori : React bloque les URL javascript: dans href, on la pose sur l'élément */
function Bookmarklet({ diag = false, children }: { diag?: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const q = diag ? "diag=1&" : "";
    const bm = `javascript:(function(){var s=document.createElement('script');s.src='${location.origin}/pitch-sync.js?${q}'+Date.now();document.body.appendChild(s);})();`;
    ref.current?.setAttribute("href", bm);
  }, [diag]);
  return (
    <a ref={ref} onClick={(e) => e.preventDefault()} className={diag ? "btn cursor-grab" : "btn-accent cursor-grab"} draggable>
      {children}
    </a>
  );
}

export function SyncView() {
  const { planning, events, ref, status, progress, restore, now } = useApp();
  const [bk, setBk] = useState<{ ok: boolean; text: string } | null>(null);
  const crits = allCriteria(ref);
  const evaluated = crits.filter((x) => x.c.status !== "pending").length;
  const pitchAt = ref.meta.receivedAt || ref.meta.extractedAt;

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
      setBk({ ok: true, text: "Sauvegarde restaurée." });
    } catch (e) {
      setBk({ ok: false, text: "Restauration impossible : " + (e as Error).message });
    }
  };
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <div>
      <PageHeader title="Synchro" sub="D'où viennent les données, quand elles ont été lues, et comment les mettre à jour." />
      <div className="grid grid-cols-1 gap-x-12 gap-y-12 lg:grid-cols-2">
        <Section label="PITCH · progression officielle">
          <KV k="Référentiel" v={status.pitchOrigin === "sync" ? "Synchronisé" : "Instantané du 15/11"} />
          <KV k="Dernière synchro" v={pitchAt ? `${ago(new Date(pitchAt), now)} · ${fmtDateTime(new Date(pitchAt))}` : "—"} />
          <KV k="Contenu" v={`${ref.competences.filter((c) => !c.missing).length} compétences · ${Object.keys(ref.ra).length} RA · ${ref.aaList.length} AA`} />
          <KV k="Critères évalués" v={`${evaluated} / ${crits.length}`} />
          {status.store ? (
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-[13.5px]">
              <li>
                Glisse ce bouton dans ta barre de favoris :
                <div className="mt-2">
                  <Bookmarklet>Synchroniser PITCH</Bookmarklet>
                </div>
              </li>
              <li>Ouvre PITCH (connectée) et clique sur le favori.</li>
              <li>Recharge ce site.</li>
            </ol>
          ) : (
            <p className="mt-4 border-l-2 border-warn pl-3 text-[13px]">Disponible après le déploiement sur Vercel avec le stockage Upstash.</p>
          )}
          <div className="mt-6 border-t border-line pt-4">
            <p className="text-[13px] font-medium">Diagnostic</p>
            <p className="mt-1 text-[12.5px] text-muted">
              Télécharge sur cet ordinateur les réponses brutes de PITCH pour tous tes programmes (Bachelor compris). Rien n&apos;est envoyé au site. Sert à
              découvrir les champs disponibles (dates, itérations, équivalences).
            </p>
            <div className="mt-2">
              <Bookmarklet diag>Diagnostic PITCH</Bookmarklet>
            </div>
          </div>
        </Section>

        <Section label="HyperPlanning · emploi du temps">
          <KV k="Source" v={planning.source === "live" ? "Lien iCal, en direct" : planning.source === "cache" ? "Dernière version connue" : "Instantané du 15/11"} />
          <KV k="Lu" v={planning.fetchedAt ? `${ago(new Date(planning.fetchedAt), now)} · ${fmtDateTime(new Date(planning.fetchedAt))}` : "—"} />
          <KV k="Créneaux" v={events.length} />
          {planning.warning && <p className="mt-3 border-l-2 border-warn pl-3 text-[12.5px]">{planning.warning}</p>}
          <p className="mt-3 text-[12.5px] text-muted">Relu au plus toutes les 15 minutes par le serveur ; le lien iCal reste secret (variable ICAL_URL).</p>
          <div className="mt-3">
            {status.ical ? <RefreshButton /> : <p className="border-l-2 border-warn pl-3 text-[12.5px]">Non configuré : ajoute ICAL_URL dans Vercel.</p>}
          </div>
        </Section>

        <Section label="Mes données">
          <p className="mt-3 text-[13px] text-muted">
            {status.storeKind === "redis"
              ? "Enregistrées sur ton serveur (Upstash Redis) : les mêmes sur ordinateur et téléphone."
              : status.storeKind === "file"
                ? "Mode développement : enregistrées dans .data/store.json."
                : "Enregistrées dans ce navigateur uniquement."}{" "}
            Tâches cochées, notes et « je me sens prête ».
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn" onClick={exportBackup}>
              <Download className="h-3.5 w-3.5" /> Exporter
            </button>
            <label className="btn">
              <Upload className="h-3.5 w-3.5" /> Restaurer…
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
          {bk && <p className={cx("mt-2 text-[13px]", bk.ok ? "text-ok" : "text-bad")}>{bk.text}</p>}
        </Section>

        <Section label="Session">
          <p className="mt-3 text-[13px] text-muted">{status.auth ? "Connectée sur cet appareil (session de 180 jours)." : "Accès libre (aucun APP_PASSWORD en local)."}</p>
          {status.auth && (
            <button className="btn mt-4" onClick={logout}>
              <LogOut className="h-3.5 w-3.5" /> Se déconnecter de cet appareil
            </button>
          )}
        </Section>
      </div>
    </div>
  );
}
