/**
 * Performance Profiler - Outil de diagnostic des goulots d'étranglement
 */
class PerformanceProfiler {
    constructor() {
        this.metrics = {
            socketMessages: { received: 0, lastTimestamp: 0 },
            formattedMessages: { processed: 0, lastTimestamp: 0 },
            ipcMessages: { sent: 0, lastTimestamp: 0 },
            batchesSent: { count: 0, totalSize: 0, lastTimestamp: 0 },
            queueSizes: { current: 0, max: 0, history: [] }
        };

        this.timers = new Map();
        this.isMonitoring = false;
        this.logInterval = null;

        console.log('🔍 PerformanceProfiler initialisé');
    }

    // Démarrer le monitoring
    startMonitoring(intervalMs = 1000) {
        this.isMonitoring = true;
        this.logInterval = setInterval(() => {
            this.logCurrentMetrics();
        }, intervalMs);
        console.log('📊 Monitoring démarré');
    }

    // Arrêter le monitoring
    stopMonitoring() {
        this.isMonitoring = false;
        if (this.logInterval) {
            clearInterval(this.logInterval);
            this.logInterval = null;
        }
        console.log('⏹️ Monitoring arrêté');
    }

    // Enregistrer un événement
    recordEvent(type, data = {}) {
        if (!this.metrics[type]) {
            this.metrics[type] = { count: 0, lastTimestamp: 0 };
        }

        const now = Date.now();

        switch (type) {
            case 'socketMessage':
                this.metrics.socketMessages.received++;
                this.metrics.socketMessages.lastTimestamp = now;
                break;

            case 'messageFormatted':
                this.metrics.formattedMessages.processed++;
                this.metrics.formattedMessages.lastTimestamp = now;
                break;

            case 'ipcSent':
                this.metrics.ipcMessages.sent++;
                this.metrics.ipcMessages.lastTimestamp = now;
                break;

            case 'batchSent':
                this.metrics.batchesSent.count++;
                this.metrics.batchesSent.totalSize += (data.size || 0);
                this.metrics.batchesSent.lastTimestamp = now;
                break;

            case 'queueSize':
                this.metrics.queueSizes.current = data.size || 0;
                this.metrics.queueSizes.max = Math.max(this.metrics.queueSizes.max, this.metrics.queueSizes.current);
                this.metrics.queueSizes.history.push({ timestamp: now, size: this.metrics.queueSizes.current });

                // Garder seulement les 100 dernières mesures
                if (this.metrics.queueSizes.history.length > 100) {
                    this.metrics.queueSizes.history = this.metrics.queueSizes.history.slice(-100);
                }
                break;
        }
    }

    // Timer haute précision
    startTimer(name) {
        this.timers.set(name, process.hrtime.bigint());
    }

    endTimer(name) {
        const start = this.timers.get(name);
        if (!start) return 0;

        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1000000; // Convertir en millisecondes
        this.timers.delete(name);
        return duration;
    }

    // Log des métriques actuelles
    logCurrentMetrics() {
        const now = Date.now();

        console.log('\n🔍 === PROFILER METRICS ===');
        console.log(`📥 Socket Messages: ${this.metrics.socketMessages.received} (last: ${this.getTimeSince(this.metrics.socketMessages.lastTimestamp)}ms ago)`);
        console.log(`⚙️ Formatted Messages: ${this.metrics.formattedMessages.processed} (last: ${this.getTimeSince(this.metrics.formattedMessages.lastTimestamp)}ms ago)`);
        console.log(`📤 IPC Messages: ${this.metrics.ipcMessages.sent} (last: ${this.getTimeSince(this.metrics.ipcMessages.lastTimestamp)}ms ago)`);
        console.log(`📦 Batches: ${this.metrics.batchesSent.count} (total size: ${this.metrics.batchesSent.totalSize}, last: ${this.getTimeSince(this.metrics.batchesSent.lastTimestamp)}ms ago)`);
        console.log(`📊 Queue: current=${this.metrics.queueSizes.current}, max=${this.metrics.queueSizes.max}`);

        // Calculer les taux
        const timeWindowMs = 5000; // 5 secondes
        const recentHistory = this.metrics.queueSizes.history.filter(h => now - h.timestamp < timeWindowMs);
        const avgQueueSize = recentHistory.length > 0 ?
            recentHistory.reduce((sum, h) => sum + h.size, 0) / recentHistory.length : 0;

        console.log(`📈 Average queue (5s): ${avgQueueSize.toFixed(1)}`);

        // Détection de goulots d'étranglement
        this.detectBottlenecks(now);

        console.log('🔍 ========================\n');
    }

    getTimeSince(timestamp) {
        return timestamp > 0 ? Date.now() - timestamp : 'never';
    }

    // Détecter les goulots d'étranglement
    detectBottlenecks(now) {
        const warnings = [];

        // Queue trop pleine
        if (this.metrics.queueSizes.current > 50) {
            warnings.push(`🚨 QUEUE OVERFLOW: ${this.metrics.queueSizes.current} messages en attente`);
        }

        // Messages qui ne sont plus traités
        const socketDelay = this.getTimeSince(this.metrics.socketMessages.lastTimestamp);
        const ipcDelay = this.getTimeSince(this.metrics.ipcMessages.lastTimestamp);

        if (typeof socketDelay === 'number' && socketDelay > 2000) {
            warnings.push(`⚠️ SOCKET STALLED: Pas de messages socket depuis ${socketDelay}ms`);
        }

        if (typeof ipcDelay === 'number' && ipcDelay > 2000) {
            warnings.push(`⚠️ IPC STALLED: Pas d'envoi IPC depuis ${ipcDelay}ms`);
        }

        // Ratio messages reçus vs envoyés
        const ratio = this.metrics.ipcMessages.sent > 0 ?
            this.metrics.socketMessages.received / this.metrics.ipcMessages.sent : 0;

        if (ratio > 10) {
            warnings.push(`⚠️ IPC BACKLOG: Ratio socket/IPC = ${ratio.toFixed(1)} (normal: 1-3)`);
        }

        if (warnings.length > 0) {
            console.log('🚨 BOTTLENECKS DETECTED:');
            warnings.forEach(warning => console.log(`  ${warning}`));
        }
    }

    // Export des métriques pour analyse
    getMetrics() {
        return {
            ...this.metrics,
            activeTimers: Array.from(this.timers.keys())
        };
    }

    // Reset des métriques
    reset() {
        this.metrics = {
            socketMessages: { received: 0, lastTimestamp: 0 },
            formattedMessages: { processed: 0, lastTimestamp: 0 },
            ipcMessages: { sent: 0, lastTimestamp: 0 },
            batchesSent: { count: 0, totalSize: 0, lastTimestamp: 0 },
            queueSizes: { current: 0, max: 0, history: [] }
        };
        this.timers.clear();
        console.log('📊 Métriques remises à zéro');
    }
}

module.exports = PerformanceProfiler;