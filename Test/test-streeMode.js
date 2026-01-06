const { io } = require('socket.io-client');

// Configuration du client
const socket = io('http://localhost:3001');

console.log('Connexion au serveur Socket.IO...');

// Attendre la connexion
socket.on('connect', () => {
    console.log('Connecté au serveur Socket.IO avec ID:', socket.id);

    console.log('Début de l\'envoi intensif de messages (60+ par seconde pendant 10 secondes)...');

    let messageCount = 0;
    const startTime = Date.now();
    const processes = ['process1', 'process2', 'process3', 'process4', 'process5'];
    let currentTemp = 20.0;

    // Envoi intensif : 16ms d'intervalle = ~62.5 messages/seconde
    const intensiveInterval = setInterval(() => {
        const processIndex = messageCount % processes.length;
        const processName = processes[processIndex];

        // Alterner entre messages normaux et variables
        if (messageCount % 10 === 0) {
            // Message avec variable (température qui augmente)
            currentTemp += Math.random() * 2 - 1; // Variation de ±1°C
            socket.emit('log-message', `[${processName}] temperature = ${currentTemp.toFixed(1)}`);
        } else {
            // Message normal
            socket.emit('log-message', `[${processName}] Message #${messageCount} - timestamp: ${Date.now()}`);
        }

        messageCount++;

        // Afficher le progrès toutes les 100 messages
        if (messageCount % 100 === 0) {
            const elapsed = (Date.now() - startTime) / 1000;
            const rate = messageCount / elapsed;
            console.log(`${messageCount} messages envoyés (${rate.toFixed(1)} msg/sec)`);
        }
    }, 16); // 16ms = ~62.5 messages par seconde

    // Arrêt brutal après 10 secondes
    setTimeout(() => {
        clearInterval(intensiveInterval);
        const elapsed = (Date.now() - startTime) / 1000;
        const finalRate = messageCount / elapsed;
        console.log(`ARRÊT BRUTAL après ${elapsed.toFixed(1)}s - Total: ${messageCount} messages (${finalRate.toFixed(1)} msg/sec)`);
        console.log('Déconnexion...');
        socket.disconnect();
        process.exit(0);
    }, 10000); // 10 secondes
});

// Gestion des erreurs
socket.on('connect_error', (error) => {
    console.error('Erreur de connexion:', error);
    process.exit(1);
});

// Écouter les messages de broadcast
socket.on('broadcast-message', (message) => {
    console.log('Message reçu du serveur:', message);
});