import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useSocketStore = defineStore('socket', () => {
    // État
    const serverStatus = ref({
        isRunning: false,
        port: 0,
        connectedClients: 0
    })

    const messages = ref([])









    const connectionHistory = ref([])
    const debugMode = ref(true) // Mode debug activé par défaut pour le développement

    let messageIdCounter = 0

    // État pour contrôler la réception des messages
    const isReceivingMessages = ref(true);

    // État pour contrôler l'activation des commandes IPC
    const IPCActivated = ref(true);

    const timeStampAtStop = ref(0);

    console.log("Valeur initiale de IPCActivated dans le store:", IPCActivated.value);

    // Action pour activer/désactiver la réception des messages depuis le backend
    const toggleIPCReception = (enable) => {
        IPCActivated.value = enable;
        if (!enable) {
            maxTimestampValue.value = new Date().getTime();
            timeStampAtStop.value = maxTimestampValue.value;
        }
        console.log("maxTimestampValue après toggleIPCReception:", maxTimestampValue.value);
        console.log(`Réception des messages depuis le backend ${enable ? 'activée' : 'désactivée'}`);
    };

    // Nouvelle valeur partagée pour maxTimestampValue
    const maxTimestampValue = ref(0);

    // Getter pour accéder à maxTimestampValue
    const getMaxTimestampValue = computed(() => maxTimestampValue.value);

    // Setter pour mettre à jour maxTimestampValue
    const setMaxTimestampValue = (value) => {
        maxTimestampValue.value = value;
        console.log('maxTimestampValue mis à jour:', value);
    };

    // Getters (computed)
    const isServerRunning = computed(() => serverStatus.value.isRunning)
    const messageCount = computed(() => messages.value.length)
    const latestMessage = computed(() => messages.value[0] || null)

    const messagesByType = computed(() => {
        const grouped = {}
        messages.value.forEach(message => {
            if (!grouped[message.type]) {
                grouped[message.type] = []
            }
            grouped[message.type].push(message)
        })
        return grouped
    })

    const messagesByLabel = computed(() => {
        const grouped = {}
        messages.value.forEach(message => {
            if (message.label) {
                if (!grouped[message.label]) {
                    grouped[message.label] = []
                }
                grouped[message.label].push(message)
            }
        })
        return grouped
    })

    const uniqueLabels = computed(() => {
        const labels = new Set()
        messages.value.forEach(message => {
            if (message.label) {
                labels.add(message.label)
            }
        })
        return Array.from(labels).sort()
    })

    const errorMessages = computed(() =>
        messages.value.filter(msg => msg.type === 'error-message')
    )

    const logMessages = computed(() =>
        messages.value.filter(msg => msg.type === 'log-message')
    )

    const recentMessages = computed(() =>
        messages.value.slice(0, 50)
    )

    // Actions
    const updateServerStatus = async () => {
        try {
            if (window.electronAPI?.socket?.getStatus) {
                const status = await window.electronAPI.socket.getStatus()
                serverStatus.value = status
                return status
            }
            return null
        } catch (error) {
            console.error('Erreur lors de la récupération du statut du serveur:', error)
            return null
        }
    }

    const addMessages = (messageArray) => {
        messageArray.forEach(messageData => {
            addMessage(messageData)
        })
    }

    const addMessage = (messageData) => {
        const message = {
            id: ++messageIdCounter,
            timestamp: messageData.timestamp || new Date().toISOString(),
            ...messageData
        }

        //console.log('Ajout d\'un message au store:', message)

        // Ajouter en début de liste (messages les plus récents en premier)
        messages.value.push(message)

        // Limiter le nombre de messages stockés (par exemple 1000)
        if (messages.value.length > 1000) {
            messages.value = messages.value.slice(0, 1000)
        }

        return message
    }

    const addConnectionEvent = (eventData) => {
        const event = {
            id: Date.now(),
            timestamp: eventData.timestamp || new Date().toISOString(),
            type: eventData.type || 'connection',
            ...eventData
        }

        console.log('Ajout d\'un événement de connexion au store:', event)

        connectionHistory.value.unshift(event)

        // Limiter l'historique des connexions
        if (connectionHistory.value.length > 100) {
            connectionHistory.value = connectionHistory.value.slice(0, 100)
        }

        // Mettre à jour le statut du serveur après un événement de connexion
        updateServerStatus()

        return event
    }

    const clearMessages = () => {
        messages.value = []
        console.log('Messages effacés du store')
    }

    const clearConnectionHistory = () => {
        connectionHistory.value = []
        console.log('Historique des connexions effacé du store')
    }

    const clearAll = () => {
        clearMessages()
        clearConnectionHistory()
        console.log('Toutes les données du store effacées')
    }

    const broadcastMessage = async (message) => {
        try {
            if (window.electronAPI?.socket?.broadcast) {
                const result = await window.electronAPI.socket.broadcast(message)
                console.log('Message diffusé:', result)
                return result
            }
            return { success: false, message: 'API Electron non disponible' }
        } catch (error) {
            console.error('Erreur lors de la diffusion:', error)
            return { success: false, message: error.message }
        }
    }

    const getConnectedClients = async () => {
        try {
            if (window.electronAPI?.socket?.getClients) {
                const clients = await window.electronAPI.socket.getClients()
                return clients
            }
            return []
        } catch (error) {
            console.error('Erreur lors de la récupération des clients:', error)
            return []
        }
    }

    // Initialisation des écouteurs IPC
    const initializeSocketListeners = () => {
        if (window.electronAPI?.socket) {
            console.log('Initialisation des écouteurs Socket.IO dans le store')

            // Écouter les messages reçus via Socket.IO
            window.electronAPI.socket.onMessageReceived((data) => {
                if (IPCActivated.value) {
                    addMessage(data);
                    if (data.timestamp && data.timestamp > maxTimestampValue.value) {
                        setMaxTimestampValue(data.timestamp);
                    }
                } else {
                    console.log('Message ignoré car la réception depuis le backend est désactivée:', data);
                }
            });

            // Écouter les déconnexions de clients
            window.electronAPI.socket.onClientDisconnected((data) => {
                addConnectionEvent({
                    type: 'disconnect',
                    socketId: data.socketId,
                    timestamp: data.timestamp
                });
            });
        } else {
            console.warn('APIs Electron Socket.IO non disponibles')
        }
    }

    const cleanup = () => {
        if (window.electronAPI?.socket) {
            window.electronAPI.socket.removeAllListeners('socket-message-received')
            window.electronAPI.socket.removeAllListeners('socket-client-disconnected')
            console.log('Écouteurs Socket.IO nettoyés')
        }
    }

    // Action pour basculer le mode debug
    const toggleDebugMode = () => {
        debugMode.value = !debugMode.value
        console.log('Mode debug:', debugMode.value ? 'activé' : 'désactivé')
    }

    // Action pour ajouter un message de debug
    const addDebugMessage = async (content) => {

        // Transfert du message au backend via IPC
        if (window.electronAPI?.socket?.sendMessageToBackend) {
            try {
                const result = await window.electronAPI.socket.sendMessageToBackend(content);

                console.log('Message envoyé au backend via IPC:', result);

                // Ajouter les messages formatés retournés par le backend au store
                if (Array.isArray(result)) {
                    result.forEach((formattedMessage) => addMessage(formattedMessage));
                }

                return result;
            } catch (error) {
                console.error('Erreur lors de l\'envoi du message au backend via IPC:', error);
            }
        } else {
            console.warn('API Electron pour envoyer des messages au backend non disponible');
        }

    }

    // Statistiques
    const getStatistics = computed(() => ({
        totalMessages: messages.value.length,
        errorCount: errorMessages.value.length,
        logCount: logMessages.value.length,
        connectedClients: serverStatus.value.connectedClients,
        isServerRunning: serverStatus.value.isRunning,
        serverPort: serverStatus.value.port,
        lastMessageTime: latestMessage.value?.timestamp || null
    }))


    return {
        // État
        serverStatus,
        messages,
        connectionHistory,
        debugMode,
        isReceivingMessages,
        IPCActivated,
        maxTimestampValue,
        timeStampAtStop,

        // Getters
        isServerRunning,
        messageCount,
        latestMessage,
        messagesByType,
        messagesByLabel,
        uniqueLabels,
        errorMessages,
        logMessages,
        recentMessages,
        getStatistics,
        getMaxTimestampValue,

        // Actions
        updateServerStatus,
        addMessage,
        addConnectionEvent,
        clearMessages,
        clearConnectionHistory,
        clearAll,
        broadcastMessage,
        getConnectedClients,
        initializeSocketListeners,
        cleanup,
        toggleDebugMode,
        addDebugMessage,
        toggleIPCReception,
        setMaxTimestampValue
    }
})





