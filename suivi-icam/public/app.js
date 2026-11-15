/* Mon Suivi ICAM – application (aucune dépendance) */
"use strict";

/* ===================== RÉFÉRENTIEL & COURS ===================== */
// Les 13 compétences du référentiel ICAM. C02 et C12 n'ont aucun RA rattaché dans PITCH pour le CP_FISE.
const ALL_COMPS = {
  C02: "Organiser ses connaissances théoriques et expérimentales afin d'identifier et relier les différentes composantes des projets et interagir efficacement avec chacun des acteurs.",
  C12: "Exercer son métier d'ingénieur, en anglais comme en français, en situation interculturelle, par sa connaissance des systèmes culturels et par ses expériences vécues.",
};
const COURSES = {
  "I4.7.MEO.02": { n: "Gestion financière", g: "Management & entreprise" },
  "I4.7.MEO.01": { n: "Droit des affaires, des sociétés, du travail", g: "Management & entreprise" },
  "I4.7.MEO.05": { n: "Systémique entreprise", g: "Management & entreprise" },
  "I4.7.ESE.01": { n: "Management environnemental", g: "Environnement" },
  "I4.7.MEO.04": { n: "Supply chain", g: "Production & logistique" },
  "I4.7.MEO.03": { n: "Lean management, 6 Sigma", g: "Production & logistique" },
  "I4.7-PROJ.01": { n: "Projet création d'entreprise (PCE)", g: "Projets" },
  "I4.7.MEO.06": { n: "Stratégie (PCE)", g: "Projets" },
  "MKT": { n: "Marketing", g: "Projets", x: "Hors PITCH : sert l'AA marketing du PCE (C07-CPE5).", aa: ["AA-MEO-C07-CPE5-01"] },
  "I4.7.PROJ.02": { n: "Projet Jumeau numérique (Robot Soccer)", g: "Projets" },
  "I4.7.HUM.01": { n: "Histoire des idées politiques", g: "Humanités & langues" },
  "I4.7.HUM.02": { n: "Anglais (+ TOEIC Prep)", g: "Humanités & langues" },
  "I4.7.HUM.04": { n: "LV2 – Portugais", g: "Humanités & langues" },
  "IA": { n: "Formation IA", g: "Humanités & langues", x: "Hors PITCH : utile pour l'AA « outils numériques » (C04-CPE1).", aa: ["AA-HUM-C04-CPE1-01"] },
  "I4.ICT.01": { n: "Projet professionnel", g: "Développement personnel" },
  "I4.7.ERD.03": { n: "Relecture d'Experiment", g: "Développement personnel" },
  "I4.8.HUM.04": { n: "Éthique de l'ingénieur", g: "Semestres suivants" },
  "I4.8.HUM.06": { n: "Géopolitique", g: "Semestres suivants" },
  "I4.8.HUM.05": { n: "Écologie", g: "Semestres suivants" },
  "I4.8.HUM.02": { n: "Anglais I4.8", g: "Semestres suivants" },
  "I4.8.HUM.03": { n: "LV2 I4.8", g: "Semestres suivants" },
  "I5.MEO.01": { n: "Pilotage stratégique", g: "Semestres suivants" },
};
// Cours hors de ton parcours langues (LV2 débutant, FLE)
const OFF_COURSES = (c) => /LV2_/.test(c) || c === "I4.7.HUM.06" || c === "I4.8.HUM.07";
const PLANMAP = { LV: ["I4.7.HUM.02", "I4.7.HUM.04"], PORT: ["I4.7.HUM.04"], TOEIC: ["I4.7.HUM.02"], ERDP: ["I4.ICT.01"] };
const PLANNAME = { LV: "Langues LV1/LV2", PORT: "Portugais", TOEIC: "TOEIC Prep", ERDP: "ERD – Projet pro" };

/* ===================== ÉTAT GLOBAL ===================== */
let COMP = [], RA = {}, AA = {}, AALIST = [], PITCH_META = {};
let EVENTS = [], PLAN_META = {}, TASKS = [];
let S = { c: {}, p: {}, t: {}, n: {}, off: false };
let API = { online: false, store: false, ical: false };
let PWD = "";
try { PWD = localStorage.getItem("suivi-icam-pwd") || ""; } catch (e) {}

const $ = (s) => document.querySelector(s);
const V = $("#view");
const pad = (n) => String(n).padStart(2, "0");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
const fmtD = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Paris" });
const fmtDL = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" });
const fmtT = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
const fmtDT = (d) => fmtD.format(d) + " à " + fmtT.format(d);
const dayKey = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(d);
const now = () => new Date();
function daysUntil(d) { const a = new Date(dayKey(now()) + "T00:00:00Z"), b = new Date(dayKey(d) + "T00:00:00Z"); return Math.round((b - a) / 864e5); }
const cname = (code) => (COURSES[code] ? COURSES[code].n : (PITCH_META.courseTitles?.[code] || code));
const setSync = (t) => { $("#sync").textContent = t; };

