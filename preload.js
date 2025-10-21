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

    // APIs Socket.IO
    socket: {
        // Obtenir le statut du serveur
        getStatus: () => ipcRenderer.invoke('socket:getStatus'),

        // Diffuser un message à tous les clients
        broadcast: (message) => ipcRenderer.invoke('socket:broadcast', message),

        // Obtenir la liste des clients connectés
        getClients: () => ipcRenderer.invoke('socket:getClients'),

        // Écouter les messages reçus via Socket.IO
        onMessageReceived: (callback) => {
            ipcRenderer.on('socket-message-received', (event, data) => callback(data));
        },

        // Écouter les déconnexions de clients
        onClientDisconnected: (callback) => {
            ipcRenderer.on('socket-client-disconnected', (event, data) => callback(data));
        },

        // Retirer les écouteurs
        removeAllListeners: (channel) => {
            ipcRenderer.removeAllListeners(channel);
        }
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