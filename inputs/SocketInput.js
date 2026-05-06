const LogInput = require('./LogInput');
const { Server } = require('socket.io');
const http = require('http');

/**
 * Implémentation Socket.IO de LogInput
 * Reçoit les logs via des connexions Socket.IO
 */
class SocketInput extends LogInput {
    constructor(config = {}) {
        super('Socket.IO', {
            port: config.port || 3001,
            cors: config.cors || {
                origin: "*",
                methods: ["GET", "POST"]
            },
            ...config
        });

        this.server = null;
        this.socketServer = null;
        this.connectedSockets = new Map();
    }

    /**
     * Vérifie si Socket.IO est disponible
     * @returns {Promise<boolean>}
     */
    async isAvailable() {
        return true; // Socket.IO est toujours disponible
    }

    /**
     * Démarre le serveur Socket.IO
     * @returns {Promise<void>}
     */
    async start() {
        try {
            this._updateStatus('connecting');

            // Créer le serveur HTTP
            this.server = http.createServer();

            // Créer le serveur Socket.IO
            this.socketServer = new Server(this.server, {
                cors: this.config.cors
            });

            // Configurer les événements Socket.IO
            this._setupSocketEvents();

            // Démarrer le serveur
            await new Promise((resolve, reject) => {
                this.server.listen(this.config.port, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });

            console.log(`Serveur Socket.IO (${this.name}) démarré sur le port ${this.config.port}`);
            this._updateStatus('connected');

        } catch (error) {
            console.error(`Erreur lors du démarrage du serveur Socket.IO:`, error);
            this._updateStatus('error', error.message);
            throw error;
        }
    }

    /**
     * Arrête le serveur Socket.IO
     * @returns {Promise<void>}
     */
    async stop() {
        try {
            this._updateStatus('disconnected');

            if (this.socketServer) {
                await new Promise((resolve) => {
                    this.socketServer.close(() => {
                        resolve();
                    });
                });
                this.socketServer = null;
            }

            if (this.server) {
                await new Promise((resolve) => {
                    this.server.close(() => {
                        resolve();
                    });
                });
                this.server = null;
            }

            this.connectedSockets.clear();
            this._updateClientCount(0);
            console.log(`Serveur Socket.IO (${this.name}) arrêté`);

        } catch (error) {
            console.error(`Erreur lors de l'arrêt du serveur Socket.IO:`, error);
            this._updateStatus('error', error.message);
            throw error;
        }
    }

    /**
     * Envoie un message à tous les clients connectés
     * @param {string} message - Le message à diffuser
     * @returns {Promise<boolean>}
     */
    async broadcast(message) {
        try {
            if (this.socketServer && this.status === 'connected') {
                this.socketServer.emit('broadcast-message', {
                    message,
                    timestamp: new Date().toISOString(),
                    source: this.name
                });
                return true;
            }
            return false;
        } catch (error) {
            console.error('Erreur lors de la diffusion:', error);
            return false;
        }
    }

    /**
     * Retourne la configuration publique
     * @returns {Object}
     */
    getPublicConfig() {
        return {
            port: this.config.port,
            corsOrigins: this.config.cors.origin
        };
    }

    /**
     * Configure les événements Socket.IO
     * @private
     */
    _setupSocketEvents() {
        this.socketServer.on('connection', (socket) => {
            console.log(`Nouvelle connexion Socket.IO: ${socket.id}`);

            // Ajouter le socket à la liste
            this.connectedSockets.set(socket.id, {
                id: socket.id,
                connectedAt: new Date().toISOString(),
                lastMessageAt: null
            });

            this._updateClientCount(this.connectedSockets.size);

            // Écouter les messages de log
            socket.on('log-message', (data) => {
                this._handleLogMessage(socket, data);
            });

            // Écouter les déconnexions
            socket.on('disconnect', () => {
                console.log(`Déconnexion Socket.IO: ${socket.id}`);

                // Retirer le socket de la liste
                this.connectedSockets.delete(socket.id);
                this._updateClientCount(this.connectedSockets.size);
            });
        });
    }

    /**
     * Traite un message de log reçu
     * @private
     * @param {Object} socket - Socket émetteur
     * @param {Object} data - Payload structuré { message, level, caller }
     */
    _handleLogMessage(socket, data) {
        // Only structured object payloads are supported
        if (!data || typeof data !== 'object' || typeof data.message !== 'string') {
            return;
        }

        const { message, level, caller } = data;

        // Mettre à jour les métadonnées du socket
        if (this.connectedSockets.has(socket.id)) {
            this.connectedSockets.get(socket.id).lastMessageAt = new Date().toISOString();
        }

        // Traiter le message avec les métadonnées
        this._processMessage(message, {
            socketId: socket.id,
            clientCount: this.connectedSockets.size,
            level,
            caller
        });
    }

    /**
     * Retourne la liste des clients connectés
     * @returns {Array}
     */
    getConnectedClients() {
        return Array.from(this.connectedSockets.values());
    }
}

module.exports = SocketInput;