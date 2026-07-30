# Tanren (鍛錬)

Application de suivi de musculation — log des séances et des performances par exercice, pour visualiser la progression dans le temps et rester en "lock-in" sur soi-même.

*Tanren* — forger, tremper son corps et son esprit par l'entraînement répété.

## Stack

- [Expo](https://expo.dev) SDK 54 (managed workflow, testable en live via Expo Go) + TypeScript strict
- [Expo Router](https://docs.expo.dev/router/introduction/) pour la navigation (tabs + stack d'auth protégée)
- [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) comme cache local / écriture offline
- API [Node.js/Express](server/) + MariaDB comme backend, déployée sur `https://api-tanren.duapar.fr`
- [react-native-gifted-charts](https://github.com/Abhinandan-Kushwaha/react-native-gifted-charts) pour les graphiques
- Police [Permanent Marker](https://fonts.google.com/specimen/Permanent+Marker) pour le wordmark

> Pinné sur le SDK 54 : depuis mi-2026 l'app Expo Go de l'App Store ne supporte que cette version (les SDK plus récents restent bloqués en review Apple).

## Design

- Style natif iOS, épuré, listes groupées, safe areas respectées, thème clair/sombre automatique (`useColorScheme`)
- Palette noir & blanc, avec un **ambre doré** (`#C4881F`) comme accent de marque : wordmark, tab actif, boutons, barres de progression, graphiques
- Wordmark **Tanren** en écriture brush (Permanent Marker), sur le splash screen et en haut de chaque écran

## Fonctionnalités

- **Compte** — inscription/connexion par email + pseudo + mot de passe, ou via Google/Apple (flux web `expo-auth-session`, fonctionne dans Expo Go)
- **Accueil** — type de séance du jour selon le split fixe (Haut/Bas/Repos), calendrier de la semaine, résumé de régularité, dernier record battu
- **Séance** — log par exercice : séries, répétitions, poids, RPE optionnel ; édition et suppression (avec confirmation) d'une série déjà loguée ou en brouillon ; confirmation avant de terminer la séance ; timer de repos optionnel (réglable en Profil) ; bibliothèque pré-remplie triée Haut/Bas + ajout d'exercices custom (nom + haut/bas du corps uniquement)
- **Progression** — heatmap de régularité (séances faites vs prévues), graphiques par exercice filtrés Haut/Bas (1RM estimée, poids max, volume), détection automatique des records personnels (triés par marge de progression)
- **Nutrition** — macros complètes (protéines/glucides/lipides) avec calories calculées, objectifs quotidiens dérivés du poids et de l'objectif (prise de masse/sèche/maintien) choisi en Profil, IMC (taille + dernier poids), graphiques par macro sur 7/30/90j, suivi du poids de corps
- **Profil** — compte (déconnexion), taille + objectif nutrition, timer de repos, bibliothèque d'exercices custom

## Stockage des données et synchronisation

Chaque compte a ses propres données, stockées côté serveur (MariaDB) et mises en cache localement dans une base **SQLite** (`expo-sqlite`, fichier `tanren.db`) pour un fonctionnement **offline** : toute action (log d'une série, ajout d'une entrée nutrition, etc.) s'écrit d'abord en local puis part dans une file d'attente (`sync_queue`) rejouée vers l'API dès que le réseau/l'app revient au premier plan (`lib/syncEngine.ts`, `components/SyncEngine.tsx`). Au premier login sur un appareil, les données du compte sont récupérées depuis le serveur (`bootstrapAfterLogin`).

Schéma local (défini dans [`db/schema.ts`](db/schema.ts)) :

| Table | Contenu |
|---|---|
| `exercises` | nom, catégorie (haut/bas), groupe musculaire, custom ou non |
| `sessions` | date, catégorie de la séance |
| `sets` | séries individuelles : séance, exercice, n° de série, reps, poids (kg), RPE optionnel |
| `body_weight_entries` | historique du poids de corps |
| `nutrition_entries` | historique des macros (protéines/glucides/lipides) |
| `sync_queue` | file d'attente des écritures en attente de synchronisation vers l'API |

[`context/DataContext.tsx`](context/DataContext.tsx) charge tout en mémoire au démarrage et recharge après chaque écriture ; c'est ce contexte unique que consomment tous les écrans. [`context/AuthContext.tsx`](context/AuthContext.tsx) gère la session (tokens en `expo-secure-store`, refresh automatique). Les PR, graphiques de progression et heatmap sont calculés côté client à partir des séries brutes (`utils/prStats.ts`, `utils/exerciseSeries.ts`) plutôt que stockés.

## Backend

Voir [`server/`](server/) — API Express + MariaDB, déployée sur le serveur perso via `pm2` (utilisateur dédié `tanren`) derrière `nginx` en HTTPS. Auth par JWT (access court + refresh token révocable), routes REST pour les comptes, exercices, séances/séries, poids et nutrition.

## Lancer le projet

```bash
npm install
npx expo start
```

Scanner le QR code avec l'app **Expo Go** sur iPhone.

## Historique de développement

Ce projet a été initialement scaffoldé avec l'assistance de [Claude Code](https://claude.com/claude-code).
