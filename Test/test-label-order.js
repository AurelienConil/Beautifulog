const { io } = require('socket.io-client');

// Configuration du client
const socket = io('http://localhost:3001');

console.log('Connexion au serveur Socket.IO...');

// Attendre la connexion
socket.on('connect', () => {
    console.log('Connecté au serveur Socket.IO avec ID:', socket.id);

    // Envoyer un message avec label "process1"
    setTimeout(() => {
        console.log('Envoi message avec label process1...');
        socket.emit('log-message', '[process1] Premier message du processus 1');
    }, 1000);

    // Envoyer un autre message avec label "process1"
    setTimeout(() => {
        console.log('Envoi autre message avec label process1...');
        socket.emit('log-message', '[process1] Deuxième message du processus 1');
    }, 2000);

    // Envoyer un message avec un nouveau label "process2"
    setTimeout(() => {
        console.log('Envoi message avec nouveau label process2...');
        socket.emit('log-message', '[process2] Premier message du processus 2');
    }, 3000);

    // Envoyer un message avec un troisième label "process3"
    setTimeout(() => {
        console.log('Envoi message avec nouveau label process3...');
        socket.emit('log-message', '[process3] Premier message du processus 3');
    }, 4000);

    // Renvoyer un message au premier processus
    setTimeout(() => {
        console.log('Renvoi message à process1...');
        socket.emit('log-message', '[process1] Troisième message du processus 1');
    }, 5000);

    // Variables pour tester l'update des variables épinglées
    setTimeout(() => {
        console.log('Envoi variable temperature=25.4 dans process3...');
        socket.emit('log-message', '[process3] temperature = 25.4');
    }, 6000);

    setTimeout(() => {
        console.log('Envoi mise à jour temperature=27.8 dans process3...');
        socket.emit('log-message', '[process3] temperature = 27.8');
    }, 7000);

    setTimeout(() => {
        console.log('Envoi autre mise à jour temperature=30.1 dans process3...');
        socket.emit('log-message', '[process3] temperature = 30.1');
    }, 8000);

    // Se déconnecter après les tests
    setTimeout(() => {
        console.log('Tests terminés, déconnexion...');
        socket.disconnect();
        process.exit(0);
    }, 9000);
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