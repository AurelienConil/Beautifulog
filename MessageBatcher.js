/**
 * MessageBatcher - Système de batching pour optimiser les performances IPC
 * 
 * Ce module accumule les messages reçus et les envoie par paquets à intervalles réguliers
 * pour éviter de saturer l'IPC et la réactivité Vue avec des messages individuels.
 */
class MessageBatcher {
    constructor(options = {}) {
        // Configuration du batching
        this.batchInterval = options.batchInterval || 33; // 30fps = 33ms
        this.maxBatchSize = options.maxBatchSize || 50;   // Taille max d'un batch
        this.guiUpdateInterval = options.guiUpdateInterval || 30000; // 30 secondes max entre updates

        // État interne
        this.messageQueue = [];
        this.batchTimer = null;
        this.lastGuiUpdate = Date.now();
        this.isThrottling = false;

        // Callback pour envoyer les batches
        this.onBatchReady = null;

        // Métriques de performance
        this.metrics = {
            messagesProcessed: 0,
            batchesSent: 0,
            throttleEvents: 0,
            lastPerformanceCheck: Date.now(),
            queueOverflows: 0
        };

        console.log('📦 MessageBatcher initialisé avec:', {
            batchInterval: this.batchInterval + 'ms',
            maxBatchSize: this.maxBatchSize,
            guiUpdateInterval: this.guiUpdateInterval + 'ms'
        });
    }

    /**
     * Ajouter un message à la queue de batching
     * @param {Object} message - Le message à ajouter
     */
    addMessage(message) {
        // Ajouter timestamp de batching si absent
        if (!message.batchedAt) {
            message.batchedAt = Date.now();
        }

        this.messageQueue.push(message);
        this.metrics.messagesProcessed++;

        // Déclencher l'envoi immédiat si la taille max est atteinte
        if (this.messageQueue.length >= this.maxBatchSize) {
            console.log(`⚡ Batch forcé - taille max atteinte: ${this.messageQueue.length}`);
            this.flushBatch();
            return;
        }

        // Programmer l'envoi si pas déjà fait
        if (!this.batchTimer) {
            this.batchTimer = setTimeout(() => {
                this.flushBatch();
            }, this.batchInterval);
        }
    }

    /**
     * Envoyer le batch actuel
     */
    flushBatch() {
        if (this.messageQueue.length === 0) {
            this.clearTimer();
            return;
        }

        const now = Date.now();

        // Vérifier si on doit throttler l'UI
        const shouldThrottle = this.shouldThrottleGUI(now);
        if (shouldThrottle && !this.isThrottling) {
            this.isThrottling = true;
            this.metrics.throttleEvents++;
            console.log('🔄 Activation du throttling GUI - charge élevée détectée');
        } else if (!shouldThrottle && this.isThrottling) {
            this.isThrottling = false;
            console.log('✅ Désactivation du throttling GUI - charge normale');
        }

        // En mode throttling, garder seulement les messages les plus récents
        if (this.isThrottling && this.messageQueue.length > 20) {
            const originalLength = this.messageQueue.length;
            this.messageQueue = this.messageQueue.slice(-20);
            this.metrics.queueOverflows++;
            console.log(`🔄 Queue réduite: ${originalLength} → ${this.messageQueue.length} messages`);
        }

        // Créer le batch
        const batch = {
            messages: [...this.messageQueue],
            batchSize: this.messageQueue.length,
            isThrottling: this.isThrottling,
            timestamp: now,
            processingTime: now - (this.messageQueue[0]?.batchedAt || now)
        };

        // Vider la queue
        this.messageQueue = [];
        this.clearTimer();
        this.lastGuiUpdate = now;
        this.metrics.batchesSent++;

        // Envoyer le batch
        if (this.onBatchReady) {
            this.onBatchReady(batch);
        }

        // Log pour debugging
        if (batch.batchSize > 10 || batch.isThrottling) {
            console.log(`📤 Batch envoyé:`, {
                size: batch.batchSize,
                throttling: batch.isThrottling,
                processingTime: batch.processingTime + 'ms'
            });
        }
    }

