const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';
const { formatMessage } = require('./formatMessage');
const InputManager = require('./inputs/InputManager');

// Configuration globale
let mainWindow;
let inputManager;

function createWindow() {
    // Créer la fenêtre du navigateur
    mainWindow = new BrowserWindow({
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

    // Définir le facteur de zoom à 50%
    mainWindow.webContents.setZoomFactor(0.8);

    // Afficher la fenêtre quand elle est prête
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Gestionnaire d'événement pour la fermeture de la fenêtre
    mainWindow.on('close', () => {
        console.log('Fenêtre principale fermée, arrêt de l\'application...');
        // Si besoin, effectuer des opérations de nettoyage supplémentaires ici
    });
}

// Initialiser tous les inputs
async function initializeInputs() {
    inputManager = new InputManager();

    // Configuration des inputs
    const config = {
        socket: {
            port: 3001
        },
        serial: {
            baudRate: 9600,
            autoReconnect: true
        }
    };

    // Configurer les callbacks pour traiter les messages
    inputManager.onMessage((data) => {
        try {
            handleInputMessage(data);
        } catch (error) {
            console.error('Erreur lors du traitement du message:', error.message, 'Data:', data);
        }
    });

    inputManager.onStatusChange((data) => {
        console.log(`Input ${data.name} changé de ${data.oldStatus} à ${data.newStatus}`);

        // Notifier le frontend du changement de statut
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('input-status-changed', data);
        }
    });

    inputManager.onClientChange((data) => {
        console.log(`Input ${data.name} clients: ${data.oldCount} → ${data.newCount}`);

        // Notifier le frontend du changement de clients
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('input-client-changed', data);
        }
    });

    // Initialiser tous les inputs disponibles
    await inputManager.initializeInputs(config);
}

// Gérer les messages reçus de tous les inputs
function handleInputMessage(data) {
    // Validation rapide des données (plus efficace qu'un try...catch)
    if (!data || !data.rawMessage) {
        return;
    }

    const formattedMessages = formatMessage(data.rawMessage);

    formattedMessages.forEach(formattedMessage => {
        // Ajouter les métadonnées de l'input
        formattedMessage.inputSource = data.source;
        formattedMessage.inputType = data.type;
        formattedMessage.receivedAt = data.timestamp;

        // Ajouter les métadonnées spécifiques selon le type
        if (data.socketId) {
            formattedMessage.socketId = data.socketId;
        }
        if (data.port) {
            formattedMessage.serialPort = data.port;
        }
        if (data.clientCount) {
            formattedMessage.clientCount = data.clientCount;
        }

        // Transmettre le message au frontend via IPC
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('input-message-received', formattedMessage);
        }
    });
}

// Handlers IPC pour la communication avec le frontend
function setupIpcHandlers() {
    // Handler pour obtenir le statut de tous les inputs
    ipcMain.handle('inputs:getStatus', () => {
        return inputManager ? inputManager.getAllInputsStatus() : [];
    });

    // Handler pour diffuser un message à tous les inputs connectés
    ipcMain.handle('inputs:broadcast', async (event, message) => {
        if (inputManager) {
            const results = await inputManager.broadcastToAll(message);
            return { success: true, results };
        }
        return { success: false, message: 'Input manager non disponible' };
    });

    // Handler pour redémarrer un input spécifique
    ipcMain.handle('inputs:restart', async (event, inputName) => {
        if (inputManager) {
            const success = await inputManager.restartInput(inputName);
            return { success, message: success ? 'Input redémarré' : 'Échec du redémarrage' };
        }
        return { success: false, message: 'Input manager non disponible' };
    });

    // Handler pour obtenir les détails d'un input spécifique
    ipcMain.handle('inputs:getDetails', (event, inputName) => {
        if (inputManager) {
            const input = inputManager.getInput(inputName);
            return input ? input.getStatus() : null;
        }
        return null;
    });

    // Handler pour obtenir les clients connectés d'un input
    ipcMain.handle('inputs:getClients', (event, inputName) => {
        if (inputManager) {
            const input = inputManager.getInput(inputName);
            if (input && typeof input.getConnectedClients === 'function') {
                return input.getConnectedClients();
            }
        }
        return [];
    });

    // Handler pour lister les ports série disponibles
    ipcMain.handle('serial:listPorts', async () => {
        if (inputManager) {
            const serialInput = inputManager.getInput('Serial');
            if (serialInput) {
                try {
                    // Utiliser la méthode publique pour lister les ports
                    const ports = await serialInput.listAvailablePorts();
                    return {
                        success: true,
                        ports: ports
                    };
                } catch (error) {
                    return {
                        success: false,
                        message: error.message,
                        ports: []
                    };
                }
            }
        }
        return { success: false, message: 'Serial input non disponible', ports: [] };
    });

    // Handler pour se connecter à un port série spécifique
    ipcMain.handle('serial:connectToPort', async (event, portPath, config = {}) => {
        if (inputManager) {
            const serialInput = inputManager.getInput('Serial');
            if (serialInput) {
                try {
                    // Arrêter la connexion actuelle si elle existe
                    if (serialInput.status === 'connected') {
                        await serialInput.stop();
                    }

                    // Mettre à jour la configuration
                    serialInput.config.port = portPath;
                    if (config.baudRate) serialInput.config.baudRate = config.baudRate;
                    if (config.dataBits) serialInput.config.dataBits = config.dataBits;
                    if (config.stopBits) serialInput.config.stopBits = config.stopBits;
                    if (config.parity) serialInput.config.parity = config.parity;

                    // Démarrer avec le nouveau port
                    await serialInput.start();

                    return {
                        success: true,
                        message: `Connecté au port ${portPath}`
                    };
                } catch (error) {
                    return {
                        success: false,
                        message: error.message
                    };
                }
            }
        }
        return { success: false, message: 'Serial input non disponible' };
    });

    // Handler pour configurer un port série sans s'y connecter
    ipcMain.handle('serial:configure', (event, config) => {
        if (inputManager) {
            const serialInput = inputManager.getInput('Serial');
            if (serialInput) {
                // Mettre à jour la configuration
                Object.assign(serialInput.config, config);
                return {
                    success: true,
                    message: 'Configuration mise à jour'
                };
            }
        }
        return { success: false, message: 'Serial input non disponible' };
    });

    // Handler pour recevoir un message du frontend et le traiter
    ipcMain.handle('send-message-to-backend', async (event, message) => {
        console.log('Message reçu du frontend via IPC:', message);

        try {
            // Utiliser la fonction formatMessage pour traiter le message
            const formattedMessages = formatMessage(message);

            // Ajouter des métadonnées supplémentaires
            const enrichedMessages = formattedMessages.map((formattedMessage) => ({
                ...formattedMessage,
                processedAt: new Date().toISOString(),
                inputSource: 'frontend',
                inputType: 'manual'
            }));

            console.log('Messages formatés et enrichis:', enrichedMessages);

            // Retourner les messages formatés au frontend
            return enrichedMessages;
        } catch (error) {
            console.error('Erreur lors du traitement du message:', error);
            throw new Error('Erreur lors du traitement du message');
        }
    });
}

// Cette méthode sera appelée quand Electron aura fini
// de s'initialiser et sera prêt à créer des fenêtres de navigateur.
app.whenReady().then(async () => {
    createWindow();
    setupIpcHandlers();
    await initializeInputs();
});

// Quitter quand toutes les fenêtres sont fermées
app.on('window-all-closed', async () => {
    // Arrêter tous les inputs
    if (inputManager) {
        await inputManager.stopAllInputs();
    }

    // Quitter l'application même sur macOS
    app.quit();
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