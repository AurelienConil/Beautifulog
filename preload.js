const { contextBridge, ipcRenderer } = require('electron');

// Exposer des APIs protégées au processus de rendu via le contextBridge
contextBridge.exposeInMainWorld('electronAPI', {
  // Exemple d'API sécurisée
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  // Ajoutez d'autres APIs selon vos besoins
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