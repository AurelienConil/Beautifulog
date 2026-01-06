const { contextBridge, ipcRenderer } = require('electron');

// Exposer des APIs protégées au processus de rendu via le contextBridge
contextBridge.exposeInMainWorld('electronAPI', {
    // Exemple d'API sécurisée
    openFile: () => ipcRenderer.invoke('dialog:openFile'),

    // API pour récupérer les versions
    getVersions: () => ({
        chrome: process.versions.chrome,
        node: process.versions.node,
        electron: process.versions.electron
    }),

    // APIs pour la gestion des inputs
    inputs: {
        // Obtenir le statut de tous les inputs
        getStatus: () => ipcRenderer.invoke('inputs:getStatus'),

        // Diffuser un message à tous les inputs connectés
        broadcast: (message) => ipcRenderer.invoke('inputs:broadcast', message),

        // Redémarrer un input spécifique
        restart: (inputName) => ipcRenderer.invoke('inputs:restart', inputName),

        // Obtenir les détails d'un input spécifique
        getDetails: (inputName) => ipcRenderer.invoke('inputs:getDetails', inputName),

        // Obtenir les clients connectés d'un input
        getClients: (inputName) => ipcRenderer.invoke('inputs:getClients', inputName),

        // Écouter les messages reçus de tous les inputs
        onMessageReceived: (callback) => {
            ipcRenderer.on('input-message-received', (event, data) => callback(data));
        },

        // Écouter les batches de messages (NOUVEAU)
        onMessageBatch: (callback) => {
            ipcRenderer.on('input-message-batch', (event, batch) => callback(batch));
        },

        // Écouter les changements de statut des inputs
        onStatusChanged: (callback) => {
            ipcRenderer.on('input-status-changed', (event, data) => callback(data));
        },

        // Écouter les changements de clients
        onClientChanged: (callback) => {
            ipcRenderer.on('input-client-changed', (event, data) => callback(data));
        },

        // Obtenir les métriques de performance (NOUVEAU)
        getMetrics: () => ipcRenderer.invoke('inputs:getMetrics'),

        // Configurer le throttling à chaud (NOUVEAU)
        configureThrottling: (config) => ipcRenderer.invoke('inputs:configureThrottling', config),

        // Forcer l'envoi d'un batch (NOUVEAU)
        forceBatch: () => ipcRenderer.invoke('inputs:forceBatch'),

        // Retirer les écouteurs
        removeAllListeners: (channel) => {
            ipcRenderer.removeAllListeners(channel);
        }
    },

    // API pour la gestion des ports série
    serial: {
        // Lister les ports série disponibles
        listPorts: () => ipcRenderer.invoke('serial:listPorts'),

        // Se connecter à un port spécifique
        connectToPort: (portPath, config) => ipcRenderer.invoke('serial:connectToPort', portPath, config),

        // Configurer un port sans s'y connecter
        configure: (config) => ipcRenderer.invoke('serial:configure', config)
    },

    // API legacy pour compatibilité
    socket: {
        // Envoyer un message au backend
        sendMessageToBackend: (message) => ipcRenderer.invoke('send-message-to-backend', message),
    },

    // API pour le monitoring des performances (NOUVEAU)
    performance: {
        // Obtenir les métriques de performance
        getMetrics: () => ipcRenderer.invoke('performance:getMetrics'),

        // Activer/désactiver le monitoring
        toggleMonitoring: (enable) => ipcRenderer.invoke('performance:toggleMonitoring', enable),

        // Remettre à zéro les métriques
        resetMetrics: () => ipcRenderer.invoke('performance:resetMetrics')
    }
});

// Toutes les API Node.js sont disponibles dans le processus de preload.
// Il a le même sandbox qu'une extension Chrome.
window.addEventListener('DOMContentLoaded', () => {
    const replaceText = (selector, text) => {
        const element = document.getElementById(selector);
        if (element) element.innerText = text;
    };

    for (const dependency of ['chrome', 'node', 'electron']) {
        replaceText(`${dependency}-version`, process.versions[dependency]);
    }
});