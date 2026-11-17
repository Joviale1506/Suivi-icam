# Mon Suivi ICAM — guide du dépôt

Site de suivi académique (compétences PITCH, planning HyperPlanning, plan de révision, fiches).
Aujourd'hui pour une seule étudiante (Jo, CP_FISE), architecturé pour devenir multi-étudiants (voir [docs/ROADMAP.md](docs/ROADMAP.md)).

## Stack
Next.js 15 (App Router) · React 19 · TypeScript strict · Tailwind CSS 4 (`@tailwindcss/postcss`, mode sombre par classe `.dark`) ·
`motion` (import depuis `motion/react`) · `lucide-react` · `next-themes` · police Geist (paquet `geist`) · `@upstash/redis` · Vercel région `cdg1`.

## Commandes
```bash
npm run dev          # http://localhost:3000 (sans APP_PASSWORD : accès libre ; stockage dans .data/store.json)
npm run build        # build de production (vérifie aussi les types)
npx tsc --noEmit     # types
npm test             # logique pure (node --test) : tests/logic.test.ts
npm run e2e          # Playwright, site déjà lancé : E2E_BASE_URL=http://localhost:3100 E2E_PASSWORD=... npm run e2e
```
Les captures des tests de bout en bout vont dans `tests/e2e/screens/` (ignoré par git).

## Architecture
```
app/
  layout.tsx            racine : Geist, ThemeProvider + MotionConfig(reducedMotion="user"), fond animé
  login/                page de connexion
  (app)/layout.tsx      lit TOUTES les données côté serveur (lib/server/data.ts) → <AppProvider> → <Shell>
  (app)/template.tsx    transition de page
  (app)/{page,competences,cours/[code],planning,fiches/[code],synchro}
  api/auth/{login,logout}   cookie de session
  api/state             GET/PUT progression
  api/pitch             GET/POST/OPTIONS (favori PITCH, CORS)
  api/planning          GET (cache) / POST (forcer la relecture + revalidateTag)
middleware.ts           protection par mot de passe
lib/                    logique PURE, partagée client/serveur (aucun accès réseau ni secret)
  types.ts ics.ts dates.ts courses.ts referential.ts progress.ts
  auth/session.ts       HMAC via Web Crypto (utilisable dans le middleware Edge)
lib/server/             modules serveur (tous `import "server-only"`)
  store.ts              clé-valeur par utilisateur : user:<id>:progress|pitch|planning
  user.ts               utilisateur courant (APP_USER_ID, défaut "jo")
  data.ts               chargement des données d'une page (React cache)
  sources/calendar.ts   interface CalendarSource + IcalSource (HyperPlanning)
  sources/referential.ts interface ReferentialSource + pitchSource
config/profile.ts       SEULE configuration propre à Jo (prénom, programme, cours hors parcours, C02/C12)
data/                   pitch-snapshot.json, planning-snapshot.json (secours), fiches.ts (HTML des fiches)
components/             ui/ (primitives animées), shell/, providers/, calendar/, competences/, courses/, fiches/, dashboard/, sync/, planning/
public/pitch-sync.js    script du favori PITCH (exécuté sur pitch-icam.rima1.fr) — ne pas déplacer
```

### Flux de données
1. `app/(app)/layout.tsx` appelle `loadAppData()` : référentiel (Redis → instantané), planning (iCal en cache → Redis → instantané), progression (Redis).
2. `<AppProvider>` (client) normalise le référentiel, enrichit les créneaux (`mapEvents`), calcule les tâches (`buildTasks`) et gère la progression.
3. Chaque modification : copie immédiate dans `localStorage["suivi-icam"]` + `PUT /api/state` différé (700 ms, 900 ms pour les notes). Le drapeau `suivi-icam:dirty` reste posé tant que le serveur n'a pas confirmé ; au chargement, une copie locale « dirty » l'emporte et est renvoyée (cas d'un rechargement avant l'envoi).

