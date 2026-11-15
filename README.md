# Mon Suivi ICAM

Site personnel de suivi des compétences CP_FISE (PITCH), synchronisé avec HyperPlanning, avec calendrier, plan de révision automatique et fiches par cours.
Version 2 : Next.js 15, mode clair / sombre, animations, vrai calendrier.

## Ce que fait le site

| Fonction | Comment |
|---|---|
| Tableau de bord | Compte à rebours jusqu'à la prochaine évaluation, cours du jour, tâches de la semaine, anneaux de progression par compétence |
| Compétences, RA, AA, critères | Référentiel PITCH, auto-évaluation par critère (pas vu / en cours / maîtrisé), « Validé dans PITCH », seuil de 70 % |
| Calendrier | Vues Mois, Semaine, Liste ; clic sur un créneau → salle, AA liés, fiche, tâches de révision. Tout en heure de Paris |
| Emploi du temps | Lu depuis ton lien iCal HyperPlanning par le serveur (lien gardé secret, rafraîchi toutes les 15 min, bouton « Actualiser ») |
| Plan de révision | J-14, J-7, J-3, J-1 avant chaque examen / soutenance / jury, recalculé si une date change |
| Fiches | Une fiche de révision par cours |
| Progression | Enregistrée sur le serveur : la même sur ordinateur et téléphone. Export / restauration en JSON |
| Protection | Mot de passe (`APP_PASSWORD`), session de 180 jours par appareil |

## Mise en ligne sur Vercel

### 1. Le code sur GitHub
Le dépôt `suivi-icam` (privé) contient tout le projet. Chaque `git push` sur la branche de production redéploie le site.

### 2. Le projet Vercel
1. https://vercel.com → **Add New… → Project** → importe `suivi-icam`.
2. *Framework Preset* : **Next.js** (détecté automatiquement). Ne change rien d'autre.
3. La région des fonctions est fixée à Paris (`cdg1`) dans `vercel.json`.

> Projet déjà créé avec la v1 (preset « Other ») : **Settings → Build and Deployment → Framework Preset → Next.js**, et vide les champs *Output Directory* / *Build Command* s'ils avaient été remplis, puis redéploie.

### 3. Le stockage (Upstash Redis)
1. Projet Vercel → **Storage** → **Create Database** → **Upstash for Redis** (offre gratuite), région **Paris / eu-west**.
2. **Connect** au projet. Les variables `KV_REST_API_URL` et `KV_REST_API_TOKEN` sont ajoutées automatiquement.

Déjà fait avec la v1 ? Rien à refaire : la v2 retrouve ta progression et ton référentiel PITCH (anciennes clés `suivi:*`) et les recopie sous `user:jo:*`.

### 4. Les variables d'environnement
**Settings → Environment Variables** :

| Nom | Obligatoire | Valeur |
|---|---|---|
| `APP_PASSWORD` | oui | un mot de passe long, de ton choix |
| `ICAL_URL` | oui | ton lien iCal HyperPlanning complet (celui qui finit par `.ics?…`) |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | oui | ajoutées par l'intégration Upstash (ou `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`) |
| `SESSION_SECRET` | non | secret de signature des sessions ; sinon dérivé d'`APP_PASSWORD` (changer le mot de passe déconnecte alors tous les appareils) |
| `APP_USER_ID` | non | identifiant de stockage, `jo` par défaut |

Puis **Deployments → ⋯ → Redeploy**. Sans `APP_PASSWORD`, le site en ligne refuse tout accès (erreur 503) au lieu d'être ouvert à tous.

> Ne mets jamais le lien iCal ni le mot de passe dans le code ou dans un commit : uniquement dans les variables Vercel (ou dans un fichier `.env.local`, ignoré par git).

### 5. Le favori PITCH
1. Ouvre ton site → onglet **Synchro** → glisse le bouton **Synchroniser PITCH** dans ta barre de favoris.
2. Ouvre PITCH (connectée), clique sur le favori : en ~30 s ton référentiel complet (critères + progression officielle) est envoyé à ton site. Au premier usage, il te demande le mot de passe du site.
3. Recharge ton site.

Ancien favori de la v1 : il continue de fonctionner tel quel. Pense à re-cliquer après chaque période d'évaluation.

## Développement local
```bash
npm install
npm run dev                 # http://localhost:3000
```
Sans `APP_PASSWORD`, l'accès local est libre ; sans Upstash, la progression est enregistrée dans `.data/store.json` ; sans `ICAL_URL`, le planning vient de l'instantané `data/planning-snapshot.json`.
Pour tester avec tes vraies données, crée un fichier `.env.local` (copie de `.env.example`).

Vérifications : `npx tsc --noEmit`, `npm run build`, `npm test` (logique), `npm run e2e` (Playwright, voir `CLAUDE.md`).

## Modifier le site
- **Fiches** : `data/fiches.ts` (HTML simple, une entrée par code de cours ; liens internes `/fiches/<code>`).
- **Liste des cours / regroupements** : `lib/courses.ts`.
- **Prénom, cours hors parcours, compétences absentes de PITCH** : `config/profile.ts`.
- Architecture, conventions et pièges : [CLAUDE.md](CLAUDE.md). Évolutions prévues : [docs/ROADMAP.md](docs/ROADMAP.md).

## Sécurité
- Le lien iCal (qui contient une clé personnelle) n'est **jamais** envoyé au navigateur : seul le serveur le lit.
- Toutes les pages et les routes `/api/*` exigent une session (cookie httpOnly signé HMAC), sauf la connexion et la réception PITCH, protégée par le mot de passe en en-tête et limitée (CORS) au site PITCH.
- Le site n'est pas indexé par les moteurs de recherche.
- Le favori PITCH lit tes données avec ta propre session, dans ton navigateur, et ne les envoie qu'à **ton** site. Ton mot de passe PITCH n'est jamais demandé ni stocké.
