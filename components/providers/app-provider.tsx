"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AppData } from "@/lib/server/data";
import type { CritLevel, PlanEvent, PlanningPayload, ProgressState, Referential, RevisionTask } from "@/lib/types";
import { emptyProgress } from "@/lib/types";
import { normalizeReferential, courseName } from "@/lib/referential";
import { buildTasks, hasProgress, mapEvents, sanitizeProgress } from "@/lib/progress";

/** Même clé que la v1 : la progression déjà enregistrée dans ce navigateur est reprise */
const LOCAL_KEY = "suivi-icam";

export type SaveState = "idle" | "saving" | "saved" | "local" | "error";

interface AppContextValue {
  ref: Referential;
  events: PlanEvent[];
  tasks: RevisionTask[];
  planning: Omit<PlanningPayload, "events">;
  progress: ProgressState;
  status: AppData["status"];
  now: Date;
  saveState: SaveState;
  cname: (code: string) => string;
  setCrit: (key: string, level: CritLevel | 0) => void;
  togglePitch: (aa: string, on: boolean) => void;
  toggleTask: (id: string, on: boolean) => void;
  setNote: (course: string, text: string) => void;
  setShowOff: (on: boolean) => void;
  restore: (s: ProgressState) => void;
  refreshPlanning: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const v = useContext(AppContext);
  if (!v) throw new Error("useApp() hors de <AppProvider>");
  return v;
}

function readLocal(): ProgressState | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? sanitizeProgress(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}
function writeLocal(s: ProgressState) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(s));
  } catch {
    /* navigation privée */
  }
}

export function AppProvider({ data, serverNow, children }: { data: AppData; serverNow: string; children: ReactNode }) {
  const { status } = data;
  const ref = useMemo(() => normalizeReferential(data.pitch), [data.pitch]);
  const cname = useCallback((code: string) => courseName(code, ref), [ref]);

  const [planning, setPlanning] = useState<PlanningPayload>(data.planning);
  useEffect(() => setPlanning(data.planning), [data.planning]);
  const events = useMemo(() => mapEvents(planning.events), [planning.events]);

  const [progress, setProgress] = useState<ProgressState>(() => data.progress ?? emptyProgress());
  const [saveState, setSaveState] = useState<SaveState>(status.store ? "saved" : "local");

  // Horloge (une mise à jour par minute). Valeur serveur au premier rendu : pas d'écart d'hydratation.
  const [now, setNow] = useState(() => new Date(serverNow));
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  /* ---------- Sauvegarde : localStorage immédiat + serveur différé ---------- */
  const pending = useRef<ProgressState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushToServer = useCallback(
    async (s: ProgressState, keepalive = false) => {
      if (!status.store) return;
      setSaveState("saving");
      try {
        const r = await fetch("/api/state", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(s),
          keepalive,
        });
        if (r.status === 401) {
          window.location.href = "/login";
          return;
        }
        setSaveState(r.ok ? "saved" : "error");
      } catch {
        setSaveState("error");
      }
    },
    [status.store],
  );

  const commit = useCallback(
    (next: ProgressState, delay = 700) => {
      writeLocal(next);
      if (!status.store) return;
      pending.current = next;
      setSaveState("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const s = pending.current;
        pending.current = null;
        if (s) void pushToServer(s);
      }, delay);
    },
    [status.store, pushToServer],
  );

  const update = useCallback(
    (fn: (s: ProgressState) => ProgressState, delay?: number) => {
      setProgress((prev) => {
        const next = fn(prev);
        commit(next, delay);
        return next;
      });
    },
    [commit],
  );

  // Envoie ce qui reste en attente si l'onglet se ferme
  useEffect(() => {
    const flush = () => {
      if (pending.current) {
        void pushToServer(pending.current, true);
        pending.current = null;
      }
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [pushToServer]);

  // Premier chargement : reprise de la progression locale (v1 ou hors ligne)
  useEffect(() => {
    const local = readLocal();
    const server = data.progress;
    if (status.store) {
      if (server && hasProgress(server)) writeLocal(server);
      else if (local && hasProgress(local)) {
        setProgress(local);
        void pushToServer(local);
      }
    } else if (local) setProgress(local);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Actions ---------- */
  const setCrit = useCallback(
    (key: string, level: CritLevel | 0) =>
      update((s) => {
        const c = { ...s.c };
        if (level === 0) delete c[key];
        else c[key] = level;
        return { ...s, c };
      }),
    [update],
  );
  const togglePitch = useCallback(
    (aa: string, on: boolean) =>
      update((s) => {
        const p = { ...s.p };
        if (on) p[aa] = 1;
        else delete p[aa];
        return { ...s, p };
      }),
    [update],
  );
  const toggleTask = useCallback(
    (id: string, on: boolean) =>
      update((s) => {
        const t = { ...s.t };
        if (on) t[id] = 1;
        else delete t[id];
        return { ...s, t };
      }),
    [update],
  );
  const setNote = useCallback((course: string, text: string) => update((s) => ({ ...s, n: { ...s.n, [course]: text } }), 900), [update]);
  const setShowOff = useCallback((on: boolean) => update((s) => ({ ...s, off: on })), [update]);
  const restore = useCallback((s: ProgressState) => update(() => s, 0), [update]);

  const refreshPlanning = useCallback(async () => {
    const r = await fetch("/api/planning", { method: "POST" });
    const d = (await r.json()) as PlanningPayload & { error?: string };
    if (!r.ok) throw new Error(d.error || "Erreur " + r.status);
    setPlanning(d);
    if (d.source !== "live" && d.warning) throw new Error(d.warning);
  }, []);

  const tasks = useMemo(() => buildTasks(events, progress, cname), [events, progress.planStart, cname]); // eslint-disable-line react-hooks/exhaustive-deps

  const { events: _e, ...planningMeta } = planning;
  const value: AppContextValue = {
    ref,
    events,
    tasks,
    planning: planningMeta,
    progress,
    status,
    now,
    saveState,
    cname,
    setCrit,
    togglePitch,
    toggleTask,
    setNote,
    setShowOff,
    restore,
    refreshPlanning,
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
