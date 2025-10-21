# Log Viewer - Electron + Vue 3 + Vuetify

Une application de bureau moderne construite avec Electron, Vue 3 et Vuetify.

## Technologies utilisées

- **Electron** - Framework pour applications de bureau
- **Vue 3** - Framework JavaScript progressif avec Composition API
- **Vuetify** - Bibliothèque de composants Material Design
- **Vite** - Outil de build rapide

## Installation

```bash
# Installer les dépendances
npm install
```

## Développement

```bash
# Démarrer le serveur de développement
npm run dev

# Lancer l'application Electron en mode développement
npm run electron:dev
```

## Build

```bash
# Build pour la production
npm run build

# Build de l'application Electron
npm run electron:build
```

## Structure du projet

```
├── main.js                 # Processus principal Electron
├── preload.js              # Script de preload pour la sécurité
├── package.json            # Dépendances et scripts
├── vite.config.js          # Configuration Vite
├── gui/                    # Interface utilisateur Vue 3
│   ├── index.html          # Point d'entrée HTML
│   ├── src/                # Code source Vue
│   │   ├── main.js         # Point d'entrée Vue
│   │   ├── App.vue         # Composant principal
│   │   └── components/     # Composants Vue
│   │       ├── WelcomeCard.vue
│   │       └── FeatureCard.vue
│   └── public/             # Assets statiques
└── dist/                   # Fichiers buildés
```

## Fonctionnalités

- ✅ Interface utilisateur moderne avec Vuetify
- ✅ Thème sombre/clair
- ✅ Application de bureau native
- ✅ Hot reload en développement
- ✅ Build optimisé pour la production

## Scripts disponibles

- `npm run dev` - Démarre le serveur Vite
- `npm run build` - Build de production
- `npm run preview` - Prévisualisation du build
- `npm run electron:dev` - Lance Electron en développement
- `npm run electron:build` - Build l'application Electron