/* ===================== API ===================== */
async function api(path, opt = {}) {
  const r = await fetch(path, { ...opt, headers: { "x-app-password": PWD, "content-type": "application/json", ...(opt.headers || {}) } });
  if (r.status === 401) { const e = new Error("401"); e.code = 401; throw e; }
  return r;
}

/* ===================== CHARGEMENT ===================== */
function loadPitch(d) {
  COMP = []; RA = {}; AA = {};
  PITCH_META = { extractedAt: d.receivedAt || d.extractedAt, snapshot: !!d.snapshot, programTitle: d.programTitle, courseTitles: {} };
  const present = new Set(d.competences.map((c) => c.code));
  const comps = [...d.competences];
  for (const [code, t] of Object.entries(ALL_COMPS)) if (!present.has(code)) comps.push({ code, title: t, ra: [], missing: true });
  comps.sort((a, b) => a.code.localeCompare(b.code));
  for (const c of comps) {
    const comp = { code: c.code, t: c.title, min: c.minPct || 70, progress: c.progress, missing: !!c.missing, ra: [] };
    for (const r of c.ra || []) {
      const ra = { code: r.code, t: r.title, comp: c.code, aa: [] };
      for (const a of r.aa || []) {
        const courses = [...new Set((a.crit || []).flatMap((x) => (x.courses || []).map((y) => y.code)).concat(a.coursesHint || []))];
        (a.crit || []).forEach((x) => (x.courses || []).forEach((y) => { if (y.title) PITCH_META.courseTitles[y.code] = y.title.replace(/^I\d(\.\d)?\s*[-–]?\s*(HUM|MEO|ESE|PROJ|ICT|ERD)\s*[-–]\s*/i, ""); }));
        const off = courses.length > 0 && courses.every(OFF_COURSES);
        const aa = { code: a.code, t: a.title, sem: (a.periods || []).join("/"), off, courses, ra: r.code, comp: c.code,
          progress: a.progress, crit: (a.crit || []).map((x) => ({ t: x.title, courses: (x.courses || []).map((y) => y.code), eval: (x.courses || [])[0]?.eval, mandatory: x.mandatory })) };
        ra.aa.push(aa); AA[aa.code] = aa;
      }
      comp.ra.push(ra); RA[ra.code] = ra;
    }
    COMP.push(comp);
  }
  for (const [k, v] of Object.entries(COURSES)) if (v.aa) v.aa.forEach((code) => { if (AA[code] && !AA[code].courses.includes(k)) AA[code].courses.push(k); });
  AALIST = Object.values(AA);
}
function loadPlanning(p) {
  PLAN_META = { source: p.source, fetchedAt: p.fetchedAt, warning: p.warning };
  EVENTS = (p.events || []).map((e) => {
    const courses = PLANMAP[e.key] || (e.key ? [e.key] : []);
    const name = PLANNAME[e.key] || (COURSES[e.key] ? COURSES[e.key].n : e.name || e.note || e.type);
    const isExam = e.type === "Examen" || e.type === "Soutenance" || e.type === "Jury";
    return { ...e, start: new Date(e.start), end: new Date(e.end), courses, name, isExam };
  }).sort((a, b) => a.start - b.start);
  TASKS = buildTasks();
}

async function boot() {
  try { const ls = localStorage.getItem("suivi-icam"); if (ls) S = Object.assign(S, JSON.parse(ls)); } catch (e) {}
  // 1. Connexion à l'API (absente en aperçu local → mode hors ligne)
  try {
    const r = await api("/api/ping");
    if (r.ok) { API = { online: true, ...(await r.json()) }; }
  } catch (e) {
    if (e.code === 401) return showLogin();
  }
  // 2. PITCH
  let pitch = null;
  if (API.online && API.store) { try { const r = await api("/api/pitch"); if (r.ok) pitch = await r.json(); } catch (e) {} }
  if (!pitch) pitch = await (await fetch("/data/pitch.json")).json();
  loadPitch(pitch);
  // 3. Planning
  let plan = null;
  if (API.online && API.ical) { try { const r = await api("/api/planning"); if (r.ok) plan = await r.json(); } catch (e) {} }
  if (!plan) plan = await (await fetch("/data/planning.json")).json();
  loadPlanning(plan);
  // 4. Progression
  if (API.online && API.store) {
    try { const r = await api("/api/state"); if (r.ok) { const d = await r.json(); if (d && Object.keys(d).length) S = Object.assign({ c: {}, p: {}, t: {}, n: {}, off: false }, d); else if (Object.keys(S.c).length) save(); } } catch (e) {}
  }
  setSync(API.online ? (API.store ? "Synchronisé ✓" : "En ligne · progression enregistrée sur cet appareil") : "Mode hors ligne · données du 15/11");
  const h = (location.hash || "").slice(1);
  if (["dash", "comp", "cours", "plan", "fiches", "sync"].includes(h)) view = h;
  go(view, null, true);
}

