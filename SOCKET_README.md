# Socket.IO Integration

Cette application Electron intègre un serveur Socket.IO pour recevoir des messages en temps réel et les transmettre au frontend Vue.js via IPC.

## Configuration

### Serveur Socket.IO
- **Port**: 3001
- **CORS**: Autorisé pour toutes les origines
- **Types de messages supportés**: 
  - `log-message` : Messages de log standard
  - `error-message` : Messages d'erreur

### Architecture

```
Client Socket.IO → Serveur Socket.IO (Backend Electron) → IPC → Frontend Vue.js → Store Vuex/Pinia
```

## Utilisation

### 1. Démarrer l'application
```bash
npm run electron:dev
```

### 2. Tester avec le client de test
```bash
npm run test:socket
```

### 3. Se connecter depuis une application externe
```javascript
const io = require('socket.io-client');
const socket = io('http://localhost:3001');

// Envoyer un message de log
socket.emit('log-message', {
    level: 'info',
    message: 'Mon message de log',
    source: 'mon-app',
    data: { custom: 'data' }
});

// Envoyer un message d'erreur
socket.emit('error-message', {
    level: 'error',
    message: 'Une erreur est survenue',
    source: 'mon-app',
    error: 'ERROR_CODE',
    stack: 'Stack trace...'
});
```

## API Frontend

Le frontend Vue.js peut accéder aux APIs Socket.IO via `window.electronAPI.socket` :

### Méthodes disponibles

```javascript
// Obtenir le statut du serveur
const status = await window.electronAPI.socket.getStatus();

// Diffuser un message à tous les clients connectés
await window.electronAPI.socket.broadcast('Message pour tous les clients');

// Obtenir la liste des clients connectés
const clients = await window.electronAPI.socket.getClients();

// Écouter les messages reçus
window.electronAPI.socket.onMessageReceived((data) => {
    console.log('Message reçu:', data);
    // data contient: { type, data, timestamp, socketId }
});

// Écouter les déconnexions de clients
window.electronAPI.socket.onClientDisconnected((data) => {
    console.log('Client déconnecté:', data);
});
```

### Composant SocketManager

Le composant `SocketManager.vue` fournit une interface utilisateur pour :
- Visualiser l'état du serveur Socket.IO
- Afficher les messages reçus en temps réel
- Diffuser des messages à tous les clients
- Gérer les connexions clients

## Intégration avec un store Vue.js

Pour intégrer avec Vuex ou Pinia, créez des actions/mutations pour traiter les messages :

### Exemple avec Pinia
```javascript
// store/socketStore.js
import { defineStore } from 'pinia'

export const useSocketStore = defineStore('socket', {
  state: () => ({
    messages: [],
    connectedClients: 0
  }),
  
  actions: {
    addMessage(message) {
      this.messages.unshift(message)
      // Limiter à 100 messages
      if (this.messages.length > 100) {
        this.messages = this.messages.slice(0, 100)
      }
    },
    
    updateClientCount(count) {
      this.connectedClients = count
    }
  }
})

// Dans votre composant Vue
const socketStore = useSocketStore()

onMounted(() => {
  window.electronAPI.socket.onMessageReceived((data) => {
    socketStore.addMessage(data)
  })
})
```

## Sécurité

- Le serveur Socket.IO est configuré pour accepter les connexions de toutes les origines (CORS: "*")
- Pour la production, limitez les origines autorisées
- Ajoutez une authentification si nécessaire
- Validez toujours les données reçues côté serveur

## Dépannage

### Le serveur ne démarre pas
- Vérifiez que le port 3001 n'est pas déjà utilisé
- Consultez les logs Electron dans la console

### Les messages ne sont pas reçus
- Vérifiez que le client Socket.IO se connecte bien à `http://localhost:3001`
- Vérifiez les noms des événements (`log-message`, `error-message`)
- Consultez les DevTools Electron pour voir les messages IPC