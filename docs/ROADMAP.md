# Feuille de route : vers un outil multi-étudiants

Objectif : chaque étudiant colle le lien iCal de son agenda et/ou importe le référentiel de compétences de son école, et obtient au même endroit son planning, ses fiches de révision, ses rappels et sa progression.

La v2 prépare déjà le terrain :
- toutes les données sont rangées par utilisateur (`user:<id>:progress|pitch|planning`) ;
- l'utilisateur courant vient d'une seule fonction (`currentUserId()` dans `lib/server/user.ts`) ;
- les sources sont derrière des interfaces : `CalendarSource` (iCal) et `ReferentialSource` (PITCH) ;
- la logique métier est pure, dans `lib/`, réutilisable côté client et serveur ;
- les réglages propres à Jo sont isolés dans `config/profile.ts`.

---

## Étape 1 — Comptes et authentification
- Remplacer le mot de passe unique par **Auth.js** (connexion par lien e-mail + Google/Microsoft pour les comptes école) ou **Clerk** (plus rapide à intégrer, interface de gestion fournie).
- `currentUserId()` renvoie l'identifiant du fournisseur ; le middleware utilise la session du fournisseur.
- Migration : le compte de Jo reprend l'identifiant `jo` (ou on recopie `user:jo:*` vers son nouvel identifiant).
- Le favori PITCH, qui envoie aujourd'hui `x-app-password`, passe à un **jeton personnel** par étudiant (généré dans Synchro, révocable, stocké sous forme d'empreinte).

## Étape 2 — Base de données
- **Postgres** (Neon ou Supabase, région UE) avec un ORM typé (Drizzle).
- Tables : `users`, `profiles` (école, programme, prénom, réglages), `calendar_sources`, `referentials`, `progress_items` (critères, AA validés, tâches, notes), `revision_plans`, `reminders`.
- Redis reste le cache (planning parsé, limites de débit).
- Script de migration Redis → Postgres pour les données existantes.

## Étape 3 — Lien iCal par étudiant (chiffré)
- Formulaire « colle ton lien iCal » : validation (réponse `BEGIN:VCALENDAR`, aperçu des 5 prochains créneaux) avant enregistrement.
- Lien **chiffré** au repos (AES-GCM, clé dans une variable d'environnement, rotation possible). Il n'est jamais renvoyé au navigateur ; l'interface n'affiche que l'hôte et la date de dernière lecture.
- Cache par utilisateur (tag `planning:<userId>`) et limite de débit vers les serveurs des écoles.

## Étape 4 — Rappels
1. **E-mails** via **Resend** + **Vercel Cron** : chaque matin, les tâches J-x du jour et les évaluations à J-7 / J-1. Désinscription en un clic, préférences horaires.
2. **Notifications push** (Web Push + service worker, PWA installable) : mêmes rappels, plus « ton cours commence dans 15 min » pour qui l'active.
3. Détection des changements de planning (examen déplacé, salle modifiée) → notification + recalcul du plan de révision.

## Étape 5 — Fiches générées par IA
- Génération avec l'**API Anthropic** (Claude) à partir :
  - des critères d'évaluation du référentiel (ce que l'école évalue vraiment) ;
  - des supports déposés par l'étudiant (PDF de cours, diapos, notes) — stockage objet (Vercel Blob / S3) et extraction de texte.
- Sorties : fiche de synthèse, fiche flash, exercices type avec corrigés, questions probables de jury pour les oraux.
- Chaque fiche cite les passages des supports utilisés ; l'étudiant peut la corriger (versionnée).
- Garde-fous : quotas par utilisateur, génération en tâche de fond, pas d'envoi de données personnelles inutiles, consentement explicite pour l'envoi des documents.

## Étape 6 — Onboarding
1. Création du compte → choix de l'école et du programme (ou « autre »).
2. « Colle ton lien iCal » (avec tutoriel illustré par logiciel : HyperPlanning, Celcat, ADE, Google Agenda).
3. Import du référentiel : adaptateur de l'école si disponible, sinon import CSV/Excel, sinon mode « matières seulement ».
4. Choix des matières à suivre et des rappels → tableau de bord prêt.

## Étape 7 — Adaptateurs pour d'autres écoles
- `CalendarSource` : iCal générique (déjà là), ADE, Celcat, Google Agenda (OAuth), Outlook.
- `ReferentialSource` : PITCH (ICAM), import CSV/Excel générique, autres plateformes de compétences.
- Classification des titres de cours **par adaptateur** (la logique de `lib/ics.ts` → `classify()` est propre à HyperPlanning ICAM) avec un écran de correspondance « titre de l'agenda → matière ».
- Catalogue des cours (`lib/courses.ts`) et réglages (`config/profile.ts`) déplacés en base, par profil.

## Transverse
- RGPD : export et suppression du compte en libre-service, registre des traitements, hébergement UE.
- Observabilité : journaux structurés sans secrets, alertes sur les échecs de lecture iCal.
- Tests : étendre `tests/logic.test.ts` à chaque adaptateur avec de vrais exports anonymisés ; tests Playwright dans la CI (GitHub Actions) sur chaque pull request.
