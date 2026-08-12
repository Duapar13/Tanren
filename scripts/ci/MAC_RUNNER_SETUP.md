# Setup du MacBook comme runner self-hosted (CI/CD iOS)

À faire une seule fois, sur le MacBook M3, pour que `.github/workflows/eas-build.yml`
puisse tourner dessus à chaque push sur `main`. Le repo (`.github/workflows/`,
`scripts/ci/`) est déjà poussé sur GitHub — rien à faire côté Windows après ça.

## 0. Prérequis

- **Xcode** (l'app complète depuis l'App Store, pas juste les Command Line Tools) —
  nécessaire pour que `eas build --local` puisse compiler l'IPA.
  Puis accepter la licence : `sudo xcodebuild -license accept`
- **Command Line Tools** si pas déjà là : `xcode-select --install`
- **CocoaPods** : `brew install cocoapods` (installer Homebrew d'abord si besoin :
  `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`)
- Node et `eas-cli` n'ont pas besoin d'être préinstallés — le workflow les installe
  lui-même à chaque run (`actions/setup-node` + `npm install -g eas-cli`).
- **Empêcher le Mac de s'endormir** (Réglages > Batterie/Énergie), au moins quand il est
  sur secteur — le runner ne reçoit les jobs que si le Mac est éveillé et connecté ; sinon
  ils restent juste en attente (pas d'échec, juste pas de build tant qu'il dort).

## 1. Enregistrer le Mac comme runner GitHub Actions

1. Va sur https://github.com/Duapar13/Tanren/settings/actions/runners/new
2. Choisis **macOS**, puis **ARM64** (Apple Silicon)
3. Suis exactement les commandes affichées sur cette page (le token d'enregistrement
   est unique et expire vite, donc à copier depuis la page à ce moment-là) :
   ```bash
   mkdir actions-runner && cd actions-runner
   curl -o actions-runner-osx-arm64.tar.gz -L <URL fournie par GitHub>
   tar xzf ./actions-runner-osx-arm64.tar.gz
   ./config.sh --url https://github.com/Duapar13/Tanren --token <TOKEN>
   ```
4. Nom du runner : ce que tu veux (ex. `macbook-m3-home`). Labels : laisse la valeur
   par défaut (GitHub ajoute `self-hosted`, `macOS`, `ARM64` tout seul — c'est ce que
   le workflow attend).
5. Installer comme service pour qu'il tourne même après déconnexion/reboot :
   ```bash
   ./svc.sh install
   ./svc.sh start
   ./svc.sh status
   ```
6. Vérifie sur la page des runners GitHub qu'il apparaît "Idle" (vert).

## 2. Clé SSH dédiée pour le déploiement OTA

Le workflow copie l'IPA + le manifest vers le serveur via SSH, avec une clé
dédiée séparée de celles déjà utilisées ailleurs.

```bash
ssh-keygen -t ed25519 -f ~/.ssh/tanren_ota_deploy -N "" -C "mac-runner-ota-deploy"
cat ~/.ssh/tanren_ota_deploy.pub
```

Envoie-moi **uniquement la sortie de `cat ... .pub`** (la clé publique, jamais
`tanren_ota_deploy` sans le `.pub`) — je l'ajoute côté serveur dans
`/home/tanren/.ssh/authorized_keys`. Le chemin `~/.ssh/tanren_ota_deploy` est celui
que le workflow utilise déjà, pas besoin d'y toucher.

## 3. Secrets GitHub Actions

Sur https://github.com/Duapar13/Tanren/settings/secrets/actions/new, ajoute :

- **`EXPO_TOKEN`** — à générer sur https://expo.dev/accounts/duapar13s-team/settings/access-tokens
  (bouton "Create token"), puis colle la valeur comme secret.
- **`DISCORD_WEBHOOK_URL`** — je te la redonne au moment du setup (déjà utilisée pour
  les autres notifs Discord du projet, pas besoin de la régénérer).

## 4. Test

Une fois les 3 étapes ci-dessus faites :

1. Onglet **Actions** du repo GitHub → workflow "EAS Build (iOS, self-hosted)" →
   bouton **Run workflow** (déclenchement manuel, pas besoin d'attendre un vrai push).
2. Le job doit démarrer sur le Mac dans les secondes qui suivent (visible aussi dans
   les logs du service runner sur le Mac).
3. Si tout passe : message "Nouveau build Ningyma disponible" avec QR code sur Discord,
   comme d'habitude.

## En cas de blocage

- Le job reste en "Waiting for a runner" → le service runner n'est pas démarré ou le
  Mac dort. `./svc.sh status` dans le dossier `actions-runner`.
- `eas build --local` échoue sur une histoire de credentials → vérifier que
  `EXPO_TOKEN` est bien un token avec accès au projet `@duapar13s-team/Tanren`.
- L'étape de déploiement SSH échoue → vérifier que la clé publique a bien été ajoutée
  côté serveur (demande-moi de re-vérifier `/home/tanren/.ssh/authorized_keys`).
