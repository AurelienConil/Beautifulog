/**
 * Test de Performance du Nouveau Système
 * 
 * Ce test simule un stress test et mesure les performances
 * du nouveau système avec:
 * - MessageBatcher (throttling à 50ms)
 * - Store avec messagesByLabel (ségrégation par label)
 * - LogView optimisé avec v-memo
 */

const { SocketInput } = require('../inputs/SocketInput');

async function runPerformanceTest() {
    console.log('🚀 Démarrage du test de performance...\n');

    // Configuration du test
    const config = {
        testDurationMs: 10000, // 10 secondes
        messagesPerSecond: 200, // 200 msg/s
        labels: ['ProcessA', 'ProcessB', 'ProcessC', 'ProcessD'], // 4 processus
        messageTypes: ['info', 'warning', 'error', 'debug']
    };

    console.log('Configuration du test:');
    console.log(`- Durée: ${config.testDurationMs / 1000}s`);
    console.log(`- Fréquence: ${config.messagesPerSecond} msg/s`);
    console.log(`- Labels: ${config.labels.join(', ')}`);
    console.log(`- Total attendu: ${(config.testDurationMs / 1000) * config.messagesPerSecond} messages\n`);

    // Créer une instance de socket pour le test
    const socketInput = new SocketInput({ port: 3001 });

    // Métriques
    let sentCount = 0;
    let startTime = Date.now();

    // Générateur de messages
    const generateMessage = (index) => {
        const label = config.labels[index % config.labels.length];
        const type = config.messageTypes[index % config.messageTypes.length];

        return {
            timestamp: new Date().toISOString(),
            type: `${type}-message`,
            label: label,
            msg: `Message test ${index} de type ${type}`,
            format: 'string',
            testIndex: index
        };
    };

    // Fonction d'envoi de messages
    const sendMessages = () => {
        const interval = setInterval(() => {
            // Envoyer un batch de messages
            for (let i = 0; i < 5; i++) { // 5 messages par intervalle
                const message = generateMessage(sentCount++);

                // Simuler l'envoi via socket
                if (socketInput.handleMessage) {
                    socketInput.handleMessage(message);
                }
            }

            // Afficher le progrès
            if (sentCount % 100 === 0) {
                const elapsed = Date.now() - startTime;
                const rate = Math.round((sentCount / elapsed) * 1000);
                console.log(`📊 Envoyé: ${sentCount} messages (${rate} msg/s)`);
            }

        }, 25); // 25ms = 40 intervals/s × 5 msg = 200 msg/s

        // Arrêter après la durée configurée
        setTimeout(() => {
            clearInterval(interval);
            finishTest();
        }, config.testDurationMs);
    };

    const finishTest = () => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        const actualRate = Math.round((sentCount / duration) * 1000);

        console.log('\n✅ Test terminé!');
        console.log(`📈 Statistiques:`);
        console.log(`- Messages envoyés: ${sentCount}`);
        console.log(`- Durée réelle: ${duration}ms`);
        console.log(`- Débit réel: ${actualRate} msg/s`);
        console.log(`- Débit cible: ${config.messagesPerSecond} msg/s`);

        const efficiency = Math.round((actualRate / config.messagesPerSecond) * 100);
        console.log(`- Efficacité: ${efficiency}%`);

        // Attendre un peu pour voir les métriques finales
        setTimeout(() => {
            console.log('\n🔍 Vérifiez maintenant les métriques dans l\'interface:');
            console.log('- PerformanceMonitor pour voir les batches traités');
            console.log('- Lag de l\'interface après arrêt du test');
            console.log('- Consommation mémoire par label\n');

            // Laisser le processus ouvert pour observation
            console.log('⏸️  Test en pause pour observation (Ctrl+C pour quitter)');
        }, 2000);
    };

    // Démarrer le test
    try {
        await socketInput.start();
        console.log('✅ Socket de test démarrée sur le port 3001\n');
        sendMessages();
    } catch (error) {
        console.error('❌ Erreur lors du démarrage du test:', error);
    }
}

// Lancer le test si appelé directement
if (require.main === module) {
    runPerformanceTest().catch(console.error);
}

module.exports = { runPerformanceTest };