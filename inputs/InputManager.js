const SocketInput = require('./SocketInput');
const SerialInput = require('./SerialInput');

/**
 * Gestionnaire centralisé pour tous les types d'entrées de logs
 */
class InputManager {
    constructor() {
        this.inputs = new Map();
        this.callbacks = {
            onMessage: null,
            onStatusChange: null,
            onClientChange: null
        };
    }

    /**
     * Initialise et démarre tous les inputs disponibles
     * @param {Object} config - Configuration des inputs
     * @returns {Promise<void>}
     */
    async initializeInputs(config = {}) {
        const inputConfigs = [
            {
                class: SocketInput,
                config: config.socket || {}
            },
            {
                class: SerialInput,
                config: config.serial || {}
            }
        ];

        console.log('Initialisation des inputs...');

        for (const inputConfig of inputConfigs) {
            try {
                const input = new inputConfig.class(inputConfig.config);

                // Configurer les callbacks
                this._setupInputCallbacks(input);

                // Vérifier la disponibilité
                const isAvailable = await input.isAvailable();
                console.log(`${input.name}: ${isAvailable ? 'disponible' : 'non disponible'}`);

                if (isAvailable) {
                    // Tenter de démarrer l'input
                    try {
                        await input.start();
                        this.inputs.set(input.name, input);
                        console.log(`✅ ${input.name} démarré avec succès`);
                    } catch (error) {
                        console.warn(`⚠️  Impossible de démarrer ${input.name}:`, error.message);
                        // Garder l'input même s'il n'a pas pu démarrer (pour retry plus tard)
                        this.inputs.set(input.name, input);
                    }
                } else {
                    // Garder l'input pour l'affichage dans l'interface
                    this.inputs.set(input.name, input);
                }

            } catch (error) {
                console.error(`Erreur lors de l'initialisation de ${inputConfig.class.name}:`, error);
            }
        }

        console.log(`Inputs initialisés: ${this.inputs.size}`);
    }

    /**
     * Arrête tous les inputs
     * @returns {Promise<void>}
     */
    async stopAllInputs() {
        console.log('Arrêt de tous les inputs...');

        const stopPromises = Array.from(this.inputs.values()).map(async (input) => {
            try {
                if (input.status === 'connected') {
                    await input.stop();
                    console.log(`✅ ${input.name} arrêté`);
                }
            } catch (error) {
                console.error(`Erreur lors de l'arrêt de ${input.name}:`, error);
            }
        });

        await Promise.all(stopPromises);
        this.inputs.clear();
    }

    /**
     * Retourne le statut de tous les inputs
     * @returns {Array}
     */
    getAllInputsStatus() {
        return Array.from(this.inputs.values()).map(input => input.getStatus());
    }

    /**
     * Retourne un input spécifique par nom
     * @param {string} name - Nom de l'input
     * @returns {LogInput|null}
     */
    getInput(name) {
        return this.inputs.get(name) || null;
    }

    /**
     * Diffuse un message à tous les inputs connectés
     * @param {string} message - Message à diffuser
     * @returns {Promise<Object>}
     */
    async broadcastToAll(message) {
        const results = {};

        for (const [name, input] of this.inputs) {
            try {
                if (input.status === 'connected') {
                    const success = await input.broadcast(message);
                    results[name] = { success, error: null };
                } else {
                    results[name] = { success: false, error: 'Non connecté' };
                }
            } catch (error) {
                results[name] = { success: false, error: error.message };
            }
        }

        return results;
    }

    /**
     * Tente de redémarrer un input spécifique
     * @param {string} name - Nom de l'input à redémarrer
     * @returns {Promise<boolean>}
     */
    async restartInput(name) {
        const input = this.inputs.get(name);
        if (!input) {
            return false;
        }

        try {
            await input.stop();
            await input.start();
            return true;
        } catch (error) {
            console.error(`Erreur lors du redémarrage de ${name}:`, error);
            return false;
        }
    }

    /**
     * Configure les callbacks pour un input
     * @private
     * @param {LogInput} input - L'input à configurer
     */
    _setupInputCallbacks(input) {
        input.onMessage((data) => {
            if (this.callbacks.onMessage) {
                this.callbacks.onMessage(data);
            }
        });

        input.onStatusChange((data) => {
            if (this.callbacks.onStatusChange) {
                this.callbacks.onStatusChange(data);
            }
        });

        input.onClientChange((data) => {
            if (this.callbacks.onClientChange) {
                this.callbacks.onClientChange(data);
            }
        });
    }

    /**
     * Définit le callback pour les messages reçus
     * @param {Function} callback - Fonction appelée lors de la réception d'un message
     */
    onMessage(callback) {
        this.callbacks.onMessage = callback;
    }

    /**
     * Définit le callback pour les changements de statut
     * @param {Function} callback - Fonction appelée lors d'un changement de statut
     */
    onStatusChange(callback) {
        this.callbacks.onStatusChange = callback;
    }

    /**
     * Définit le callback pour les changements de clients
     * @param {Function} callback - Fonction appelée lors d'un changement du nombre de clients
     */
    onClientChange(callback) {
        this.callbacks.onClientChange = callback;
    }
}

module.exports = InputManager;