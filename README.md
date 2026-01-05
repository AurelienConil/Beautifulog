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
- ✅ **Réception de logs temps réel via Socket.IO**
- ✅ **Formatage automatique des messages avec labels et types**
- ✅ **Visualisation interactive des logs**

## Scripts disponibles

- `npm run dev` - Démarre le serveur Vite
- `npm run build` - Build de production
- `npm run preview` - Prévisualisation du build
- `npm run electron:dev` - Lance Electron en développement
- `npm run electron:build` - Build l'application Electron
- `npm run test:socket` - Teste la connexion Socket.IO

---

## 🔌 Connecter votre application au loggeur temps réel

Cette application fonctionne comme un **loggeur visuel temps réel** qui reçoit les logs de vos applications via **Socket.IO**. Voici comment connecter votre application à déboguer :

### 🚀 Démarrage rapide

1. **Lancez le loggeur** :
   ```bash
   npm run electron:dev
   ```
   Le serveur Socket.IO sera disponible sur `http://localhost:3001`

2. **Testez la connexion** :
   ```bash
   npm run test:socket
   ```

### 📡 Intégration dans votre application

#### Pour JavaScript/Node.js :

```javascript
const io = require('socket.io-client');

// Connexion au loggeur
const logger = io('http://localhost:3001');

logger.on('connect', () => {
    console.log('✅ Connecté au loggeur temps réel');
    
    // Envoi de logs avec différents formats
    logger.emit('log-message', '[MyApp] Application démarrée avec succès');
    logger.emit('log-message', '[API:ERROR] Impossible de se connecter à la base de données');
    logger.emit('log-message', '[UserService] Connexion utilisateur: { "userId": 123, "username": "john_doe" }');
});
```

#### Pour Python :

```python
import socketio

# Connexion au loggeur
sio = socketio.SimpleClient()
sio.connect('http://localhost:3001')

# Envoi de logs
sio.emit('log-message', '[PyApp] Application Python démarrée')
sio.emit('log-message', '[Database:ERROR] Connexion échouée')
sio.emit('log-message', '[Process] Traitement terminé avec succès')

sio.disconnect()
```

#### Pour d'autres langages :

Toute librairie Socket.IO compatible peut se connecter. Exemples :
- **PHP** : `elephantio/elephant.io`
- **Java** : `socket.io-client-java`
- **C#** : `SocketIOClient`
- **Go** : `googollee/go-socket.io`

### 📝 Format des messages

Le loggeur reconnaît automatiquement différents formats de messages :

#### 1. Messages avec labels
```
[LABEL] Message de log
```
- `[MyApp] Démarrage de l'application`
- `[API] Requête reçue`
- `[Database] Connexion établie`

#### 2. Messages avec sous-labels
```
[LABEL:SUBLABEL] Message
```
- `[MyApp:INFO] Information importante`
- `[API:ERROR] Erreur de validation`
- `[Database:WARNING] Performance dégradée`

#### 3. Messages avec JSON
```
[Service] Données utilisateur: {"id": 123, "name": "John"}
```

#### 4. Détection automatique des types
Le loggeur détecte automatiquement :
- **ERROR** : Messages contenant "error", "erreur", "exception"
- **WARNING** : Messages contenant "warning", "warn", "attention"
- **INFO** : Autres messages (par défaut)

### 🎨 Fonctionnalités du loggeur

- **Affichage temps réel** des logs reçus
- **Coloration automatique** selon les types (ERROR=rouge, WARNING=orange, INFO=bleu)
- **Filtrage** par labels et types
- **Recherche** dans les messages
- **Thème sombre/clair**
- **Export** des logs
- **Statistiques** des connexions clients

### ⚙️ Configuration avancée

#### Personnaliser le port Socket.IO
Modifiez dans `main.js` :
```javascript
const socketPort = 3001; // Changez ici
```

#### Sécurisation pour la production
```javascript
const socketServer = new Server(server, {
    cors: {
        origin: ["http://localhost:5174", "https://monapp.com"], // Origines autorisées
        methods: ["GET", "POST"]
    }
});
```

### 🔧 Intégration dans vos frameworks

#### Express.js
```javascript
const express = require('express');
const io = require('socket.io-client');
const app = express();

const logger = io('http://localhost:3001');

app.use((req, res, next) => {
    logger.emit('log-message', `[Express] ${req.method} ${req.path}`);
    next();
});
```

#### Next.js
```javascript
// utils/logger.js
import io from 'socket.io-client';

let socket;

export function initLogger() {
    if (!socket) {
        socket = io('http://localhost:3001');
    }
    return socket;
}

export function logMessage(message) {
    if (socket) {
        socket.emit('log-message', `[NextJS] ${message}`);
    }
}
```

### 🐛 Dépannage

**Le loggeur ne reçoit pas mes logs :**
1. Vérifiez que le loggeur est démarré (`npm run electron:dev`)
2. Vérifiez l'URL de connexion : `http://localhost:3001`
3. Vérifiez le nom de l'événement : `log-message`
4. Consultez les logs dans la console du loggeur

**Messages mal formatés :**
- Assurez-vous d'envoyer des **strings** (pas des objets)
- Utilisez le format `[LABEL] message` pour une meilleure organisation

---