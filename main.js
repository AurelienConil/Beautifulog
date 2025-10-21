const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { Server } = require('socket.io');
const http = require('http');
const isDev = process.env.NODE_ENV === 'development';
const { formatMessage } = require('./formatMessage');

// Configuration du serveur Socket.IO
const socketPort = 3001;
let mainWindow;
let socketServer;

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
    mainWindow.on('close', () => {
        console.log('Fenêtre principale fermée, arrêt de l\'application...');
        // Si besoin, effectuer des opérations de nettoyage supplémentaires ici
    });
}

// Créer le serveur Socket.IO
function createSocketServer() {
    const server = http.createServer();
    socketServer = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    // Gestion des connexions Socket.IO
    socketServer.on('connection', (socket) => {
        console.log('Nouvelle connexion Socket.IO:', socket.id);

        // Écouter les messages personnalisés
        socket.on('log-message', (data) => {
            // Vérifier que data est uniquement un string
            if (typeof data !== 'string') {
                console.error('Le message doit être une chaîne de caractères');
                return;
            }

            console.log('Message reçu via Socket.IO:', data);

            try {
                const formattedMessage = formatMessage(data);
                console.log('Message formaté:', formattedMessage);

                // Ajouter les métadonnées du socket
                formattedMessage.socketId = socket.id;
                formattedMessage.receivedAt = new Date().toISOString();
                formattedMessage.clientCount = socketServer.engine.clientsCount;

                //Voici le format de formattedMessage:
                /*
                {
                    label: 'process1',
                    type: 'log',
                    msg: 'Ceci est un message de log de test avec le label process1',
                    timestamp: '2024-06-10T12:34:56.789Z',
                    socketId: 'abc123def456',
                    receivedAt: '2024-06-10T12:34:56.789Z',
                    clientCount: 1
                }
                 */


                // Transmettre le message au frontend via IPC
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('socket-message-received', formattedMessage);
                }
            } catch (error) {
                console.error('Erreur lors du formatage du message:', error.message);
            }
        });


        // Gestion de la déconnexion
        socket.on('disconnect', () => {
            console.log('Déconnexion Socket.IO:', socket.id);

            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('socket-client-disconnected', {
                    socketId: socket.id,
                    timestamp: new Date().toISOString()
                });
            }
        });
    });

    // Démarrer le serveur
    server.listen(socketPort, () => {
        console.log(`Serveur Socket.IO en écoute sur le port ${socketPort}`);
    });

    return server;
}

// Handlers IPC pour la communication avec le frontend
function setupIpcHandlers() {
    // Handler pour obtenir le statut du serveur Socket.IO
    ipcMain.handle('socket:getStatus', () => {
        return {
            isRunning: socketServer ? true : false,
            port: socketPort,
            connectedClients: socketServer ? socketServer.engine.clientsCount : 0
        };
    });

    // Handler pour envoyer un message à tous les clients connectés
    ipcMain.handle('socket:broadcast', (event, message) => {
        if (socketServer) {
            socketServer.emit('broadcast-message', message);
            return { success: true, message: 'Message diffusé à tous les clients' };
        }
        return { success: false, message: 'Serveur Socket.IO non disponible' };
    });

    // Handler pour obtenir la liste des clients connectés
    ipcMain.handle('socket:getClients', () => {
        if (socketServer) {
            const clients = Array.from(socketServer.sockets.sockets.keys());
            return clients;
        }
        return [];
    });
}

// Cette méthode sera appelée quand Electron aura fini
// de s'initialiser et sera prêt à créer des fenêtres de navigateur.
app.whenReady().then(() => {
    createWindow();
    createSocketServer();
    setupIpcHandlers();
});

// Quitter quand toutes les fenêtres sont fermées
app.on('window-all-closed', () => {
    // Fermer le serveur Socket.IO
    if (socketServer) {
        socketServer.close();
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