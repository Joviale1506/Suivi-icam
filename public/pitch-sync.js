/* Synchronisation PITCH → Mon Suivi ICAM
   S'exécute sur pitch-icam.rima1.fr (via le favori), lit ton référentiel avec ta session
   et l'envoie à ton site. Rien n'est envoyé ailleurs. */
(async function () {
  const SRC = document.currentScript ? new URL(document.currentScript.src) : null;
  const SITE = (SRC && SRC.origin) || window.__SUIVI_SITE__;
  const PROGRAM = (SRC && SRC.searchParams.get("program")) || "CP_FISE";
  // Mode diagnostic (?diag=1) : télécharge les réponses brutes de PITCH sur CET ordinateur, n'envoie rien au site.
  const DIAG = !!(SRC && SRC.searchParams.get("diag") === "1");
  const RAW = {};

  async function extractPitch(program) {
    const j = (u) =>
      fetch(u, { credentials: "include" }).then((r) => {
        if (!r.ok) throw new Error(u + " → " + r.status);
        return r.json().then((d) => {
          if (DIAG) RAW[u] = d;
          return d;
        });
      });
    const progs = await j("/api/Program?culture=fr-fr");
    const prog = progs.find((p) => p.ProgramCode === program);
    if (!prog) throw new Error("Programme " + program + " introuvable (es-tu connectée à PITCH ?)");
    const V = prog.VersionCode;
    const blocks = await j(`/api/SkillBlock?ProgramCode=${program}&VersionCode=${V}&culture=fr-fr&simpleversion=false`);
    const out = { program, version: V, programTitle: prog.ProgramTitle, extractedAt: new Date().toISOString(),
      periods: (prog.SousPrograms || []).map((s) => s.Title), competences: [] };
    for (const b of blocks) {
      const comp = { code: b.Code, title: b.Title.replace(/^C\d+\s*:\s*/, ""), minPct: b.PctMinAcq, progress: b.Progress, ra: [] };
      const ras = await j(`/api/LearningGoal?BlockCode=${b.Code}&Graph=Bar&ProgramCode=${program}&VersionCode=${V}&culture=fr-fr`);
      for (const r of ras) {
        const ra = { code: r.LGCode, title: r.LGTitle, minPct: r.LGMinPct, progress: r.Progress,
          periods: (r.ProgramList || []).map((p) => p.ProgramCode.replace("P_", "").replace("_", ".")), aa: [] };
        const aas = await j(`/api/LearningGoal?BlockCode=${b.Code}&Graph=Bar&LGCode=${r.LGCode}&ProgramCode=${program}&VersionCode=${V}&culture=fr-fr`);
        for (const a of aas) {
          const aa = { code: a.Code, title: a.Title, progress: a.Progress, nbA: a.NBLO_A, nbNA: a.NBLO_NA, nbTotal: a.NBLO_Total,
            periods: (a.ProgramList || []).map((p) => p.ProgramCode.replace("P_", "").replace("_", ".")), crit: [] };
          const det = await j(`/api/locdetail?LGCode=${r.LGCode}&LOCode=${a.Code}&ParentProgramCode=${program}&culture=fr-fr`);
          for (const c of det || []) {
            aa.crit.push({ code: c.TraitCode, title: c.TraitTitle, mandatory: !!c.Mandatory,
              courses: (c.CourseList || []).map((x) => ({ code: x.CourseCode, title: x.Title, eval: x.EvaluationDescription,
                note: x.CourseNote, comment: x.Comment, status: x.CourseStatus, period: x.ProgramTitle, group: x.GroupCode })) });
          }
          ra.aa.push(aa);
        }
        comp.ra.push(ra);
      }
      out.competences.push(comp);
    }
    return out;
  }
  window.__extractPitch = extractPitch;
  if (window.__SUIVI_TEST__) return;

  const box = document.createElement("div");
  box.style.cssText = "position:fixed;z-index:99999;right:16px;bottom:16px;max-width:340px;background:#1f6f8b;color:#fff;font:14px/1.4 system-ui,sans-serif;padding:14px 16px;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,.25)";
  const say = (t) => { box.textContent = t; };
  document.body.appendChild(box);
  try {
    if (!/pitch-icam\.rima1\.fr$/.test(location.hostname)) throw new Error("Ouvre d'abord PITCH (pitch-icam.rima1.fr), puis clique sur le favori.");
    if (DIAG) {
      // Tous les programmes visibles (CP_FISE, Bachelor…) : rien n'est envoyé, un fichier est téléchargé localement.
      const progs = await fetch("/api/Program?culture=fr-fr", { credentials: "include" }).then((r) => r.json());
      RAW["/api/Program?culture=fr-fr"] = progs;
      const codes = progs.map((p) => p.ProgramCode).filter(Boolean);
      for (let i = 0; i < codes.length; i++) {
        say(`Diagnostic : programme ${codes[i]} (${i + 1}/${codes.length})… ne ferme pas l'onglet`);
        try { await extractPitch(codes[i]); } catch (e) { RAW["__erreur " + codes[i]] = String(e.message || e); }
      }
      const blob = new Blob([JSON.stringify({ when: new Date().toISOString(), programs: codes, responses: RAW }, null, 1)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "pitch-diagnostic-" + new Date().toISOString().slice(0, 10) + ".json";
      a.click();
      say(`✓ Diagnostic téléchargé (${Object.keys(RAW).length} réponses, programmes : ${codes.join(", ")}). Rien n'a été envoyé au site.`);
      setTimeout(() => box.remove(), 15000);
      return;
    }
    let pwd = localStorage.getItem("suivi-icam-pwd");
    if (!pwd) { pwd = prompt("Mot de passe de ton site Mon Suivi ICAM :"); if (!pwd) throw new Error("Synchronisation annulée."); }
    say("Lecture de PITCH en cours… (≈ 30 s)");
    const data = await extractPitch(PROGRAM);
    const nAA = data.competences.reduce((x, c) => x + c.ra.reduce((y, r) => y + r.aa.length, 0), 0);
    say(`Envoi de ${data.competences.length} compétences et ${nAA} AA…`);
    const r = await fetch(SITE + "/api/pitch", { method: "POST", headers: { "content-type": "application/json", "x-app-password": pwd }, body: JSON.stringify(data) });
    if (r.status === 401) { localStorage.removeItem("suivi-icam-pwd"); throw new Error("Mot de passe incorrect."); }
    if (!r.ok) throw new Error("Le site a répondu " + r.status + " : " + (await r.text()).slice(0, 120));
    localStorage.setItem("suivi-icam-pwd", pwd);
    say(`✓ PITCH synchronisé : ${data.competences.length} compétences, ${nAA} AA. Tu peux recharger ton site.`);
  } catch (e) {
    box.style.background = "#b3261e"; say("✗ " + e.message);
  }
  setTimeout(() => box.remove(), 12000);
})();
