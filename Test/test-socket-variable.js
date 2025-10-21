const { io } = require('socket.io-client');

// Configuration du client
const socket = io('http://localhost:3001');

console.log('Connexion au serveur Socket.IO...');

// Attendre la connexion
socket.on('connect', () => {
    console.log('Connecté au serveur Socket.IO avec ID:', socket.id);

    // Envoyer un message simple
    setTimeout(() => {
        console.log('Envoi d\'un message simple...');
        socket.emit('log-message', '[TEST] Message de test simple');
    }, 1000);

    // Envoyer un message avec une variable (format =)
    setTimeout(() => {
        console.log('Envoi d\'un message avec une variable (format =)...');
        socket.emit('log-message', '[SENSOR] temperature = 25.4');
    }, 2000);

    // Envoyer un message avec une variable (format :)
    setTimeout(() => {
        console.log('Envoi d\'un message avec une variable (format :)...');
        socket.emit('log-message', '[HUMIDITY] humidity: 78');
    }, 3000);

    // Envoyer un message avec plusieurs variables
    setTimeout(() => {
        console.log('Envoi d\'un message avec plusieurs variables...');
        socket.emit('log-message', '[STATS] cpu = 45%, ram = 3.2GB, disk: 120GB');
    }, 4000);

    // Se déconnecter après les tests
    setTimeout(() => {
        console.log('Tests terminés, déconnexion...');
        socket.disconnect();
        process.exit(0);
    }, 6000);
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