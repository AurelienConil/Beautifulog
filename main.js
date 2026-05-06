const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';
const { formatMessage } = require(path.join(__dirname, 'formatMessage'));
const InputManager = require('./inputs/InputManager');
const MessageBatcher = require('./MessageBatcher');
const PerformanceProfiler = require('./PerformanceProfiler');

// Configuration globale
let mainWindow;
let inputManager;
let messageBatcher;
let performanceProfiler;

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



    // Afficher la fenêtre quand elle est prête
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Gestionnaire d'événement pour la fermeture de la fenêtre
    mainWindow.on('close', async () => {
        console.log('Fenêtre principale fermée, arrêt de l\'application...');
        await cleanupApplication();
    });
}

// Initialiser tous les inputs
async function initializeInputs() {
    inputManager = new InputManager();

    // Initialiser le message batcher avec des paramètres ultra-performants
    messageBatcher = new MessageBatcher({
        batchInterval: 50,        // 20fps au lieu de 30fps pour plus de batching
        maxBatchSize: 100,        // Batches plus gros
        guiUpdateInterval: 10000  // 10 secondes max au lieu de 30
    });

    //Initialiser le profiler de performance
    //performanceProfiler = new PerformanceProfiler();
    //performanceProfiler.startMonitoring(2000); // Log toutes les 2 secondes

    // Configurer le callback pour envoyer les batches
    messageBatcher.setBatchCallback((batch) => {
        //performanceProfiler.recordEvent('batchSent', { size: batch.batchSize });
        if (mainWindow && !mainWindow.isDestroyed()) {
            //performanceProfiler.recordEvent('ipcSent');
            mainWindow.webContents.send('input-message-batch', batch);
        }
    });

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
            console.log(data.rawMessage);
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

// Fonction de nettoyage lors de la fermeture
async function cleanupApplication() {
    console.log('Nettoyage de l\'application en cours...');
    
    // Arrêter le profiler de performance
    if (performanceProfiler) {
        console.log('Arrêt du profiler de performance...');
        performanceProfiler.stopMonitoring();
        performanceProfiler = null;
    }
    
    // Arrêter le message batcher
    if (messageBatcher) {
        console.log('Arrêt du message batcher...');
        messageBatcher.destroy();
        messageBatcher = null;
    }
    
    // Arrêter tous les inputs
    if (inputManager) {
        console.log('Arrêt de tous les inputs...');
        await inputManager.stopAllInputs();
        inputManager = null;
    }
    
    console.log('Nettoyage terminé.');
}

// Gérer les messages reçus de tous les inputs
function handleInputMessage(data) {
    // Validation rapide des données (plus efficace qu'un try...catch)
    if (!data || !data.rawMessage || !data.level) {
        return;
    }

    // Profiling: message socket reçu
    if (performanceProfiler) {
        performanceProfiler.recordEvent('socketMessage');
    }

    const formattedMessages = formatMessage(data.rawMessage, data.level);

    formattedMessages.forEach(formattedMessage => {
        // Profiling: message formaté
        if (performanceProfiler) {
            performanceProfiler.recordEvent('messageFormatted');
        }

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
        if (data.caller) {
            formattedMessage.caller = data.caller;
        }

        // Ajouter au batcher au lieu d'envoyer directement
        if (messageBatcher) {
            messageBatcher.addMessage(formattedMessage);

            // Profiling: taille de la queue
            if (performanceProfiler) {
                performanceProfiler.recordEvent('queueSize', {
                    size: messageBatcher.getCurrentQueueSize()
                });
            }
        } else {
            // Fallback si le batcher n'est pas initialisé
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('input-message-received', formattedMessage);
            }
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

    // Handler pour obtenir les métriques de performance du batcher
    ipcMain.handle('inputs:getMetrics', () => {
        if (messageBatcher) {
            return messageBatcher.getPerformanceMetrics();
        }
        return {
            messagesPerSecond: 0,
            batchesPerSecond: 0,
            avgBatchSize: 0,
            currentQueueSize: 0,
            isThrottling: false,
            uptimeMs: 0
        };
    });

    // Handler pour configurer le throttling à chaud
    ipcMain.handle('inputs:configureThrottling', (event, config) => {
        if (messageBatcher) {
            messageBatcher.configure(config);
            return { success: true, config };
        }
        return { success: false, error: 'MessageBatcher non initialisé' };
    });

    // Handler pour forcer l'envoi d'un batch
    ipcMain.handle('inputs:forceBatch', () => {
        if (messageBatcher) {
            messageBatcher.forceBatch();
            return { success: true };
        }
        return { success: false };
    });

    // Handler pour obtenir les métriques du profiler de performance
    ipcMain.handle('performance:getMetrics', () => {
        if (performanceProfiler) {
            return performanceProfiler.getMetrics();
        }
        return null;
    });

    // Handler pour contrôler le monitoring
    ipcMain.handle('performance:toggleMonitoring', (event, enable) => {
        if (performanceProfiler) {
            if (enable) {
                performanceProfiler.startMonitoring(1000);
            } else {
                performanceProfiler.stopMonitoring();
            }
            return { success: true, monitoring: enable };
        }
        return { success: false };
    });

    // Handler pour reset les métriques
    ipcMain.handle('performance:resetMetrics', () => {
        if (performanceProfiler) {
            performanceProfiler.reset();
            return { success: true };
        }
        return { success: false };
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

// Gérer les signaux système pour un arrêt propre
process.on('SIGINT', async () => {
    console.log('Signal SIGINT reçu, arrêt propre en cours...');
    await cleanupApplication();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Signal SIGTERM reçu, arrêt propre en cours...');
    await cleanupApplication();
    process.exit(0);
});

// Gérer les exceptions non capturées
process.on('uncaughtException', async (error) => {
    console.error('Exception non capturée:', error);
    await cleanupApplication();
    process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
    console.error('Promesse rejetée non gérée à:', promise, 'raison:', reason);
    await cleanupApplication();
    process.exit(1);
});

// Cette méthode sera appelée quand Electron aura fini
// de s'initialiser et sera prêt à créer des fenêtres de navigateur.
app.whenReady().then(async () => {
    createWindow();
    setupIpcHandlers();
    await initializeInputs();
});

// Quitter quand toutes les fenêtres sont fermées
app.on('window-all-closed', async () => {
    console.log('Toutes les fenêtres sont fermées, arrêt de l\'application...');
    await cleanupApplication();
    
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