function showLogin() {
  $("#login").hidden = false; $("#pwd").focus();
  setSync("Connexion requise");
}
$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  PWD = $("#pwd").value;
  try {
    const r = await api("/api/ping");
    if (!r.ok) throw new Error("Erreur " + r.status + " : " + ((await r.json().catch(() => ({}))).error || ""));
    try { localStorage.setItem("suivi-icam-pwd", PWD); } catch (x) {}
    $("#login").hidden = true; boot();
  } catch (err) { $("#loginErr").textContent = err.code === 401 ? "Mot de passe incorrect." : err.message; }
});

/* ===================== SAUVEGARDE ===================== */
let saveTimer = null;
function save() {
  try { localStorage.setItem("suivi-icam", JSON.stringify(S)); } catch (e) {}
  if (!(API.online && API.store)) return;
  clearTimeout(saveTimer); setSync("Enregistrement…");
  saveTimer = setTimeout(async () => {
    try { const r = await api("/api/state", { method: "PUT", body: JSON.stringify(S) }); setSync(r.ok ? "Synchronisé ✓" : "Échec de la synchro (" + r.status + ")"); }
    catch (e) { setSync(e.code === 401 ? "Session expirée" : "Hors ligne · enregistré sur cet appareil"); }
  }, 700);
}

/* ===================== CALCULS ===================== */
const cid = (a, i) => a.code + "#" + i;
function aaScore(a) {
  if (S.p[a.code]) return 1;
  if (!a.crit.length) return 0;
  let s = 0; a.crit.forEach((_, i) => { const v = S.c[cid(a, i)] || 0; s += v === 2 ? 1 : v === 1 ? 0.5 : 0; });
  return s / a.crit.length;
}
function aaState(a) { if (S.p[a.code]) return "pitch"; const s = aaScore(a); return s >= 0.999 ? "ok" : s > 0 ? "wip" : "todo"; }
const inParcours = (a) => !a.off || S.off;
function compScore(c) { const as = c.ra.flatMap((r) => r.aa).filter((a) => !a.off); return as.length ? as.reduce((x, a) => x + aaScore(a), 0) / as.length : 0; }
const courseAA = (code) => AALIST.filter((a) => a.courses.includes(code) && !a.off);
const courseEvents = (code) => EVENTS.filter((e) => e.courses.includes(code));

/* ===================== PLAN DE RÉVISION ===================== */
function buildTasks() {
  const T = [];
  const first = S.planStart ? new Date(S.planStart) : new Date("2026-11-15T00:00:00Z");
  EVENTS.filter((e) => e.isExam && e.courses.length).forEach((e) => {
    const c = e.courses[0], nm = cname(c), oral = e.type !== "Examen";
    const steps = oral ? [
      [14, "Plan de la présentation, répartition des rôles, liste des livrables", 1],
      [7, "Support finalisé (slides + annexes) : vérifier que chaque critère PITCH a une preuve", 1.5],
      [3, "Répétition chronométrée + questions probables du jury", 1],
      [1, "Dernière répétition, relire les chiffres clés, préparer le matériel", 0.5],
    ] : [
      [14, "Relire la fiche, marquer les critères non maîtrisés (onglet Compétences)", 1.5],
      [7, "Exercices type de la fiche en conditions d'examen", 2],
      [3, "Refaire les exercices ratés + réécrire la fiche flash de mémoire", 1.5],
      [1, "Relecture rapide des formules et définitions, préparer le matériel", 0.5],
    ];
    steps.forEach(([j, txt, h]) => {
      const d = new Date(e.start.getTime() - j * 864e5);
      if (d < first) return;
      T.push({ id: "t-" + e.id + "-" + j, date: d, j, course: c, ev: e, txt: (oral ? "🎤 " : "📝 ") + nm + " – J-" + j + " : " + txt, h });
    });
  });
  return T;
}

/* ===================== NAVIGATION ===================== */
let view = "dash", selCourse = "I4.7.MEO.02", selFiche = "I4.7.MEO.02", planFilter = "all", openC = null;
$("#nav").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) go(b.dataset.v); });
function go(v, opt, keepScroll) {
  view = v;
  if (opt && opt.course) { selCourse = opt.course; selFiche = opt.course; }
  document.querySelectorAll("#nav button").forEach((b) => b.classList.toggle("on", b.dataset.v === view));
  try { history.replaceState(null, "", "#" + v); } catch (e) {}
  render(); if (!keepScroll) window.scrollTo(0, 0);
}
window.go = go;
function render() { const f = ({ dash: rDash, comp: rComp, cours: rCours, plan: rPlan, fiches: rFiches, sync: rSync })[view] || rDash; f(); }
function rerenderKeep() { const y = window.scrollY; render(); window.scrollTo(0, y); }

