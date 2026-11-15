# Mon Suivi ICAM

Site personnel de suivi des compétences CP_FISE (PITCH), synchronisé avec HyperPlanning, avec plan de révision automatique et fiches par cours.

## Ce que fait le site

| Fonction | Comment |
|---|---|
| Compétences, RA, AA, critères | Référentiel PITCH ; mise à jour en un clic avec le favori « Synchroniser PITCH » |
| Emploi du temps | Lu en direct depuis ton lien iCal HyperPlanning par le serveur (lien gardé secret, rafraîchi toutes les 15 min) |
| Plan de révision | Généré automatiquement avant chaque examen / soutenance (J-14, J-7, J-3, J-1) et recalculé si une date change |
| Progression | Auto-évaluation critère par critère, enregistrée sur le serveur : la même sur ordinateur et téléphone |
| Fiches | Une fiche de révision par cours (`public/fiches.js`) |
| Protection | Tout passe par un mot de passe (`APP_PASSWORD`) |

## Mise en ligne sur Vercel (≈ 15 min, gratuit)

### 1. Mettre le code sur GitHub
1. Crée un compte sur https://github.com si tu n'en as pas.
2. **New repository** → nom `suivi-icam` → **Private** → *Create repository*.
3. Clique sur **uploading an existing file**, glisse **tout le contenu** du dossier `suivi-icam` (les dossiers `api`, `public`, `scripts` et les fichiers `package.json`, `vercel.json`…), puis **Commit changes**.

### 2. Créer le projet Vercel
1. Va sur https://vercel.com et connecte-toi **avec GitHub** (offre Hobby, gratuite).
2. **Add New… → Project** → importe `suivi-icam`.
3. *Framework Preset* : **Other**. Ne touche à rien d'autre → **Deploy**.

### 3. Ajouter le stockage (pour la progression et PITCH)
1. Dans le projet Vercel : onglet **Storage** → **Create Database** → **Upstash for Redis** (offre gratuite).
2. Région **Paris / eu-west** si proposée → **Connect** au projet `suivi-icam`.
   Les variables `KV_REST_API_URL` et `KV_REST_API_TOKEN` sont ajoutées automatiquement.

### 4. Ajouter tes variables secrètes
**Settings → Environment Variables**, ajoute :

| Nom | Valeur |
|---|---|
| `APP_PASSWORD` | un mot de passe de ton choix (long) |
| `ICAL_URL` | ton lien iCal HyperPlanning complet (celui qui finit par `Edt_KIPULU.ics?…`) |

Puis **Deployments → ⋯ → Redeploy** pour que les variables soient prises en compte.

### 5. Première utilisation
1. Ouvre l'adresse de ton site (`https://suivi-icam-xxxx.vercel.app`) et entre ton mot de passe.
2. Onglet **Synchro** → glisse le bouton violet **Synchroniser PITCH** dans ta barre de favoris.
3. Ouvre PITCH (connectée), clique sur le favori : en ~30 s ton référentiel complet (avec les critères et la progression officielle) est envoyé à ton site.
4. Recharge ton site. ✅

> Pense à re-cliquer sur le favori PITCH après chaque période d'évaluation pour récupérer les validations officielles.

## Modifier le site
- **Fiches** : `public/fiches.js` (HTML simple, une entrée par code de cours).
- **Liste des cours / regroupements** : objet `COURSES` en haut de `public/app.js`.
- **Langues hors parcours** : fonction `OFF_COURSES` dans `public/app.js`.
- Chaque modification poussée sur GitHub est redéployée automatiquement par Vercel.

## Tester en local (facultatif)
```bash
npm run dev            # http://localhost:3000 (mode hors ligne, données du 15/11)
MOCK=1 MOCK_ICS=chemin/vers/test.ics APP_PASSWORD=test ICAL_URL=http://localhost:3000/__ics \
KV_REST_API_URL=http://localhost:3000/__redis KV_REST_API_TOKEN=x npm run dev   # avec faux serveur
```

## Sécurité
- Le lien iCal (qui contient une clé personnelle) n'est **jamais** envoyé au navigateur : seul le serveur le lit.
- Toutes les routes `/api/*` exigent le mot de passe ; la page n'est pas indexée par les moteurs de recherche.
- Le favori PITCH lit tes données avec ta propre session, directement dans ton navigateur, et ne les envoie qu'à **ton** site.
- Ton mot de passe PITCH n'est jamais demandé ni stocké.

## Structure
```
api/            fonctions serverless Vercel
  planning.js   lecture du lien iCal → créneaux
  state.js      progression (Upstash Redis)
  pitch.js      réception / lecture du référentiel PITCH
  ping.js       vérification du mot de passe
  _lib.js, _ics.js
public/         site statique
  index.html, styles.css, app.js, fiches.js, pitch-sync.js
  data/pitch.json, data/planning.json   (instantanés du 15/11/2026, utilisés en secours)
scripts/dev-server.js   serveur local
```
