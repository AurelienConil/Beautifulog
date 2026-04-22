# BeautifuLog — Guide de migration Electron → TUI

> Document de référence pour la réécriture de l'application Electron+Vue 3 en une TUI Node.js pure (Terminal User Interface).

---

## 1. Contexte et motivation

L'application actuelle est une app **Electron lourde** :

- Deux processus séparés (Main + Renderer) qui communiquent via IPC
- Un front-end Vue 3 + Vuetify (HTML/CSS/JS dans un BrowserWindow)
- Un store Pinia pour la réactivité côté renderer
- Un `MessageBatcher` pour lisser le trafic IPC
- Un `preload.js` qui fait le pont de sécurité entre les deux mondes

La TUI cible est un **processus Node.js unique** qui affiche tout dans le terminal, sans navigateur, sans IPC, sans séparation back/front.

---

## 2. Ce qui **reste** inchangé

| Module | Fichier | Pourquoi ça reste |
|---|---|---|
| Serveur WebSocket | `inputs/SocketInput.js` | Les clients externes (Python, Arduino…) continuent d'envoyer leurs logs via Socket.IO sur le port 3001 |
| Gestionnaire d'entrées | `inputs/InputManager.js` | Orchestre les inputs, logique de démarrage/arrêt inchangée |
| Pipeline de formatage | `formatMessage.js` + `Detect*.js` | Chain of Responsibility qui parse label, type, variables, JSON — réutilisable tel quel |
| Input Série | `inputs/SerialInput.js` | Idem, lecture port série indépendante du rendu |

---

## 3. Ce qui **disparaît** et pourquoi

### 3.1 IPC Electron (`main.js` ↔ `preload.js` ↔ renderer)

**Pourquoi ça existait :** Electron isole le processus renderer dans un sandbox. Toute communication avec le code Node.js (Main) devait passer par `ipcMain.handle` / `ipcRenderer.invoke` et le `contextBridge`.

**En TUI :** Plus de renderer, plus de sandbox. `InputManager`, `SocketInput` et le code d'affichage tournent dans le **même processus**. L'appel est direct.

```
// Electron (avant)
inputManager → messageBatcher → ipcMain.send → ipcRenderer.on → store.addMessageBatch()

// TUI (après)
inputManager → state.addMessage() → emitter.emit('update') → widget.redraw()
```

Fichiers supprimés : `main.js` (la partie Electron), `preload.js`, tout `ipcMain.*` et `ipcRenderer.*`.

---

### 3.2 MessageBatcher + throttling IPC (`MessageBatcher.js`)

**Pourquoi ça existait :** L'IPC Electron est coûteux. Envoyer 1 000 messages/s individuellement saturait le channel et gelait la GUI. Le `MessageBatcher` accumulait les messages dans une queue puis les envoyait par paquets (~30 fps, max 100 messages/batch).

**En TUI :** Il n'y a plus de channel IPC à protéger. Le "coût" est maintenant le **redraw du terminal** (blessed). Ce redraw est bien moins coûteux et peut être throttlé simplement avec un `setInterval` ou un debounce natif de blessed. Le `MessageBatcher` complet n'est plus nécessaire.

Fichier supprimé : `MessageBatcher.js`

---

### 3.3 Store Pinia (`gui/src/stores/socket.js`)

**Pourquoi ça existait :** Vue 3 est déclaratif. Les composants ne peuvent pas accéder directement à des variables JS — ils s'abonnent à des `ref` / `shallowRef` réactifs. Pinia centralisait cet état et déclenchait les re-renders via `triggerRef()`.

**En TUI :** Plus de Vue, plus de réactivité déclarative. L'état est un **objet JS ordinaire** (Map, Array, primitives). La "réactivité" est remplacée par un `EventEmitter` standard Node.js : quand l'état change, on émet un événement, et les widgets blessed qui écoutent cet événement se redesrinent.

```js
// Équivalent TUI du store Pinia
const EventEmitter = require('events')
const emitter = new EventEmitter()

const state = {
  messagesByLabel: new Map(),   // même structure que dans le store
  pinnedVariableValues: new Map(),
  maxTimestampValue: 0,
  isReceiving: true,
}

function addMessage(formattedMessage) {
  const label = formattedMessage.label || 'Unknown'
  if (!state.messagesByLabel.has(label)) {
    state.messagesByLabel.set(label, [])
  }
  const arr = state.messagesByLabel.get(label)
  arr.push(formattedMessage)
  if (arr.length > MAX_MESSAGES_PER_LABEL) arr.shift()
  emitter.emit('messages:update', label)   // ← les widgets écoutent ça
}

module.exports = { state, emitter, addMessage }
```

Fichiers supprimés : tout `gui/` (composants Vue, stores, main.js Vue, vite.config.js…)

---

## 4. Architecture TUI cible

```
Clients externes (Python / Arduino / Node)
         │
         │  Socket.IO  ws://localhost:3001
         ▼
┌─────────────────────────────────────────────────┐
│               Processus Node.js unique           │
│                                                  │
│  SocketInput.js  ──→  InputManager.js            │
│                              │                   │
│                              ▼                   │
│                    formatMessage.js              │
│                  (Chain of Responsibility)       │
│                              │                   │
│                              ▼                   │
│                   state.js  (Map + EventEmitter) │
│                              │                   │
│               ┌──────────────┼──────────────┐   │
│               ▼              ▼              ▼    │
│         LogPanel.js   VarPanel.js   StatusBar.js │
│               └──────────────┴──────────────┘   │
│                    blessed widgets               │
└─────────────────────────────────────────────────┘
```

