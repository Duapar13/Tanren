# Tanren (鍛錬)

Application de suivi de musculation — log des séances et des performances par exercice, pour visualiser la progression dans le temps et rester en "lock-in" sur soi-même.

*Tanren* — forger, tremper son corps et son esprit par l'entraînement répété.

## Stack

- [Expo](https://expo.dev) SDK 54 (managed workflow, testable en live via Expo Go) + TypeScript strict
- [Expo Router](https://docs.expo.dev/router/introduction/) pour la navigation (tabs)
- [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) pour le stockage 100% local
- [react-native-gifted-charts](https://github.com/Abhinandan-Kushwaha/react-native-gifted-charts) pour les graphiques
- Police [Permanent Marker](https://fonts.google.com/specimen/Permanent+Marker) pour le wordmark

> Pinné sur le SDK 54 : depuis mi-2026 l'app Expo Go de l'App Store ne supporte que cette version (les SDK plus récents restent bloqués en review Apple).

## Design

- Style natif iOS, épuré, listes groupées, safe areas respectées, thème clair/sombre automatique (`useColorScheme`)
- Palette noir & blanc, avec un **ambre doré** (`#C4881F`) comme accent de marque : wordmark, tab actif, boutons, barres de progression, graphiques
- Wordmark **Tanren** en écriture brush (Permanent Marker), sur le splash screen et en haut de chaque écran

## Fonctionnalités

- **Accueil** — type de séance du jour selon le split fixe (Haut/Bas/Repos), calendrier de la semaine, résumé de régularité, dernier record battu
- **Séance** — log par exercice : séries, répétitions, poids, RPE optionnel ; bibliothèque pré-remplie (les exercices réellement utilisés en salle) triée Haut/Bas + ajout d'exercices custom
- **Progression** — heatmap de régularité (séances faites vs prévues), graphiques par exercice filtrés Haut/Bas (1RM estimée, poids max, volume), détection automatique des records personnels
- **Nutrition** — quota protéines (poids × 1,8 g, recalculé automatiquement), saisie quotidienne avec barre de progression et suppression des entrées du jour, graphique d'évolution (7/30/90j), suivi du poids de corps avec graphique
- **Profil** — gérer la bibliothèque d'exercices (ajout/suppression des exercices custom)

Tout fonctionne offline, aucune donnée ne quitte le téléphone, pas de compte, pas d'onboarding — l'app s'ouvre directement sur le Dashboard.

## Stockage des données

Tout est stocké **localement sur le téléphone** dans une base **SQLite** (`expo-sqlite`, fichier `tanren.db`), sans backend. Schéma (défini dans [`db/schema.ts`](db/schema.ts)) :

| Table | Contenu |
|---|---|
| `exercises` | nom, catégorie (haut/bas), groupe musculaire, custom ou non |
| `sessions` | date, catégorie de la séance |
| `sets` | séries individuelles : séance, exercice, n° de série, reps, poids (kg), RPE optionnel |
| `body_weight_entries` | historique du poids de corps |
| `protein_entries` | historique des grammes de protéines consommés |

[`context/DataContext.tsx`](context/DataContext.tsx) charge tout en mémoire au démarrage et recharge après chaque écriture ; c'est ce contexte unique que consomment tous les écrans. Les PR, graphiques de progression et heatmap sont calculés côté client à partir des séries brutes (`utils/prStats.ts`, `utils/exerciseSeries.ts`) plutôt que stockés — pas de flags à maintenir à jour.

## Lancer le projet

```bash
npm install
npx expo start
```

Scanner le QR code avec l'app **Expo Go** sur iPhone.

## Historique de développement

Ce projet a été initialement scaffoldé avec l'assistance de [Claude Code](https://claude.com/claude-code).