    /**
     * Déterminer si on doit throttler l'interface graphique
     * @param {number} now - Timestamp actuel
     * @returns {boolean} True si throttling nécessaire
     */
    shouldThrottleGUI(now) {
        const timeSinceLastUpdate = now - this.lastGuiUpdate;
        const queueSize = this.messageQueue.length;

        // Throttler si:
        // 1. Trop de messages en attente (surcharge)
        // 2. Trop de temps écoulé depuis la dernière update (limite temporelle)
        const highLoad = queueSize > 100;
        const timeLimit = timeSinceLastUpdate > this.guiUpdateInterval;

        return highLoad || timeLimit;
    }

    /**
     * Définir le callback pour l'envoi des batches
     * @param {Function} callback - Fonction appelée avec chaque batch
     */
    setBatchCallback(callback) {
        this.onBatchReady = callback;
    }

    /**
     * Nettoyer le timer
     */
    clearTimer() {
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }
    }

    /**
     * Forcer l'envoi immédiat du batch actuel
     */
    forceBatch() {
        this.flushBatch();
    }

    /**
     * Obtenir les métriques de performance
     * @returns {Object} Métriques actuelles
     */
    getPerformanceMetrics() {
        const now = Date.now();
        const timeDiff = now - this.metrics.lastPerformanceCheck;

        return {
            ...this.metrics,
            messagesPerSecond: timeDiff > 0 ? Math.round((this.metrics.messagesProcessed * 1000) / timeDiff) : 0,
            batchesPerSecond: timeDiff > 0 ? Math.round((this.metrics.batchesSent * 1000) / timeDiff) : 0,
            avgBatchSize: this.metrics.batchesSent > 0 ? Math.round(this.metrics.messagesProcessed / this.metrics.batchesSent) : 0,
            currentQueueSize: this.messageQueue.length,
            isThrottling: this.isThrottling,
            uptimeMs: timeDiff
        };
    }

    /**
     * Remettre à zéro les métriques
     */
    resetMetrics() {
        this.metrics = {
            messagesProcessed: 0,
            batchesSent: 0,
            throttleEvents: 0,
            lastPerformanceCheck: Date.now(),
            queueOverflows: 0
        };
        console.log('📊 Métriques MessageBatcher remises à zéro');
    }

    /**
     * Configurer les paramètres de throttling à chaud
     * @param {Object} config - Nouvelle configuration
     */
    configure(config) {
        if (config.batchInterval && config.batchInterval > 0) {
            this.batchInterval = config.batchInterval;
        }
        if (config.maxBatchSize && config.maxBatchSize > 0) {
            this.maxBatchSize = config.maxBatchSize;
        }
        if (config.guiUpdateInterval && config.guiUpdateInterval > 0) {
            this.guiUpdateInterval = config.guiUpdateInterval;
        }

        console.log('⚙️ MessageBatcher reconfiguré:', {
            batchInterval: this.batchInterval + 'ms',
            maxBatchSize: this.maxBatchSize,
            guiUpdateInterval: this.guiUpdateInterval + 'ms'
        });
    }

    /**
     * Obtenir la taille actuelle de la queue (pour monitoring)
     * @returns {number} Nombre de messages en attente
     */
    getCurrentQueueSize() {
        return this.messageQueue.length;
    }

    /**
     * Nettoyage et destruction
     */
    destroy() {
        // Envoyer le dernier batch s'il y en a un
        if (this.messageQueue.length > 0) {
            this.flushBatch();
        }

        // Nettoyer le timer
        this.clearTimer();

        // Réinitialiser l'état
        this.messageQueue = [];
        this.onBatchReady = null;

        console.log('🗑️ MessageBatcher détruit');
    }
}

module.exports = MessageBatcher;