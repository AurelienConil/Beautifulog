import { defineStore } from 'pinia'
import { ref, computed, shallowRef, triggerRef } from 'vue'

export const useSocketStore = defineStore('socket', () => {
    // État pour les inputs
    const inputsStatus = ref([])

    // État pour les messages (NOUVEAU SYSTÈME PAR LABEL)
    const messagesByLabel = shallowRef(new Map())
    const maxMessagesPerLabel = 100 // Limite stricte par label
    let messageIdCounter = 0

    // NOUVEAU : Gestion des variables pinnées
    const pinnedVariablesByLabel = shallowRef(new Map()) // Map<label, Set<varName>>
    const pinnedVariableValues = shallowRef(new Map()) // Map<label_varName, {value, timestamp, history, updates, mode}>

    // État pour les connexions
    const connectionHistory = ref([])
    const debugMode = ref(false)

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

    // NOUVEAU : Getters optimisés pour labels spécifiques
    const getMessagesForLabel = (label) => {
        return messagesByLabel.value.get(label) || []
    }

    // NOUVEAU : Créer un computed réactif pour un label spécifique
    const createLabelComputed = (label) => {
        return computed(() => {
            // Réactivité ciblée - ne se déclenche que pour ce label
            messagesByLabel.value // Déclenche la réactivité
            return getMessagesForLabel(label)
        })
    }

    // NOUVEAU : Obtenir tous les labels existants
    const getAvailableLabels = computed(() => {
        return Array.from(messagesByLabel.value.keys()).sort()
    })

    // NOUVEAU : Obtenir le nombre total de messages (tous labels)
    const getTotalMessageCount = computed(() => {
        let total = 0
        messagesByLabel.value.forEach(messages => {
            total += messages.length
        })
        return total
    })

    // Getters simplifiés (pour compatibilité)
    const messageCount = computed(() => getTotalMessageCount.value)

    const latestMessage = computed(() => {
        let latest = null
        let latestTime = 0

        messagesByLabel.value.forEach(messages => {
            if (messages.length > 0) {
                const lastMsg = messages[messages.length - 1]
                const msgTime = new Date(lastMsg.timestamp).getTime()
                if (msgTime > latestTime) {
                    latestTime = msgTime
                    latest = lastMsg
                }
            }
        })

        return latest
    })

    const recentMessages = computed(() => {
        // Récupérer les 50 messages les plus récents de tous les labels
        const allMessages = []
        messagesByLabel.value.forEach(messages => {
            allMessages.push(...messages)
        })

        return allMessages
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 50)
    })

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

    // Traitement atomique des batches avec tri par label (ULTRA-OPTIMISÉ)
    const addMessageBatch = (batch) => {
        if (!IPCActivated.value) {
            console.log('Batch ignoré car la réception est désactivée');
            return;
        }

        console.log(`📦 Traitement atomique de ${batch.batchSize} messages par label`);

        // 1. Grouper les messages par label AVANT traitement
        const messagesByLabelGroup = new Map()

        batch.messages.forEach(messageData => {
            const label = messageData.label || 'Unknown'
            if (!messagesByLabelGroup.has(label)) {
                messagesByLabelGroup.set(label, [])
            }
            messagesByLabelGroup.get(label).push(messageData)
        })

        // 2. Traiter chaque label séparément
        const currentMap = messagesByLabel.value
        let totalProcessed = 0

        messagesByLabelGroup.forEach((messages, label) => {
            let labelMessages = currentMap.get(label) || []
            const pinnedVars = pinnedVariablesByLabel.value.get(label)

            // Traiter tous les messages de ce label d'un coup
            const processedMessages = []

            messages.forEach(messageData => {
                const processedMessage = {
                    id: ++messageIdCounter,
                    timestamp: messageData.timestamp || new Date().toISOString(),
                    batchedAt: messageData.batchedAt,
                    isThrottled: batch.isThrottling,
                    processingTime: batch.processingTime,
                    ...messageData
                }

                // Trier les messages variables selon pinnage
                if (messageData.format === 'variable' && messageData.variables && pinnedVars) {
                    let hasUnpinnedVars = false

                    Object.entries(messageData.variables).forEach(([varName, value]) => {
                        if (pinnedVars.has(varName)) {
                            // Variable pinnée → mettre à jour directement
                            updatePinnedVariableValue(label, varName, value, processedMessage.timestamp)
                        } else {
                            hasUnpinnedVars = true
                        }
                    })

                    // Ajouter le message seulement s'il contient des variables non pinnées
                    if (hasUnpinnedVars) {
                        processedMessages.push(processedMessage)
                    }
                } else {
                    // Message normal → toujours ajouter
                    processedMessages.push(processedMessage)
                }
            })

            // Ajout en bloc des messages non pinnés
            labelMessages = [...labelMessages, ...processedMessages]

            // Limitation stricte par label
            if (labelMessages.length > maxMessagesPerLabel) {
                labelMessages = labelMessages.slice(-maxMessagesPerLabel)
            }

            currentMap.set(label, labelMessages)
            totalProcessed += processedMessages.length
        })

        // 3. UN SEUL triggerRef pour tous les labels modifiés
        triggerRef(messagesByLabel)

        // 4. Mise à jour du timestamp maximum
        const latestTimestamp = Math.max(
            ...batch.messages
                .map(msg => msg.receivedAt)
                .filter(t => t && !isNaN(t)),
            maxTimestampValue.value
        );

        if (latestTimestamp > maxTimestampValue.value) {
            setMaxTimestampValue(latestTimestamp);
        }

        console.log(`✅ Batch traité: ${messagesByLabelGroup.size} labels, ${totalProcessed} messages`);

        // 5. Mettre à jour les métriques
        updateBatchMetrics(batch);
    };

    // NOUVEAU : Ajouter un message à un label spécifique (réactivité ciblée)
    const addMessageToLabel = (messageData) => {
        const label = messageData.label || 'Unknown'
        const currentMap = messagesByLabel.value

        // Récupérer ou créer l'array pour ce label
        let labelMessages = currentMap.get(label) || []

        // Créer le nouveau message
        const newMessage = {
            id: ++messageIdCounter,
            timestamp: messageData.timestamp || new Date().toISOString(),
            ...messageData
        }

        // Modification directe (non-réactive)
        labelMessages = [...labelMessages, newMessage]

        // Limiter par label (pas global)
        if (labelMessages.length > maxMessagesPerLabel) {
            labelMessages = labelMessages.slice(-maxMessagesPerLabel)
        }

        // Mettre à jour la Map
        currentMap.set(label, labelMessages)

        // Déclencher la réactivité UNE FOIS
        triggerRef(messagesByLabel)

        return newMessage
    }

    // Métriques de performance des batches (NOUVEAU)
    const batchMetrics = ref({
        batchesProcessed: 0,
        messagesProcessed: 0,
        lastBatchSize: 0,
        averageBatchSize: 0,
        throttleEvents: 0,
        lastProcessingTime: 0
    });

    const updateBatchMetrics = (batch) => {
        batchMetrics.value.batchesProcessed++;
        batchMetrics.value.messagesProcessed += batch.batchSize;
        batchMetrics.value.lastBatchSize = batch.batchSize;
        batchMetrics.value.averageBatchSize = Math.round(
            batchMetrics.value.messagesProcessed / batchMetrics.value.batchesProcessed
        );
        batchMetrics.value.lastProcessingTime = batch.processingTime || 0;
        if (batch.isThrottling) {
            batchMetrics.value.throttleEvents++;
        }
    };

    const addMessages = (messageArray) => {
        messageArray.forEach(messageData => {
            addMessageToLabel(messageData)
        })
    }

    const clearMessages = () => {
        // Préserver les labels et vider seulement le contenu des messages
        const currentMap = messagesByLabel.value
        currentMap.forEach((messages, label) => {
            currentMap.set(label, []) // Vider les messages pour ce label mais garder le label
        })
        triggerRef(messagesByLabel)
        console.log('Contenu des messages effacé (labels et variables pinnées préservés)')
    }

    const clearMessagesForLabel = (label) => {
        const currentMap = messagesByLabel.value
        currentMap.delete(label)
        triggerRef(messagesByLabel)
        console.log(`Messages pour le label "${label}" effacés`)
    }

    // NOUVEAU : Gestion des variables pinnées
    const pinVariable = (label, varName, value, timestamp) => {
        // Ajouter à la liste des variables pinnées pour ce label
        let pinnedVars = pinnedVariablesByLabel.value.get(label)
        if (!pinnedVars) {
            pinnedVars = new Set()
            pinnedVariablesByLabel.value.set(label, pinnedVars)
        }
        pinnedVars.add(varName)

        // Initialiser la valeur avec historique
        const key = `${label}_${varName}`
        pinnedVariableValues.value.set(key, {
            value,
            timestamp,
            history: [],
            updates: 0,
            mode: 'normal'
        })

        triggerRef(pinnedVariablesByLabel)
        triggerRef(pinnedVariableValues)

        console.log(`Variable "${varName}" pinnée pour le label "${label}"`)
    }

    const unpinVariable = (label, varName) => {
        // Retirer de la liste des variables pinnées
        const pinnedVars = pinnedVariablesByLabel.value.get(label)
        if (pinnedVars) {
            pinnedVars.delete(varName)
            if (pinnedVars.size === 0) {
                pinnedVariablesByLabel.value.delete(label)
            }
        }

        // Supprimer la valeur
        const key = `${label}_${varName}`
        pinnedVariableValues.value.delete(key)

        triggerRef(pinnedVariablesByLabel)
        triggerRef(pinnedVariableValues)

        console.log(`Variable "${varName}" dépinnée pour le label "${label}"`)
    }

    const updatePinnedVariableValue = (label, varName, value, timestamp) => {
        const key = `${label}_${varName}`
        const currentVar = pinnedVariableValues.value.get(key)

        if (!currentVar) return

        const hasChanged = String(currentVar.value) !== String(value)
        const newHistory = [...(currentVar.history || [])]

        if (hasChanged) {
            newHistory.push(currentVar.value)
            if (newHistory.length > 100) {
                newHistory.splice(0, newHistory.length - 100)
            }
        }

        pinnedVariableValues.value.set(key, {
            ...currentVar,
            value,
            timestamp,
            history: newHistory,
            updates: hasChanged ? (currentVar.updates || 0) + 1 : currentVar.updates || 0
        })

        triggerRef(pinnedVariableValues)
    }

    const setPinnedVariableMode = (label, varName, mode) => {
        const key = `${label}_${varName}`
        const currentVar = pinnedVariableValues.value.get(key)

        if (currentVar) {
            pinnedVariableValues.value.set(key, {
                ...currentVar,
                mode
            })
            triggerRef(pinnedVariableValues)
        }
    }

    const getPinnedVariablesForLabel = (label) => {
        const result = {}
        const pinnedVars = pinnedVariablesByLabel.value.get(label)

        if (pinnedVars) {
            pinnedVars.forEach(varName => {
                const key = `${label}_${varName}`
                const varData = pinnedVariableValues.value.get(key)
                if (varData) {
                    result[varName] = varData
                }
            })
        }

        return result
    }

    const createPinnedVariablesComputed = (label) => {
        return computed(() => {
            // Forçer la réactivité sur les changements
            pinnedVariableValues.value
            return getPinnedVariablesForLabel(label)
        })
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

    const clearConnectionHistory = () => {
        connectionHistory.value = []
        console.log('Historique des connexions effacé du store')
    }

    const clearAll = () => {
        clearMessages() // Maintenant préserve les labels et variables pinnées
        clearConnectionHistory()
        console.log('Messages effacés, labels et variables pinnées préservés')
    }

    const clearAllCompletely = () => {
        messagesByLabel.value.clear()
        pinnedVariablesByLabel.value.clear()
        pinnedVariableValues.value.clear()
        clearConnectionHistory()
        triggerRef(messagesByLabel)
        triggerRef(pinnedVariablesByLabel)
        triggerRef(pinnedVariableValues)
        console.log('Toutes les données du store complètement effacées')
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

            // Écouter les BATCHES de messages (PRIORITÉ)
            if (window.electronAPI.inputs.onMessageBatch) {
                console.log('✅ Initialisation de l\'écouteur de batches')
                window.electronAPI.inputs.onMessageBatch((batch) => {
                    addMessageBatch(batch);
                });
            }

            // Écouter les messages individuels (LEGACY - pour compatibilité)
            window.electronAPI.inputs.onMessageReceived((data) => {
                if (IPCActivated.value) {
                    addMessageToLabel(data) // Utiliser la nouvelle méthode
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
                    result.forEach((formattedMessage) => addMessageToLabel(formattedMessage));
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
        totalMessages: getTotalMessageCount.value,
        errorCount: 0, // TODO: implement error counting with new architecture
        logCount: getTotalMessageCount.value,
        connectedClients: serverStatus.value.connectedClients,
        isServerRunning: serverStatus.value.isRunning,
        serverPort: serverStatus.value.port,
        lastMessageTime: latestMessage.value?.timestamp || null
    }))


    return {
        // État
        inputsStatus,
        serverStatus,
        connectionHistory,
        debugMode,
        isReceivingMessages,
        IPCActivated,
        maxTimestampValue,
        timeStampAtStop,

        // Architecture par labels
        messagesByLabel,
        createLabelComputed,
        getMessagesForLabel,
        getAvailableLabels,
        clearMessagesForLabel,

        // Getters
        isServerRunning,
        messageCount,
        getTotalMessageCount,
        latestMessage,
        recentMessages,
        getStatistics,
        getMaxTimestampValue,

        // Actions
        updateInputsStatus,
        updateServerStatus,
        addMessages,
        addMessageBatch,
        addConnectionEvent,
        clearMessages,
        clearConnectionHistory,
        clearAll,
        clearAllCompletely,
        broadcastMessage,
        getConnectedClients,

        // Métriques des batches (NOUVEAU)
        batchMetrics,
        initializeInputListeners,
        initializeSocketListeners,
        cleanup,
        toggleDebugMode,
        addDebugMessage,
        toggleIPCReception,
        setMaxTimestampValue,

        // Gestion des variables pinnées (NOUVEAU)
        pinnedVariablesByLabel,
        pinnedVariableValues,
        pinVariable,
        unpinVariable,
        setPinnedVariableMode,
        getPinnedVariablesForLabel,
        createPinnedVariablesComputed
    }
})