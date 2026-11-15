// Dates : tout l'affichage se fait en heure de Paris, quel que soit le fuseau du navigateur ou du serveur.
export const TZ = "Europe/Paris";

const pad = (n: number) => String(n).padStart(2, "0");

export const fmtDay = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: TZ });
export const fmtDayLong = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });
export const fmtTime = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
export const fmtMonth = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: TZ });
export const fmtWeekday = new Intl.DateTimeFormat("fr-FR", { weekday: "short", timeZone: TZ });
export const fmtDateTime = (d: Date) => fmtDay.format(d) + " à " + fmtTime.format(d);
const keyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ });
const partsFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Jour (AAAA-MM-JJ) à Paris */
export const dayKey = (d: Date): string => keyFmt.format(d);

/** Heure et minutes à Paris */
export function parisTime(d: Date): { h: number; m: number } {
  const p = Object.fromEntries(partsFmt.formatToParts(d).map((x) => [x.type, x.value]));
  return { h: Number(p.hour) % 24, m: Number(p.minute) };
}
/** Minutes écoulées depuis minuit (Paris) */
export const parisMinutes = (d: Date) => {
  const t = parisTime(d);
  return t.h * 60 + t.m;
};

/** Date « midi UTC » d'un jour : sûre pour l'arithmétique de jours et le formatage en Paris */
export const keyToNoon = (k: string) => new Date(k + "T12:00:00Z");
export function addDays(k: string, n: number): string {
  const d = keyToNoon(k);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function addMonths(k: string, n: number): string {
  const [y, m] = k.split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + n, 1, 12));
  return d.toISOString().slice(0, 10);
}
/** Lundi de la semaine du jour donné */
export function weekStart(k: string): string {
  const d = keyToNoon(k);
  return addDays(k, -((d.getUTCDay() + 6) % 7));
}
export const monthStart = (k: string) => k.slice(0, 8) + "01";
/** 0 = lundi … 6 = dimanche */
export const weekdayIndex = (k: string) => (keyToNoon(k).getUTCDay() + 6) % 7;

/** Nombre de jours calendaires (Paris) entre maintenant et d */
export function daysUntil(d: Date, now: Date = new Date()): number {
  const a = new Date(dayKey(now) + "T00:00:00Z").getTime();
  const b = new Date(dayKey(d) + "T00:00:00Z").getTime();
  return Math.round((b - a) / 864e5);
}

export const hm = (minutes: number) => pad(Math.floor(minutes / 60)) + ":" + pad(minutes % 60);

export function relativeDays(n: number): string {
  if (n === 0) return "aujourd'hui";
  if (n === 1) return "demain";
  if (n === -1) return "hier";
  return n > 0 ? `dans ${n} j` : `il y a ${-n} j`;
}

export function greeting(now: Date = new Date()): string {
  const h = parisTime(now).h;
  if (h < 5) return "Bonne nuit";
  if (h < 18) return "Bonjour";
  return "Bonsoir";
}
