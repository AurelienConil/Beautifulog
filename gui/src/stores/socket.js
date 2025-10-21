import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { formatMessage } from '../utils/formatMessage.js'

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

    const addMessage = (messageData) => {
        const message = {
            id: ++messageIdCounter,
            timestamp: messageData.timestamp || new Date().toISOString(),
            ...messageData
        }

        console.log('Ajout d\'un message au store:', message)

        // Ajouter en début de liste (messages les plus récents en premier)
        messages.value.unshift(message)

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
                console.log('Message reçu depuis IPC dans le store:', data)
                addMessage(data)
            })

            // Écouter les déconnexions de clients
            window.electronAPI.socket.onClientDisconnected((data) => {
                console.log('Client déconnecté depuis IPC dans le store:', data)
                addConnectionEvent({
                    type: 'disconnect',
                    socketId: data.socketId,
                    timestamp: data.timestamp
                })
            })
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
    const addDebugMessage = (content) => {
        try {
            // Utiliser formatMessage pour formatter le message de debug comme côté Node.js
            const formattedMessage = formatMessage(content)

            // Ajouter des métadonnées pour indiquer que c'est un message de debug
            formattedMessage.source = 'manual-debug'
            formattedMessage.content = formattedMessage.msg // Garder le contenu original

            return addMessage(formattedMessage)
        } catch (error) {
            console.error('Erreur lors du formatage du message de debug:', error)

            // Fallback en cas d'erreur de formatage
            const fallbackMessage = {
                type: 'debug-message',
                label: 'DEBUG',
                content: content,
                msg: content,
                source: 'manual-debug',
                timestamp: new Date().toISOString()
            }
            return addMessage(fallbackMessage)
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
        addDebugMessage
    }
})