import "server-only";
import { Redis } from "@upstash/redis";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { PitchRaw, PlanningPayload, ProgressState } from "../types.ts";
import { defaultUserId } from "./user.ts";

/* ---------- Clé-valeur : Upstash Redis, ou fichier local en développement ---------- */
interface KV {
  kind: "redis" | "file";
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
}

const env = (a: string, b: string) => process.env[a] || process.env[b];

function redisKV(url: string, token: string): KV {
  const r = new Redis({ url, token });
  return {
    kind: "redis",
    // Les valeurs de la v1 ont été écrites en JSON.stringify : la désérialisation automatique les relit telles quelles.
    get: async <T>(k: string) => (await r.get<T>(k)) ?? null,
    set: async (k, v) => {
      await r.set(k, v);
    },
  };
}

/** Stockage de développement (.data/store.json, ignoré par git) : jamais utilisé en production */
function fileKV(): KV {
  const file = path.join(process.cwd(), ".data", "store.json");
  const read = async (): Promise<Record<string, unknown>> => {
    try {
      return JSON.parse(await fs.readFile(file, "utf8")) as Record<string, unknown>;
    } catch {
      return {};
    }
  };
  let queue = Promise.resolve();
  return {
    kind: "file",
    get: async <T>(k: string) => ((await read())[k] as T | undefined) ?? null,
    set: (k, v) =>
      (queue = queue.then(async () => {
        const all = await read();
        all[k] = v;
        await fs.mkdir(path.dirname(file), { recursive: true });
        await fs.writeFile(file, JSON.stringify(all));
      })),
  };
}

let kv: KV | null | undefined;
export function getKV(): KV | null {
  if (kv !== undefined) return kv;
  const url = env("KV_REST_API_URL", "UPSTASH_REDIS_REST_URL");
  const token = env("KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_TOKEN");
  if (url && token) kv = redisKV(url, token);
  else kv = process.env.NODE_ENV !== "production" ? fileKV() : null;
  return kv;
}
export const hasStore = () => getKV() !== null;
export const storeKind = () => getKV()?.kind ?? "none";

/* ---------- Données rangées par utilisateur ---------- */
type Kind = "progress" | "pitch" | "planning";
/** Clés de la v1 (un seul utilisateur) : relues si la clé v2 est vide, puis recopiées */
const LEGACY: Record<Kind, string> = { progress: "suivi:state", pitch: "suivi:pitch", planning: "suivi:planning" };
export const userKey = (userId: string, kind: Kind) => `user:${userId}:${kind}`;

async function read<T>(userId: string, kind: Kind): Promise<T | null> {
  const s = getKV();
  if (!s) return null;
  const v = await s.get<T>(userKey(userId, kind));
  if (v != null) return v;
  if (userId !== defaultUserId()) return null;
  const old = await s.get<T>(LEGACY[kind]);
  if (old != null) await s.set(userKey(userId, kind), old).catch(() => {});
  return old;
}
async function write(userId: string, kind: Kind, value: unknown): Promise<void> {
  const s = getKV();
  if (!s) throw new Error("Stockage non configuré (connecte Upstash Redis dans Vercel → Storage).");
  await s.set(userKey(userId, kind), value);
}

export const userStore = (userId: string) => ({
  getProgress: () => read<ProgressState>(userId, "progress"),
  setProgress: (v: ProgressState) => write(userId, "progress", v),
  getPitch: () => read<PitchRaw>(userId, "pitch"),
  setPitch: (v: PitchRaw) => write(userId, "pitch", v),
  getPlanning: () => read<PlanningPayload>(userId, "planning"),
  setPlanning: (v: PlanningPayload) => write(userId, "planning", v),
});
