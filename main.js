// Backend: serveur HTTP + Socket.IO pour recevoir et broadcast les messages
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

const PORT_HTTP = process.env.PORT || 5000;
const PORT_SOCKET = process.env.SOCKET_PORT || 3001;

// Servir les fichiers statiques (dist/ compilé par Vite)
app.use(express.static(path.join(__dirname, 'gui/dist')));

// Route fallback pour SPA (Single Page App)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'gui/dist/index.html'));
});

// Gestion des connexions Socket.IO
io.on('connection', (socket) => {
    console.log(`Nouvelle connexion: ${socket.id}`);

    // Recevoir les messages des clients et les broadcast à TOUS les clients
    socket.on('log-message', (data) => {
        console.log(`Message reçu de ${socket.id}:`, data.message);

        // Broadcast à tous les clients connectés (y compris le frontend)
        io.emit('log-message', {
            ...data,
            socketId: socket.id,
            receivedAt: Date.now()
        });
    });

    socket.on('disconnect', () => {
        console.log(`Déconnexion: ${socket.id}`);
    });
});

// Démarrer le serveur HTTP
server.listen(PORT_HTTP, () => {
    console.log(`🌐 Serveur HTTP sur http://localhost:${PORT_HTTP}`);
});

// Note: Socket.IO est intégré dans le même serveur
// Les clients se connectent à ws://localhost:5000
console.log(`🔌 Socket.IO actif sur le même port (ws://localhost:${PORT_HTTP})`);

// Gestion propre de l'arrêt
process.on('SIGINT', () => {
    console.log('Arrêt du serveur...');
    server.close(() => {
        console.log('Serveur arrêté');
        process.exit(0);
    });
});