/* ===================== COMPOSANTS ===================== */
const bar = (p, marker) => `<div class="bar"><i style="width:${Math.round(p * 100)}%;background:${p >= 0.7 ? "var(--ok)" : p > 0 ? "var(--accent)" : "var(--surface2)"}"></i>${marker ? `<b style="left:${marker}%"></b>` : ""}</div>`;
function stTag(a) {
  const s = aaState(a);
  const pt = a.progress != null ? ` <span class="tag pitch" title="Progression officielle PITCH">PITCH ${Math.round(a.progress)} %</span>` : "";
  return (s === "pitch" ? '<span class="tag ok">Validé PITCH</span>' : s === "ok" ? '<span class="tag ok">Prêt</span>' : s === "wip" ? '<span class="tag warn">En cours</span>' : '<span class="tag">À travailler</span>') + pt;
}
const courseLink = (c) => `<a href="#cours" data-go="cours" data-course="${esc(c)}">${esc(cname(c))}</a>`;
function evRow(e) {
  const dd = daysUntil(e.start);
  return `<div class="li"><div class="when"><b>${fmtD.format(e.start)}</b>${e.allDay ? "" : fmtT.format(e.start)}</div>
  <div style="flex:1;min-width:0"><div class="row between"><span style="font-weight:${e.isExam ? 600 : 500}">${esc(e.name)}</span>${e.isExam ? `<span class="tag exam">${esc(e.type)}</span>` : `<span class="tag">${esc(e.type)}</span>`}</div>
  <div class="small muted">${[esc(e.note), e.isExam ? `dans ${dd} j` : ""].filter(Boolean).join(" · ")}</div></div></div>`;
}
function taskRow(t) {
  const late = daysUntil(t.date) < 0 && !S.t[t.id];
  return `<label class="task ${S.t[t.id] ? "done" : ""} ${late ? "late" : ""}"><input type="checkbox" data-task="${esc(t.id)}" ${S.t[t.id] ? "checked" : ""}>
  <span style="flex:1"><span class="small muted">${fmtD.format(t.date)} · ~${t.h} h</span><br>${esc(t.txt)} <a href="#fiches" data-go="fiches" data-course="${esc(t.course)}" class="small">fiche</a></span></label>`;
}
function critRow(a, i, c) {
  const v = S.c[cid(a, i)] || 0;
  return `<div class="crit"><span class="tri" data-k="${esc(cid(a, i))}"><button data-s="0" title="Pas encore vu">·</button><button class="${v === 1 ? "s1" : ""}" data-s="1">En cours</button><button class="${v === 2 ? "s2" : ""}" data-s="2">Maîtrisé</button></span>
  <span>${esc(c.t)}${c.mandatory ? ' <span class="tag bad">obligatoire</span>' : ""}${c.eval ? ` <span class="small muted">· ${esc(c.eval)}</span>` : ""}</span></div>`;
}
function aaBlock(a, showCourses = true) {
  return `<div class="aa"><div class="aa-h"><div class="aa-t">${esc(a.t)}<div class="code">${esc(a.code)} · ${esc(a.sem)}</div></div><div>${stTag(a)}</div></div>
  ${showCourses ? `<div class="small" style="margin:6px 0">Se valide dans : ${a.courses.map(courseLink).join(" · ") || "—"}</div>` : ""}
  <div style="margin:6px 0 4px">${bar(aaScore(a))}</div>
  ${a.crit.length ? a.crit.map((c, i) => critRow(a, i, c)).join("") : '<div class="empty small">Critères non détaillés (hors de ton parcours langues). Lance une synchro PITCH pour les récupérer.</div>'}
  <label class="chk" style="margin-top:8px"><input type="checkbox" data-pitch="${esc(a.code)}" ${S.p[a.code] ? "checked" : ""}> Validé officiellement dans PITCH</label></div>`;
}
function courseSide(sel, kind) {
  const groups = {};
  Object.entries(COURSES).forEach(([k, v]) => { (groups[v.g] = groups[v.g] || []).push(k); });
  return `<div class="side">${Object.entries(groups).map(([g, ks]) => `<div class="grp">${esc(g)}</div>` + ks.map((k) => `<button class="${k === sel ? "on" : ""}" data-pick="${kind}" data-course="${esc(k)}">${esc(COURSES[k].n)}</button>`).join("")).join("")}</div>`;
}

