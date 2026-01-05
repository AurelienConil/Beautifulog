import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useSocketStore = defineStore('socket', () => {
    // État pour les inputs
    const inputsStatus = ref([])

    // État pour les messages (reste identique)
    const messages = ref([])
    const connectionHistory = ref([])
    const debugMode = ref(true)

    let messageIdCounter = 0

    // État pour contrôler la réception des messages
    const isReceivingMessages = ref(true)
    const IPCActivated = ref(true)
    const timeStampAtStop = ref(0)

    console.log("Valeur initiale de IPCActivated dans le store:", IPCActivated.value)

    // Action pour activer/désactiver la réception des messages depuis le backend
    const toggleIPCReception = (enable) => {
        IPCActivated.value = enable
        if (!enable) {
            maxTimestampValue.value = new Date().getTime()
            timeStampAtStop.value = maxTimestampValue.value
        }
        console.log("maxTimestampValue après toggleIPCReception:", maxTimestampValue.value)
        console.log(`Réception des messages depuis le backend ${enable ? 'activée' : 'désactivée'}`)
    }

    // Nouvelle valeur partagée pour maxTimestampValue
    const maxTimestampValue = ref(0)

    // Getter pour accéder à maxTimestampValue
    const getMaxTimestampValue = computed(() => maxTimestampValue.value)

    // Setter pour mettre à jour maxTimestampValue
    const setMaxTimestampValue = (value) => {
        maxTimestampValue.value = value
        console.log('maxTimestampValue mis à jour:', value)
    }

    // Getters (computed) - adaptés pour la nouvelle architecture
    const isServerRunning = computed(() => {
        return inputsStatus.value.some(input => input.status === 'connected')
    })

    const serverStatus = computed(() => {
        const socketInput = inputsStatus.value.find(input => input.name === 'Socket.IO')
        return {
            isRunning: socketInput?.status === 'connected' || false,
            port: socketInput?.config?.port || 0,
            connectedClients: socketInput?.connectedClients || 0
        }
    })

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

    // Actions - adaptées pour la nouvelle architecture
    const updateInputsStatus = async () => {
        try {
            if (window.electronAPI?.inputs?.getStatus) {
                const status = await window.electronAPI.inputs.getStatus()
                inputsStatus.value = status
                return status
            }
            return []
        } catch (error) {
            console.error('Erreur lors de la récupération du statut des inputs:', error)
            return []
        }
    }

    // Méthode legacy pour compatibilité
    const updateServerStatus = async () => {
        await updateInputsStatus()
        return serverStatus.value
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
            if (window.electronAPI?.inputs?.broadcast) {
                const result = await window.electronAPI.inputs.broadcast(message)
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

    // Initialisation des écouteurs IPC - adaptée pour tous les inputs
    const initializeInputListeners = () => {
        if (window.electronAPI?.inputs) {
            console.log('Initialisation des écouteurs d\'inputs dans le store')

            // Écouter les messages reçus de tous les inputs
            window.electronAPI.inputs.onMessageReceived((data) => {
                if (IPCActivated.value) {
                    addMessage(data)
                    if (data.receivedAt && data.receivedAt > maxTimestampValue.value) {
                        setMaxTimestampValue(data.receivedAt)
                    }
                } else {
                    console.log('Message ignoré car la réception depuis le backend est désactivée:', data)
                }
            })

            // Écouter les changements de statut des inputs
            window.electronAPI.inputs.onStatusChanged((data) => {
                addConnectionEvent({
                    type: 'input-status',
                    inputName: data.name,
                    oldStatus: data.oldStatus,
                    newStatus: data.newStatus,
                    error: data.error,
                    timestamp: new Date().toISOString()
                })

                // Mettre à jour le statut des inputs
                updateInputsStatus()
            })

            // Écouter les changements de clients
            window.electronAPI.inputs.onClientChanged((data) => {
                addConnectionEvent({
                    type: 'client-change',
                    inputName: data.name,
                    oldCount: data.oldCount,
                    newCount: data.newCount,
                    timestamp: new Date().toISOString()
                })

                // Mettre à jour le statut des inputs
                updateInputsStatus()
            })
        } else {
            console.warn('APIs Electron Inputs non disponibles')
        }
    }

    // Méthode legacy pour compatibilité
    const initializeSocketListeners = () => {
        initializeInputListeners()
    }

    const cleanup = () => {
        if (window.electronAPI?.inputs) {
            window.electronAPI.inputs.removeAllListeners('input-message-received')
            window.electronAPI.inputs.removeAllListeners('input-status-changed')
            window.electronAPI.inputs.removeAllListeners('input-client-changed')
            console.log('Écouteurs d\'inputs nettoyés')
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
        inputsStatus,
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
        updateInputsStatus,
        updateServerStatus,
        addMessage,
        addMessages,
        addConnectionEvent,
        clearMessages,
        clearConnectionHistory,
        clearAll,
        broadcastMessage,
        getConnectedClients,
        initializeInputListeners,
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