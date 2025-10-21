const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  // Créer la fenêtre du navigateur
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets/icon.png'), // Optionnel
    show: false
  });

  // Charger l'application
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // Ouvrir les DevTools en mode développement
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile('dist/index.html');
  }

  // Afficher la fenêtre quand elle est prête
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

// Cette méthode sera appelée quand Electron aura fini
// de s'initialiser et sera prêt à créer des fenêtres de navigateur.
app.whenReady().then(createWindow);

// Quitter quand toutes les fenêtres sont fermées, sauf sur macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // Sur macOS, il est courant de recréer une fenêtre dans l'application quand
  // l'icône du dock est cliquée et qu'il n'y a pas d'autres fenêtres ouvertes.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Dans ce fichier, vous pouvez inclure le reste du code spécifique au processus principal
// de votre app. Vous pouvez également le mettre dans des fichiers séparés et les importer ici.