/* ===================== ÉVÉNEMENTS DÉLÉGUÉS ===================== */
V.addEventListener("click", (e) => {
  const t = e.target;
  const tri = t.closest(".tri button");
  if (tri) { const k = tri.parentElement.dataset.k, s = +tri.dataset.s; if (s === 0) delete S.c[k]; else S.c[k] = s; save(); return rerenderKeep(); }
  const lnk = t.closest("[data-go]");
  if (lnk) { e.preventDefault(); return go(lnk.dataset.go, { course: lnk.dataset.course }); }
  const pick = t.closest("[data-pick]");
  if (pick) { if (pick.dataset.pick === "cours") selCourse = pick.dataset.course; else selFiche = pick.dataset.course; render(); if (window.innerWidth > 760) window.scrollTo(0, 0); return; }
  const comp = t.closest("[data-opencomp]");
  if (comp) { openC = comp.dataset.opencomp; return go("comp"); }
  const pf = t.closest("[data-pf]");
  if (pf) { planFilter = pf.dataset.pf; return render(); }
  const act = t.closest("[data-act]");
  if (act) actions[act.dataset.act]?.(act);
});
V.addEventListener("change", (e) => {
  const t = e.target;
  if (t.dataset.task) { if (t.checked) S.t[t.dataset.task] = 1; else delete S.t[t.dataset.task]; save(); return rerenderKeep(); }
  if (t.dataset.pitch) { if (t.checked) S.p[t.dataset.pitch] = 1; else delete S.p[t.dataset.pitch]; save(); return rerenderKeep(); }
  if (t.id === "offToggle") { S.off = t.checked; save(); return rerenderKeep(); }
  if (t.id === "importFile" && t.files[0]) importBackup(t.files[0]);
});
let noteTimer = null;
V.addEventListener("input", (e) => {
  if (e.target.dataset.note) { S.n[e.target.dataset.note] = e.target.value; clearTimeout(noteTimer); noteTimer = setTimeout(save, 600); }
});

/* ===================== VUES ===================== */
function rDash() {
  const n = now();
  const inP = AALIST.filter((a) => !a.off);
  const ready = inP.filter((a) => ["ok", "pitch"].includes(aaState(a))).length;
  const allCrit = inP.reduce((x, a) => x + a.crit.length, 0);
  const okCrit = inP.reduce((x, a) => x + a.crit.filter((_, i) => S.c[cid(a, i)] === 2).length, 0);
  const exams = EVENTS.filter((e) => e.isExam && e.end > n).slice(0, 6);
  const next = EVENTS.filter((e) => e.end > n && !["Férié", "Vacances"].includes(e.type)).slice(0, 7);
  const tasks = TASKS.filter((t) => !S.t[t.id] && daysUntil(t.date) <= 7 && t.ev.end > n).sort((a, b) => a.date - b.date).slice(0, 8);
  const comps = COMP.filter((c) => !c.missing);
  V.innerHTML = `
  <h2>Bonjour Jo 👋</h2><p class="sub">${fmtDL.format(n)} · ${inP.length} AA dans ton parcours ${esc(PITCH_META.programTitle ? "CP_FISE" : "")}. Seuil PITCH : 70 % par compétence.</p>
  <div class="grid g4">
    <div class="card stat"><div class="v count">${ready}/${inP.length}</div><div class="l">AA prêts ou validés</div></div>
    <div class="card stat"><div class="v count">${okCrit}/${allCrit}</div><div class="l">critères maîtrisés</div></div>
    <div class="card stat"><div class="v count">${exams.length ? daysUntil(exams[0].start) + " j" : "–"}</div><div class="l">avant ${exams.length ? esc(exams[0].name) : "la prochaine évaluation"}</div></div>
    <div class="card stat"><div class="v count">${tasks.length}</div><div class="l">tâches de révision cette semaine</div></div>
  </div>
  <div class="grid g2" style="margin-top:14px">
    <div class="card"><div class="row between"><h3>À faire cette semaine</h3><button class="btn" data-go="plan">Planning →</button></div>
      ${tasks.length ? tasks.map(taskRow).join("") : '<div class="empty">Rien d\'urgent. Avance sur un AA « à travailler ».</div>'}</div>
    <div class="card"><h3>Évaluations à venir</h3><div class="list">${exams.map(evRow).join("") || '<div class="empty">Aucune</div>'}</div></div>
  </div>
  <div class="grid g2" style="margin-top:14px">
    <div class="card"><h3>Progression par compétence</h3>
      ${comps.map((c) => { const p = compScore(c); return `<div style="margin:10px 0;cursor:pointer" data-opencomp="${c.code}"><div class="row between small"><span><b>${c.code}</b> <span class="muted">${esc(c.t.slice(0, 60))}…</span></span><span class="count">${Math.round(p * 100)} %</span></div>${bar(p, 70)}</div>`; }).join("")}
      <div class="small muted" style="margin-top:8px">C02 et C12 : aucun RA rattaché dans PITCH pour le CP_FISE (voir l'onglet Compétences).</div>
    </div>
    <div class="card"><h3>Prochains cours</h3><div class="list">${next.map(evRow).join("")}</div></div>
  </div>`;
}