/*

    //add some debug message for testing
    messages.value.push({
        id: 1,
        timestamp: new Date().toISOString(),
        label: 'Process A',
        msg: 'This is a debug log message from Process A.',
        format: 'variable',
        variables:
        {
            toto: "4ms",

        }

    })

    messages.value.push({
        id: 1,
        timestamp: new Date().toISOString(),
        label: 'Process A',
        msg: 'This is a debug log message from Process A.',
        format: 'json',
        jsonData: {
            temperature: "22 °C",
            humidity: "45 %",
            pressure: "1013 hPa",
            happinessIndex: 87
        }

    })

    messages.value.push({
        id: 1,
        timestamp: new Date().toISOString(),
        type: 'log-message',
        label: 'Process A',
        msg: 'This is a debug log message from Process A.',
        format: 'string',

    })

    messages.value.push({
        id: 1,
        timestamp: new Date().toISOString(),
        type: 'error-message',
        label: 'Process A',
        msg: 'This is a debug log message from Process A.',
        format: 'string',

    })

    messages.value.push({
        id: 1,
        timestamp: new Date().toISOString(),
        type: 'warning-message',
        label: 'Process A',
        msg: 'This is a debug log message from Process A.',
        format: 'string',
    })

    messages.value.push({
        id: 1,
        timestamp: new Date().toISOString(),
        type: 'info-message',
        label: 'Process B',
        msg: 'This is a debug log message from Process A.',
        format: 'string',

    })

    messages.value.push({
        id: 1,
        timestamp: new Date().toISOString(),
        type: 'info-message',
        label: 'Process A',
        msg: 'This is a debug log message from Process A.',
        format: 'variable',
        variables:
        {
            toto: "10 ms",

        }

    })

    */