#!/usr/bin/env node

/**
 * Script de test pour le serveur Socket.IO
 * Usage: node test-socket-client.js
 */

const io = require('socket.io-client');

const SOCKET_URL = 'http://localhost:3001';

console.log('🔌 Connexion au serveur Socket.IO...');
console.log(`URL: ${SOCKET_URL}`);

const socket = io(SOCKET_URL);

// Connexion établie
socket.on('connect', () => {
    console.log('✅ Connecté au serveur Socket.IO');
    console.log(`ID du client: ${socket.id}`);

    // Envoyer des messages de test
    setTimeout(() => {
        console.log('📤 Envoi d\'un message de log...');
        socket.emit('log-message', "[process1] Ceci est un message de log de test avec le label process1");
    }, 1000);

    setTimeout(() => {
        console.log('📤 Envoi d\'un message d\'erreur...');
        socket.emit('log-message', " [toto] error : Une erreur de test s'est produite dans le processus toto");
    }, 2000);

    setTimeout(() => {
        console.log('📤 Envoi d\'un autre message de log...');
        socket.emit('log-message', "[BIBI:WARNING] Ceci est un autre message de log de test avec le label process1");
    }, 3000);


    // Déconnexion après 5 secondes
    setTimeout(() => {
        console.log('👋 Déconnexion du serveur...');
        socket.disconnect();
    }, 5000);
});

// Écouter les messages du serveur
socket.on('broadcast-message', (data) => {
    console.log('📥 Message reçu du serveur:', data);
});

// Gestion des erreurs
socket.on('connect_error', (error) => {
    console.error('❌ Erreur de connexion:', error.message);
    process.exit(1);
});

// Déconnexion
socket.on('disconnect', (reason) => {
    console.log('🔌 Déconnecté du serveur:', reason);
    process.exit(0);
});

// Gestion des signaux pour fermer proprement
process.on('SIGINT', () => {
    console.log('\n👋 Fermeture du client...');
    socket.disconnect();
    process.exit(0);
});

process.on('SIGTERM', () => {
    socket.disconnect();
    process.exit(0);
});