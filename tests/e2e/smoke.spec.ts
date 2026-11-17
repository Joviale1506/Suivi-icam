import { expect, test, type Page } from "@playwright/test";

const PASSWORD = process.env.E2E_PASSWORD || "";
const SHOTS = "tests/e2e/screens";

async function login(page: Page) {
  await page.goto("/");
  if (page.url().includes("/login")) {
    await page.getByLabel("Mot de passe").fill(PASSWORD);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/login"));
  }
}
async function noHorizontalScroll(page: Page) {
  // Mesure réelle : aucun élément visible ne doit dépasser le bord droit (un overflow caché masquerait le problème)
  const iw = page.viewportSize()!.width; // largeur fixe : en mobile, innerWidth grandit avec le contenu
  const { sw, worst } = await page.evaluate(() => {

    let worst = "";
    let max = 0;
    for (const el of document.querySelectorAll("main *")) {
      let p: Element | null = el.parentElement;
      let clipped = false;
      while (p && p.tagName !== "MAIN") {
        const ox = getComputedStyle(p).overflowX;
        if (ox !== "visible") clipped = true;
        p = p.parentElement;
      }
      if (clipped) continue; // contenu d'une zone qui défile (tableau d'une fiche…)
      const r = el.getBoundingClientRect().right;
      if (r > max) {
        max = r;
        worst = el.tagName.toLowerCase() + "." + String(el.className).slice(0, 60);
      }
    }
    return { sw: Math.max(document.documentElement.scrollWidth, Math.ceil(max)), worst };
  });
  expect(sw, `défilement horizontal (${worst})`).toBeLessThanOrEqual(iw);
}
async function setTheme(page: Page, theme: "light" | "dark") {
  await page.evaluate((t) => localStorage.setItem("theme", t), theme);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(theme === "dark" ? /dark/ : /light/);
}

test("connexion : mauvais puis bon mot de passe", async ({ page }) => {
  test.skip(!PASSWORD, "E2E_PASSWORD non défini");
  await page.goto("/planning");
  await expect(page).toHaveURL(/\/login\?next=%2Fplanning/);
  await page.getByLabel("Mot de passe").fill("faux");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("incorrect");
  await page.getByLabel("Mot de passe").fill(PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/planning$/);
});

for (const theme of ["light", "dark"] as const) {
  test(`pages en mode ${theme}, sans défilement horizontal`, async ({ page }, info) => {
    await login(page);
    await setTheme(page, theme);
    for (const path of ["/", "/competences?c=C01&aa=AA-HUM-C01-CPE1-01", "/competences?c=C07", "/cours", "/cours/I4.7.MEO.02", "/fiches/I4.7.MEO.02", "/planning", "/synchro"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(900); // fin des animations d'entrée
      await noHorizontalScroll(page);
      const name = path.replace(/[/?=]+/g, "_") || "_";
      await page.screenshot({ path: `${SHOTS}/${info.project.name}-${theme}${name}.png`, fullPage: true });
    }
  });
}

test("calendrier : 3 vues, vue mémorisée, panneau latéral", async ({ page }, info) => {
  await login(page);
  await page.goto("/planning");
  for (const v of ["Semaine", "Liste", "Mois"] as const) {
    await page.getByRole("tab", { name: v }).click();
    await page.waitForTimeout(500);
    await noHorizontalScroll(page);
    await page.screenshot({ path: `${SHOTS}/${info.project.name}-cal-${v}.png`, fullPage: true });
  }
  // Semaine suivante (avec des cours)
  await page.getByRole("tab", { name: "Semaine" }).click();
  await page.getByRole("button", { name: "Suivant" }).click();
  await page.waitForTimeout(600);
  await noHorizontalScroll(page);
  await page.screenshot({ path: `${SHOTS}/${info.project.name}-cal-Semaine-suivante.png`, fullPage: true });
  await page.getByRole("tab", { name: "Liste" }).click();
  await page.reload();
  await expect(page.getByRole("tab", { name: "Liste" })).toHaveAttribute("aria-selected", "true");
  // Ouvre un créneau de la liste
  await page.locator("main button:has(.chip)").first().click();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  await expect(sheet).toBeInViewport({ ratio: 0.5 });
  await expect(sheet).toContainText("Horaire");
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/${info.project.name}-cal-panneau.png` });
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
});

test("la progression réapparaît après rechargement", async ({ page }) => {
  await login(page);
  const AA = "/competences?c=C01&aa=AA-HUM-C01-CPE1-01";
  await page.goto(AA);
  const ready = page.getByRole("main").getByRole("checkbox", { name: /Je me sens prête/ }).first();
  const wasReady = await ready.isChecked();
  await ready.click();
  await expect(ready).toBeChecked({ checked: !wasReady });
  // Tâche de révision cochée depuis le calendrier
  await page.goto("/planning");
  await page.getByRole("tab", { name: "Liste" }).click();
  const box = page.getByRole("main").getByRole("checkbox").first();
  const before = await box.getAttribute("aria-checked");
  const doneCount = async () => Object.keys(((await (await page.request.get("/api/state")).json()) as { t?: object }).t ?? {}).length;
  const n0 = await doneCount();
  await box.click();
  await expect(box).toHaveAttribute("aria-checked", before === "true" ? "false" : "true");
  await expect.poll(doneCount, { timeout: 10_000 }).toBe(n0 + (before === "true" ? -1 : 1));
  await page.evaluate(() => localStorage.removeItem("suivi-icam")); // preuve que ça vient du serveur
  await page.reload();
  await page.getByRole("tab", { name: "Liste" }).click();
  await expect(page.getByRole("main").getByRole("checkbox").first()).toHaveAttribute("aria-checked", before === "true" ? "false" : "true");
  await page.goto(AA);
  await expect(page.getByRole("main").getByRole("checkbox", { name: /Je me sens prête/ }).first()).toBeChecked({ checked: !wasReady });
});

test("recherche ⌘K insensible aux accents", async ({ page }, info) => {
  await login(page);
  await page.goto("/");
  await page.keyboard.press("Control+k");
  const box = page.getByRole("dialog", { name: "Recherche" });
  await expect(box).toBeVisible();
  await page.keyboard.type("gestion financiere");
  await expect(box.getByRole("option").first()).toContainText("Gestion financière");
  await page.screenshot({ path: `${SHOTS}/${info.project.name}-recherche.png` });
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/I4.7.MEO.02/);
});

test("bascule de thème manuelle", async ({ page, isMobile }) => {
  await login(page);
  await page.evaluate(() => localStorage.setItem("theme", "light"));
  await page.reload();
  if (isMobile) await page.getByRole("button", { name: /Thème/ }).click();
  else await page.getByRole("radio", { name: "Sombre" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
});