## Données officielles (PITCH) — règle d'or
- Les pourcentages et statuts affichés viennent **uniquement** de PITCH (`aaOfficial`, `compOfficial`, `critState`… dans `lib/progress.ts`). `null` = pas de donnée → afficher « — », jamais 0 %.
- États : `validated` (validé) · `progress` (évalué, en cours) · `failed` (à rattraper) · `pending` (non évalué). Un critère est validé dès qu'une de ses itérations l'est.
- `interpretStatus()` (lib/referential.ts) traduit le statut brut PITCH (`CourseStatus`). **Provisoire** : les valeurs réelles sont à confirmer avec le favori « Diagnostic PITCH » (`/pitch-sync.js?diag=1`, télécharge les réponses brutes en local, n'envoie rien). Une valeur inconnue donne « évalué », jamais « validé ».
- L'auto-évaluation n'existe plus que sous la forme « je me sens prête » (`progress.c[id] === 2`), affichée à part, jamais comptée.
- Lien évaluation → créneaux : `lib/activities.ts` (cours + type compatible avec la modalité), corrections manuelles dans `config/activity-map.ts`.
- Academ Compass : **aucun appel, aucun connecteur** tant que l'école n'a pas donné son accord.

## Design system « Carnet »
- Papier `--bg` (clair) / encre (sombre), un seul accent `--accent` (cobalt), états `--ok` / `--warn` / `--none`, `--bad` réservé aux retards et erreurs. Jetons dans `app/globals.css`.
- Typo : `font-serif` Newsreader (titres `.t-page`, chiffre clé `.t-display`), Geist (interface), Geist Mono (codes `.t-code`), `.num` pour les chiffres tabulaires.
- Structure : `<Section>` (étiquette + filet), `.row` / `.row-link` (lignes de 44 px), `.panel` rarement. Pas de cartes, d'ombres, de dégradés, de verre ni d'emoji.
- Mouvement : 150–200 ms, `ease [0.2,0.8,0.2,1]`, fondu de page sans transform.
- Recherche ⌘K / `/` : `components/shell/command-palette.tsx` + `lib/search.ts` (insensible aux accents).
- PWA : `public/manifest.webmanifest` (installable).

## Conventions
- Interface et commentaires en français. Code en anglais.
- La logique métier va dans `lib/` (pure, testable avec `node --test`) ; les imports relatifs internes à `lib/` gardent l'extension `.ts`.
- Tout code qui lit un secret ou Redis va dans `lib/server/` avec `import "server-only"`.
- Couleur d'un cours (discrète : repère de 2 px ou pastille) : `hueStyle(code)` + classes `cc-soft`, `cc-solid`, `cc-text`, `cc-edge`, `pill-*` (globals.css). Ne pas utiliser de variante Tailwind (`sm:`, `dark:`) sur ces classes maison : leurs règles responsive / sombre sont déjà dans globals.css.
- Animations via `motion` ; `MotionConfig reducedMotion="user"` + règles CSS `prefers-reduced-motion` (point « maintenant »).
- Grilles : toujours `grid-cols-1` (ou `minmax(0,1fr)`) sur mobile, sinon un texte tronqué élargit la colonne et crée un défilement horizontal à 375 px.

## Pièges
- **Fuseau de Paris.** Tout l'affichage passe par `lib/dates.ts` (Intl, `timeZone: "Europe/Paris"`). Ne jamais utiliser `getHours()`/`getDate()` ni `toLocaleString()` sans fuseau. `lib/ics.ts` convertit les heures locales HyperPlanning (sans `Z`) en UTC avec la règle européenne (dernier dimanche de mars/octobre) : c'est un portage exact de la v1, ne pas « simplifier ».
- **Lien iCal secret.** `ICAL_URL` contient une clé personnelle : il n'est lu que dans `lib/server/sources/calendar.ts` et ne doit jamais apparaître dans une réponse, un log, un composant client ou un commit.
- **Cache du planning.** `fetch(ICAL_URL, { next: { revalidate: 900, tags: ["planning"] } })`. Le bouton « Actualiser » appelle `POST /api/planning` (lecture `no-store` + `revalidateTag("planning")`). Next ne met pas en cache les réponses de plus de 2 Mo : si l'export iCal grossit au-delà, mettre en cache le résultat de `parseIcs` (`unstable_cache`, même tag) plutôt que le texte brut.
- **CORS PITCH.** `/api/pitch` est exclue du middleware : elle vérifie elle-même l'en-tête `x-app-password` (ou la session). Seule l'origine `https://pitch-icam.rima1.fr` est autorisée ; `OPTIONS` répond 204. Toute réponse (même 401) doit porter les en-têtes CORS pour que le favori affiche l'erreur.
- **Identifiants stables.** Tâches : `t-<idEvenement>-<J>` ; événement : `e<AAAAMMJJ><HHMM UTC>` ; critère : `<codeAA>#<index>`. Ils servent de clés à la progression enregistrée : ne pas les changer. Conséquence connue (héritée de la v1) : si un examen change d'horaire, ses tâches changent d'identifiant et repartent non cochées.
- **Middleware et codes de cours.** Les codes contiennent des points (`/fiches/I4.7.MEO.02`) : la règle `matcher` exclut une liste d'extensions précise, jamais « tout ce qui contient un point ».
- **Éléments `fixed` dans les pages.** `(app)/template.tsx` anime `transform` et `filter`, ce qui crée un nouveau repère pour `position: fixed`. Les panneaux / modales passent par `createPortal(…, document.body)` (voir `EventSheet`).
- **URL `javascript:`.** React 19 les bloque dans `href` : le favori PITCH pose son lien via `setAttribute` (voir `sync-view.tsx`).
- **Reprise de la v1.** `store.ts` relit les anciennes clés `suivi:state|pitch|planning` si `user:<APP_USER_ID>:*` est vide, puis les recopie. La progression v1 du navigateur (`localStorage["suivi-icam"]`) est aussi reprise.
- **Production sans APP_PASSWORD** : le middleware renvoie 503 (le site n'est jamais ouvert à tous par erreur). En local, sans mot de passe, l'accès est libre.

## Tester en local avec un faux HyperPlanning / Redis
Le stockage de dev (`.data/store.json`) suffit pour la plupart des cas. Pour tester Redis, le cache iCal et la reprise des clés v1, lancer un faux serveur qui sert un `.ics` et imite l'API REST d'Upstash (POST d'une commande JSON `["GET", key]`, réponses en base64 si l'en-tête `Upstash-Encoding: base64` est présent), puis :
```bash
npm run build
APP_PASSWORD=test ICAL_URL=http://localhost:4545/ics KV_REST_API_URL=http://localhost:4545/redis KV_REST_API_TOKEN=x npx next start -p 3100
```