function rComp() {
  const openSet = new Set([...document.querySelectorAll("details.c[open]")].map((d) => d.dataset.c));
  if (openC) openSet.add(openC); openC = null;
  V.innerHTML = `<h2>Compétences, RA et AA</h2><p class="sub">Auto-évalue chaque critère PITCH : <b>En cours</b> = 50 %, <b>Maîtrisé</b> = 100 %. Un AA coché « Validé PITCH » compte à 100 %. ${PITCH_META.snapshot ? "Référentiel du 15/11 : lance une synchro PITCH pour la version à jour." : "Référentiel PITCH synchronisé le " + fmtDT(new Date(PITCH_META.extractedAt)) + "."}</p>
  <div class="toolbar"><label class="chk"><input type="checkbox" id="offToggle" ${S.off ? "checked" : ""}> Afficher les AA hors de mon parcours (LV2 débutant, FLE)</label></div>
  ${COMP.map((c) => {
    if (c.missing) return `<details class="c ghost" data-c="${c.code}"><summary><div class="row between"><b>${c.code}</b><span class="tag">Pas dans PITCH CP_FISE</span></div><div class="small muted" style="margin-top:4px">${esc(c.t)}</div></summary>
      <div class="inner small">Cette compétence fait partie du référentiel ICAM, mais PITCH ne lui rattache <b>aucun RA ni AA</b> dans ton programme CP_FISE (elle n'apparaît que dans le programme Bachelor). ${c.code === "C12" ? "Elle se travaille en pratique via l'Experiment, les langues et la mobilité internationale. Demande à ton responsable de promo si elle est évaluée ailleurs (stage, mobilité)." : "Demande à ton responsable de promo si elle est évaluée hors PITCH."} Si des RA apparaissent plus tard, la synchro PITCH les ajoutera ici automatiquement.</div></details>`;
    const p = compScore(c), aas = c.ra.flatMap((r) => r.aa).filter((a) => !a.off);
    return `<details class="c" data-c="${c.code}" ${openSet.has(c.code) ? "open" : ""}><summary><div class="row between"><b>${c.code}</b><span class="small count">${aas.filter((a) => ["ok", "pitch"].includes(aaState(a))).length}/${aas.length} AA · ${Math.round(p * 100)} %</span></div>
    <div class="small muted" style="margin:4px 0 8px">${esc(c.t)}</div>${bar(p, 70)}</summary>
    <div class="inner">${c.ra.map((r) => `<div class="ra"><div class="ra-h">RA · ${esc(r.t)} <span class="code">${esc(r.code)}</span></div>${r.aa.filter(inParcours).map((a) => aaBlock(a)).join("")}</div>`).join("")}</div></details>`;
  }).join("")}`;
}

function rCours() {
  const k = selCourse, c = COURSES[k], aas = courseAA(k), n = now();
  const evs = courseEvents(k), up = evs.filter((e) => e.end > n), exams = evs.filter((e) => e.isExam);
  const p = aas.length ? aas.reduce((x, a) => x + aaScore(a), 0) / aas.length : 0;
  V.innerHTML = `<h2>Par cours</h2><p class="sub">Pour chaque cours : les AA PITCH qu'il permet de valider, les séances restantes et les évaluations.</p>
  <div class="split">${courseSide(k, "cours")}<div>
   <div class="card"><div class="row between" style="flex-wrap:wrap"><div><h3 style="margin:0">${esc(c.n)}</h3><div class="code">${esc(k)}</div></div><button class="btn pri" data-go="fiches" data-course="${esc(k)}">Ouvrir la fiche</button></div>
   ${c.x ? `<div class="box w small">${esc(c.x)}</div>` : ""}
   <div class="grid g4" style="margin-top:12px">
    <div><div class="small muted">AA liés</div><b class="count">${aas.length}</b></div>
    <div><div class="small muted">Séances restantes</div><b class="count">${up.filter((e) => !e.isExam).length}</b></div>
    <div><div class="small muted">Évaluations planifiées</div><b>${exams.length ? exams.map((e) => fmtD.format(e.start)).join(", ") : "Pendant l'activité"}</b></div>
    <div><div class="small muted">Progression</div><b class="count">${Math.round(p * 100)} %</b></div></div></div>
   <h3 style="margin:18px 0 6px">AA à valider dans ce cours</h3>
   ${aas.length ? aas.map((a) => `<div class="small muted" style="margin-top:10px">${a.comp} · RA : ${esc(RA[a.ra].t)}</div>` + aaBlock(a, false)).join("") : '<div class="empty">Aucun AA PITCH n\'est rattaché directement à ce cours.</div>'}
   <h3 style="margin:18px 0 6px">Séances à venir</h3><div class="card"><div class="list">${up.map(evRow).join("") || '<div class="empty">Aucune séance à venir dans HyperPlanning.</div>'}</div></div>
   <h3 style="margin:18px 0 6px">Mes notes</h3><textarea data-note="${esc(k)}" placeholder="Questions pour le prof, points flous, liens vers le Moodle…">${esc(S.n[k] || "")}</textarea>
  </div></div>`;
}

function rPlan() {
  const n = now(), today = dayKey(n);
  let evs = EVENTS.filter((e) => dayKey(e.end) >= today);
  if (planFilter === "exam") evs = evs.filter((e) => e.isExam);
  const tasks = TASKS.filter((t) => t.ev.end > n && (planFilter !== "todo" || !S.t[t.id]));
  const days = {};
  evs.forEach((e) => { (days[dayKey(e.start)] = days[dayKey(e.start)] || { e: [], t: [] }).e.push(e); });
  if (planFilter !== "exam") tasks.forEach((t) => { const k = dayKey(t.date) < today ? today : dayKey(t.date); (days[k] = days[k] || { e: [], t: [] }).t.push(t); });
  let lastW = "";
  const html = Object.keys(days).sort().map((k) => {
    const d = new Date(k + "T12:00:00Z"), mon = new Date(d); mon.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    const wk = mon.toISOString().slice(0, 10); let head = "";
    if (wk !== lastW) { lastW = wk; head = `<div class="week">Semaine du ${fmtD.format(mon)}</div>`; }
    const x = days[k];
    return head + `<div class="day"><div class="day-h">${fmtDL.format(d)}${k === today ? ' <span class="tag acc">Aujourd\'hui</span>' : ""}</div>
     ${x.t.sort((a, b) => a.date - b.date).map(taskRow).join("")}
     ${x.e.map((e) => `<div class="ev ${e.isExam ? "exam" : ""}"><div class="t">${e.allDay ? "Journée" : fmtT.format(e.start) + "–" + fmtT.format(e.end)}</div><div style="flex:1;min-width:0"><div class="n">${esc(e.name)} ${e.isExam ? `<span class="tag exam">${esc(e.type)}</span>` : `<span class="tag">${esc(e.type)}</span>`}</div>
      <div class="small muted">${[esc(e.note), esc(e.location), e.courses[0] && COURSES[e.courses[0]] ? `<a href="#cours" data-go="cours" data-course="${esc(e.courses[0])}">${courseAA(e.courses[0]).length} AA liés</a>` : ""].filter(Boolean).join(" · ")}</div></div></div>`).join("")}</div>`;
  }).join("");
  const done = TASKS.filter((t) => S.t[t.id]).length;
  const src = PLAN_META.source === "live" ? `HyperPlanning en direct · mis à jour ${fmtDT(new Date(PLAN_META.fetchedAt))}` : PLAN_META.source === "cache" ? `Dernière version connue (${fmtDT(new Date(PLAN_META.fetchedAt))}) · HyperPlanning injoignable` : "Instantané du 15/11/2026 (déploie le site pour la mise à jour automatique)";
  V.innerHTML = `<h2>Planning &amp; plan de révision</h2><p class="sub">Heure de Paris. Le plan de révision (J-14, J-7, J-3, J-1) est recalculé automatiquement à chaque changement d'examen. ${done}/${TASKS.length} tâches faites.</p>
  <div class="row between" style="flex-wrap:wrap;margin-bottom:12px"><span class="tag ${PLAN_META.source === "live" ? "ok" : "warn"}">${esc(src)}</span>${API.online && API.ical ? '<button class="btn" data-act="refreshPlan">Actualiser maintenant</button>' : ""}</div>
  <div class="filters">${[["all", "Tout"], ["todo", "Tâches non faites + cours"], ["exam", "Évaluations seulement"]].map(([k, l]) => `<button class="pill ${planFilter === k ? "on" : ""}" data-pf="${k}">${l}</button>`).join("")}</div>
  <div class="legend"><span>📝 révision d'examen</span><span>🎤 préparation de soutenance</span><span style="color:var(--bad)">■ tâche en retard</span></div>
  ${html}`;
}

function rFiches() {
  const F = window.FICHES || {};
  const k = F[selFiche] ? selFiche : "I4.7.MEO.02";
  const aas = courseAA(k), exams = courseEvents(k).filter((e) => e.isExam && e.end > now());
  V.innerHTML = `<h2>Fiches de révision &amp; de travail</h2><p class="sub">Construites à partir des critères PITCH de chaque cours. À compléter avec tes supports de cours.</p>
  <div class="split">${courseSide(k, "fiche")}<div class="card fiche">
   <div class="row between" style="flex-wrap:wrap"><div><h3 style="margin:0">${esc(COURSES[k].n)}</h3><div class="code">${esc(k)}</div></div><div>${exams.map((e) => `<span class="tag exam">${esc(e.type)} · ${fmtD.format(e.start)}</span>`).join(" ")}</div></div>
   ${aas.length ? `<div class="box small"><b>Ce que PITCH évalue ici :</b> ${aas.map((a) => esc(a.t) + ` <span class="code">(${a.comp})</span>`).join(" ; ")}. <a href="#cours" data-go="cours" data-course="${esc(k)}">S'auto-évaluer →</a></div>` : ""}
   ${F[k] || '<p class="empty">Fiche à venir.</p>'}
  </div></div>`;
}
window.pickFiche = (k) => { selFiche = k; render(); };

function rSync() {
  const origin = location.origin;
  const bm = `javascript:(function(){var s=document.createElement('script');s.src='${origin}/pitch-sync.js?'+Date.now();document.body.appendChild(s);})();`;
  V.innerHTML = `<h2>Synchronisation</h2><p class="sub">D'où viennent tes données et comment les mettre à jour.</p>
  <div class="grid g2">
   <div class="card"><h3>📅 HyperPlanning</h3><dl class="kv">
     <dt>Source</dt><dd>${PLAN_META.source === "live" ? "Lien iCal, en direct" : PLAN_META.source === "cache" ? "Dernière version connue" : "Instantané du 15/11"}</dd>
     <dt>Mis à jour</dt><dd>${PLAN_META.fetchedAt ? fmtDT(new Date(PLAN_META.fetchedAt)) : "—"}</dd>
     <dt>Créneaux</dt><dd>${EVENTS.length}</dd></dl>
     ${PLAN_META.warning ? `<div class="box w small">${esc(PLAN_META.warning)}</div>` : ""}
     <p class="small muted">Le serveur relit ton lien iCal (variable <span class="f">ICAL_URL</span>, jamais visible dans le navigateur) au plus toutes les 15 minutes.</p>
     ${API.online && API.ical ? '<button class="btn" data-act="refreshPlan">Actualiser maintenant</button>' : '<div class="box w small">Non configuré : ajoute <span class="f">ICAL_URL</span> dans Vercel.</div>'}</div>
   <div class="card"><h3>🎓 PITCH</h3><dl class="kv">
     <dt>Référentiel</dt><dd>${PITCH_META.snapshot ? "Instantané du 15/11" : "Synchronisé"}</dd>
     <dt>Date</dt><dd>${PITCH_META.extractedAt ? fmtDT(new Date(PITCH_META.extractedAt)) : "—"}</dd>
     <dt>Contenu</dt><dd>${COMP.filter((c) => !c.missing).length} compétences · ${Object.keys(RA).length} RA · ${AALIST.length} AA</dd></dl>
     <p class="small">PITCH n'a pas d'accès public : la synchro passe par <b>ta</b> session, avec un favori.</p>
     ${API.online && API.store ? `<ol class="small" style="padding-left:18px"><li>Glisse ce bouton dans ta barre de favoris : <a class="bm" href="${esc(bm)}" onclick="event.preventDefault()">Synchroniser PITCH</a></li><li>Ouvre PITCH (connectée) et clique sur le favori.</li><li>Recharge ce site : compétences, RA, AA, critères et progression officielle sont à jour.</li></ol>` : '<div class="box w small">Disponible après le déploiement sur Vercel avec le stockage Upstash.</div>'}</div>
   <div class="card"><h3>💾 Ma progression</h3><p class="small">${API.online && API.store ? "Enregistrée sur ton serveur (Upstash Redis) : la même sur ordinateur et téléphone." : "Enregistrée dans ce navigateur uniquement."}</p>
     <div class="row" style="flex-wrap:wrap"><button class="btn" data-act="exportBackup">Exporter une sauvegarde</button><label class="btn" style="cursor:pointer">Restaurer…<input type="file" id="importFile" accept="application/json" hidden></label></div>
     <div id="bkmsg" class="small" style="margin-top:8px"></div></div>
   <div class="card"><h3>🔒 Session</h3><p class="small">${API.online ? "Connectée à ton site." : "Aperçu hors ligne (pas de serveur)."}</p>${API.online ? '<button class="btn" data-act="logout">Se déconnecter de cet appareil</button>' : ""}</div>
  </div>`;
}

/* ===================== ACTIONS ===================== */
const actions = {
  async refreshPlan(btn) {
    btn.disabled = true; btn.textContent = "Actualisation…";
    try { const r = await api("/api/planning?refresh=1"); const d = await r.json(); if (!r.ok) throw new Error(d.error || r.status); loadPlanning(d); render(); }
    catch (e) { btn.textContent = "Échec : " + e.message; }
  },
  exportBackup() {
    const blob = new Blob([JSON.stringify(S, null, 1)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "suivi-icam-sauvegarde-" + dayKey(now()) + ".json"; a.click();
  },
  logout() { try { localStorage.removeItem("suivi-icam-pwd"); } catch (e) {} PWD = ""; location.reload(); },
};
async function importBackup(file) {
  const m = document.getElementById("bkmsg");
  try { const d = JSON.parse(await file.text()); if (!d || typeof d.c !== "object") throw new Error("fichier invalide"); S = Object.assign({ c: {}, p: {}, t: {}, n: {}, off: false }, d); save(); m.style.color = "var(--ok)"; m.textContent = "✓ Sauvegarde restaurée."; }
  catch (e) { m.style.color = "var(--bad)"; m.textContent = "Restauration impossible : " + e.message; }
}

/* liens dans les fiches (onclick pickFiche) et clics hors de #view */
document.addEventListener("click", (e) => { const l = e.target.closest("header [data-go]"); if (l) { e.preventDefault(); go(l.dataset.go); } });

boot().catch((e) => { V.innerHTML = `<div class="card"><h3>Erreur de chargement</h3><p class="small">${esc(e.message)}</p></div>`; setSync("Erreur"); });