### Flux d'un message entrant

1. **SocketInput** reçoit `"[API] ERROR: timeout"` via Socket.IO
2. **InputManager** appelle son callback `onMessage`
3. **formatMessage** parse → `{ label: 'API', type: 'error', msg: 'timeout', timestamp: … }`
4. **state.addMessage()** insère dans `messagesByLabel.get('API')` et émet `messages:update API`
5. **LogPanel** écoute `messages:update` → appelle `panel.setItems(state.getMessagesForLabel('API'))` → blessed redessine

---

## 5. Structure de fichiers cible

```
beautifulog-tui/
├── index.js                  ← point d'entrée (remplace main.js Electron)
├── inputs/
│   ├── InputManager.js       ← inchangé
│   ├── SocketInput.js        ← inchangé
│   ├── SerialInput.js        ← inchangé
│   └── LogInput.js           ← inchangé
├── formatMessage.js          ← inchangé
├── DetectLabelHandler.js     ← inchangé
├── DetectVariablesHandler.js ← inchangé
├── DetectTypeHandler.js      ← inchangé
├── DetectJSONHandler.js      ← inchangé
├── ChainHandler.js           ← inchangé
├── state.js                  ← NOUVEAU : remplace le store Pinia
├── ui/
│   ├── screen.js             ← NOUVEAU : initialisation blessed
│   ├── LogPanel.js           ← NOUVEAU : remplace LogView.vue
│   ├── VarPanel.js           ← NOUVEAU : remplace PinGraph/PinSlider.vue
│   ├── StatusBar.js          ← NOUVEAU : remplace InputManager.vue
│   └── layout.js             ← NOUVEAU : gestion du layout multi-panneaux
└── package.json
```

---

## 6. Dépendances ajoutées / retirées

### Retirées
- `electron`
- `vue`
- `vuetify`
- `pinia`
- `vite`
- `@vitejs/*`

### Ajoutées
- [`blessed`](https://github.com/chjj/blessed) — widgets terminal (box, list, scrollable text…)
- [`blessed-contrib`](https://github.com/yaronn/blessed-contrib) *(optionnel)* — sparklines, graphes ASCII pour les variables
- `socket.io` — déjà présent, inchangé

---

## 7. Points de vigilance lors de l'implémentation

### 7.1 Limite du nombre de messages affichés
Le store Pinia appliquait `maxMessagesPerLabel = 100` avec un slice. Ce plafond reste **indispensable en TUI** : blessed ne fait pas de virtualisation native, afficher 10 000 lignes dans un `List` dégrade les performances. Implémenter la même limite dans `state.js`.

### 7.2 Redraw throttling
Sans `MessageBatcher`, les redraws peuvent devenir fréquents. Utiliser `screen.render()` uniquement dans un `setInterval` court (ex. 33 ms = 30 fps) ou en réponse à `emitter.on('messages:update')` avec un debounce, plutôt que d'appeler `screen.render()` à chaque message.

### 7.3 Gestion du layout multi-labels
`DynamicTable.vue` créait/supprimait dynamiquement des colonnes (`LogView`) selon les labels reçus. En TUI, blessed ne redimensionne pas les widgets en cours de route sans recréer le layout. Deux stratégies :
- **Panneaux fixes** (1, 2, 3 ou 4 colonnes) avec sélection par touche
- **Onglets** (tabs) : un onglet par label, navigation clavier `Tab`/`Shift+Tab`

### 7.4 Variables épinglées (pinned variables)
Le store gérait `pinnedVariablesByLabel` et `pinnedVariableValues` pour les graphes `PinGraph`. Cette logique est **à conserver dans `state.js`** — seul le rendu change (sparkline ASCII via `blessed-contrib` au lieu de Chart.js).

### 7.5 Arrêt propre
`main.js` Electron gérait `SIGINT`/`SIGTERM` pour stopper `InputManager` et `MessageBatcher`. En TUI, conserver les handlers `process.on('SIGINT', cleanup)` pour fermer proprement le serveur Socket.IO et le port série avant de quitter.

---

## 8. Récapitulatif des suppressions

| Fichier / dossier | Raison |
|---|---|
| `main.js` (partie Electron) | Plus de `BrowserWindow`, `ipcMain`, `app.whenReady()` |
| `preload.js` | Plus de `contextBridge`, plus de renderer sandbox |
| `MessageBatcher.js` | IPC supprimé, throttling redraw géré différemment |
| `PerformanceProfiler.js` | Optionnel, peut être gardé pour debug interne |
| `gui/` (tout le dossier) | Vue 3, Vuetify, Pinia, Vite — toute la couche front |
| `vite.config.js` | Plus de bundler front |

---

## 9. Récapitulatif de ce qui est réutilisé tel quel

| Fichier | Rôle |
|---|---|
| `inputs/InputManager.js` | Orchestration des inputs |
| `inputs/SocketInput.js` | Serveur Socket.IO |
| `inputs/SerialInput.js` | Lecture port série |
| `inputs/LogInput.js` | Classe de base abstraite |
| `formatMessage.js` | Point d'entrée du pipeline de parsing |
| `ChainHandler.js` | Classe de base Chain of Responsibility |
| `DetectLabelHandler.js` | Extraction du label `[LABEL]` |
| `DetectVariablesHandler.js` | Extraction des variables `key=value` |
| `DetectTypeHandler.js` | Détection du type (INFO, ERROR, WARN…) |
| `DetectJSONHandler.js` | Détection et parse JSON |
