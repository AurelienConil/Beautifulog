/**
 * Classe abstraite pour les différents types d'entrées de logs
 * Les classes filles doivent implémenter les méthodes abstraites
 */
class LogInput {
    constructor(name, config = {}) {
        if (this.constructor === LogInput) {
            throw new Error('LogInput est une classe abstraite et ne peut pas être instanciée directement');
        }

        this.name = name;
        this.config = config;
        this.status = 'disconnected'; // 'disconnected', 'connecting', 'connected', 'error'
        this.lastError = null;
        this.connectedClients = 0;
        this.messagesReceived = 0;
        this.startTime = null;
        this.callbacks = {
            onMessage: null,
            onStatusChange: null,
            onClientChange: null
        };
    }

    /**
     * Démarre l'entrée de logs
     * @abstract
     * @returns {Promise<void>}
     */
    async start() {
        throw new Error('La méthode start() doit être implémentée par la classe fille');
    }

    /**
     * Arrête l'entrée de logs
     * @abstract
     * @returns {Promise<void>}
     */
    async stop() {
        throw new Error('La méthode stop() doit être implémentée par la classe fille');
    }

    /**
     * Vérifie si l'entrée est disponible/compatible
     * @abstract
     * @returns {Promise<boolean>}
     */
    async isAvailable() {
        throw new Error('La méthode isAvailable() doit être implémentée par la classe fille');
    }

    /**
     * Envoie un message de broadcast (si supporté)
     * @abstract
     * @param {string} message - Le message à envoyer
     * @returns {Promise<boolean>}
     */
    async broadcast(message) {
        throw new Error('La méthode broadcast() doit être implémentée par la classe fille');
    }

    /**
     * Retourne le statut actuel de l'entrée
     * @returns {Object}
     */
    getStatus() {
        return {
            name: this.name,
            type: this.constructor.name,
            status: this.status,
            connectedClients: this.connectedClients,
            messagesReceived: this.messagesReceived,
            lastError: this.lastError,
            startTime: this.startTime,
            uptime: this.startTime ? Date.now() - this.startTime : 0,
            config: this.getPublicConfig()
        };
    }

    /**
     * Retourne la configuration publique (sans données sensibles)
     * @returns {Object}
     */
    getPublicConfig() {
        return { ...this.config };
    }

    /**
     * Définit le callback pour les messages reçus
     * @param {Function} callback - Fonction appelée lors de la réception d'un message
     */
    onMessage(callback) {
        this.callbacks.onMessage = callback;
    }

    /**
     * Définit le callback pour les changements de statut
     * @param {Function} callback - Fonction appelée lors d'un changement de statut
     */
    onStatusChange(callback) {
        this.callbacks.onStatusChange = callback;
    }

    /**
     * Définit le callback pour les changements de clients connectés
     * @param {Function} callback - Fonction appelée lors d'un changement du nombre de clients
     */
    onClientChange(callback) {
        this.callbacks.onClientChange = callback;
    }

    /**
     * Met à jour le statut et notifie les callbacks
     * @protected
     * @param {string} newStatus - Nouveau statut
     * @param {string|null} error - Message d'erreur éventuel
     */
    _updateStatus(newStatus, error = null) {
        const oldStatus = this.status;
        this.status = newStatus;
        this.lastError = error;

        if (newStatus === 'connected' && !this.startTime) {
            this.startTime = Date.now();
        }

        if (this.callbacks.onStatusChange && oldStatus !== newStatus) {
            this.callbacks.onStatusChange({
                name: this.name,
                oldStatus,
                newStatus,
                error
            });
        }
    }

    /**
     * Met à jour le nombre de clients connectés
     * @protected
     * @param {number} count - Nouveau nombre de clients
     */
    _updateClientCount(count) {
        const oldCount = this.connectedClients;
        this.connectedClients = count;

        if (this.callbacks.onClientChange && oldCount !== count) {
            this.callbacks.onClientChange({
                name: this.name,
                oldCount,
                newCount: count
            });
        }
    }

    /**
     * Traite et transmet un message reçu
     * @protected
     * @param {string} rawMessage - Message brut reçu
     * @param {Object} metadata - Métadonnées additionnelles
     */
    _processMessage(rawMessage, metadata = {}) {
        this.messagesReceived++;

        if (this.callbacks.onMessage) {
            this.callbacks.onMessage({
                rawMessage,
                source: this.name,
                type: this.constructor.name,
                timestamp: new Date().toISOString(),
                ...metadata
            });
        }
    }
}

module.exports = LogInput;