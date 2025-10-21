const { io } = require('socket.io-client');

// Configuration du client
const socket = io('http://localhost:3001');

console.log('Connexion au serveur Socket.IO pour tester la mise à jour des variables...');

// Attendre la connexion
socket.on('connect', () => {
    console.log('Connecté au serveur Socket.IO avec ID:', socket.id);

    // Envoyer un message avec une variable "temperature"
    setTimeout(() => {
        console.log('Envoi de temperature = 25.4°C...');
        socket.emit('log-message', '[SENSOR] temperature = 25.4°C');
    }, 1000);

    // Attendre 3 secondes, puis envoyer une mise à jour de la même variable
    setTimeout(() => {
        console.log('Envoi de temperature = 26.1°C (mise à jour)...');
        socket.emit('log-message', '[SENSOR] temperature = 26.1°C');
    }, 4000);

    // Attendre 3 secondes, puis envoyer une autre mise à jour
    setTimeout(() => {
        console.log('Envoi de temperature = 26.8°C (mise à jour)...');
        socket.emit('log-message', '[SENSOR] temperature = 26.8°C');
    }, 7000);

    // Envoyer une autre variable en parallèle
    setTimeout(() => {
        console.log('Envoi de humidity = 65%...');
        socket.emit('log-message', '[SENSOR] humidity = 65%');
    }, 2000);

    // Mettre à jour cette autre variable
    setTimeout(() => {
        console.log('Envoi de humidity = 68% (mise à jour)...');
        socket.emit('log-message', '[SENSOR] humidity = 68%');
    }, 6000);

    // Se déconnecter après les tests
    setTimeout(() => {
        console.log('Tests de mise à jour terminés, déconnexion...');
        socket.disconnect();
        process.exit(0);
    }, 10000);
});

// Gestion des erreurs
socket.on('connect_error', (error) => {
    console.error('Erreur de connexion:', error);
    process.exit(1);
});