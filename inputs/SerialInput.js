const LogInput = require('./LogInput');

/**
 * Implémentation Serial de LogInput
 * Reçoit les logs via connexion série (Arduino, etc.)
 */
class SerialInput extends LogInput {
    constructor(config = {}) {
        super('Serial', {
            baudRate: config.baudRate || 9600,
            port: config.port || 'auto', // 'auto' pour détection automatique
            dataBits: config.dataBits || 8,
            stopBits: config.stopBits || 1,
            parity: config.parity || 'none',
            autoReconnect: config.autoReconnect !== false,
            reconnectInterval: config.reconnectInterval || 5000,
            ...config
        });

        this.SerialPort = null;
        this.serialConnection = null;
        this.availablePorts = [];
        this.reconnectTimer = null;
        this.buffer = '';
    }

    /**
     * Vérifie si les communications série sont disponibles
     * @returns {Promise<boolean>}
     */
    async isAvailable() {
        try {
            // Importer SerialPort uniquement si disponible
            this.SerialPort = require('serialport').SerialPort;

            // Lister les ports disponibles
            await this._listAvailablePorts();

            return this.availablePorts.length > 0;
        } catch (error) {
            console.log('SerialPort non disponible:', error.message);
            return false;
        }
    }

    /**
     * Démarre la connexion série
     * @returns {Promise<void>}
     */
    async start() {
        try {
            this._updateStatus('connecting');

            // Vérifier si SerialPort est disponible
            if (!await this.isAvailable()) {
                throw new Error('Aucun port série disponible ou module serialport manquant');
            }

            // Déterminer le port à utiliser
            const portPath = await this._getPortToUse();
            if (!portPath) {
                throw new Error('Aucun port série compatible trouvé');
            }

            // Créer la connexion série
            await this._connectToPort(portPath);

            console.log(`Connexion série (${this.name}) établie sur ${portPath}`);
            this._updateStatus('connected');
            this._updateClientCount(1); // Une connexion série = un client

        } catch (error) {
            console.error(`Erreur lors de l'ouverture du port série:`, error);
            this._updateStatus('error', error.message);

            // Planifier une reconnexion si activée
            if (this.config.autoReconnect) {
                this._scheduleReconnect();
            }

            throw error;
        }
    }

    /**
     * Arrête la connexion série
     * @returns {Promise<void>}
     */
    async stop() {
        try {
            this._updateStatus('disconnected');

            // Annuler la reconnexion automatique
            if (this.reconnectTimer) {
                clearTimeout(this.reconnectTimer);
                this.reconnectTimer = null;
            }

            // Fermer la connexion
            if (this.serialConnection && this.serialConnection.isOpen) {
                await new Promise((resolve) => {
                    this.serialConnection.close(() => {
                        resolve();
                    });
                });
            }

            this.serialConnection = null;
            this._updateClientCount(0);
            console.log(`Connexion série (${this.name}) fermée`);

        } catch (error) {
            console.error(`Erreur lors de la fermeture du port série:`, error);
            this._updateStatus('error', error.message);
            throw error;
        }
    }

    /**
     * Envoie un message via la connexion série
     * @param {string} message - Le message à envoyer
     * @returns {Promise<boolean>}
     */
    async broadcast(message) {
        try {
            if (this.serialConnection && this.serialConnection.isOpen && this.status === 'connected') {
                const data = message + '\n'; // Ajouter un saut de ligne

                await new Promise((resolve, reject) => {
                    this.serialConnection.write(data, (error) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve();
                        }
                    });
                });

                return true;
            }
            return false;
        } catch (error) {
            console.error('Erreur lors de l\'envoi via série:', error);
            return false;
        }
    }

    /**
     * Retourne la configuration publique
     * @returns {Object}
     */
    getPublicConfig() {
        return {
            baudRate: this.config.baudRate,
            port: this.serialConnection ? this.serialConnection.path : this.config.port,
            availablePorts: this.availablePorts.map(p => ({ path: p.path, manufacturer: p.manufacturer })),
            autoReconnect: this.config.autoReconnect
        };
    }

    /**
     * Liste les ports série disponibles (méthode publique)
     * @returns {Promise<Array>}
     */
    async listAvailablePorts() {
        await this._listAvailablePorts();
        return this.availablePorts;
    }

    /**
     * Liste les ports série disponibles
     * @private
     * @returns {Promise<void>}
     */
    async _listAvailablePorts() {
        try {
            const ports = await this.SerialPort.list();

            // Filtrage adapté pour macOS - inclure tous les ports /dev/tty.usb* et /dev/tty.*arduino*
            this.availablePorts = ports.filter(port => {
                // Sur macOS, inclure tous les ports qui semblent être des périphériques USB série
                const path = port.path.toLowerCase();
                const manufacturer = (port.manufacturer || '').toLowerCase();

                // Critères de sélection plus larges
                const isUsbSerial = path.includes('/dev/tty.usb') ||
                    path.includes('/dev/tty.wchusb') ||
                    path.includes('/dev/tty.usbmodem') ||
                    path.includes('/dev/tty.usbserial');

                const hasKnownManufacturer = manufacturer.includes('arduino') ||
                    manufacturer.includes('usb') ||
                    manufacturer.includes('serial') ||
                    manufacturer.includes('ch340') ||
                    manufacturer.includes('cp210') ||
                    manufacturer.includes('ftdi') ||
                    manufacturer.includes('prolific') ||
                    manufacturer.includes('silicon');

                // Exclure les ports Bluetooth et système
                const isBluetoothOrSystem = path.includes('bluetooth') ||
                    path.includes('blth') ||
                    path === '/dev/tty.bluetooth-incoming-port';

                return (isUsbSerial || hasKnownManufacturer) && !isBluetoothOrSystem;
            });

            // Si aucun port avec les critères habituels, inclure tous les ports /dev/tty.* sauf Bluetooth
            if (this.availablePorts.length === 0) {
                this.availablePorts = ports.filter(port => {
                    const path = port.path.toLowerCase();
                    return path.startsWith('/dev/tty.') &&
                        !path.includes('bluetooth') &&
                        !path.includes('blth') &&
                        path !== '/dev/tty.bluetooth-incoming-port';
                });
            }
        } catch (error) {
            console.error('Erreur lors de la liste des ports:', error);
            this.availablePorts = [];
        }
    }

    /**
     * Détermine le port à utiliser
     * @private
     * @returns {Promise<string|null>}
     */
    async _getPortToUse() {
        if (this.config.port !== 'auto') {
            return this.config.port;
        }

        if (this.availablePorts.length > 0) {
            // Privilégier les Arduino en premier
            const arduinoPort = this.availablePorts.find(p =>
                p.manufacturer && p.manufacturer.toLowerCase().includes('arduino')
            );

            if (arduinoPort) {
                return arduinoPort.path;
            }

            // Sinon, prendre le premier port disponible
            return this.availablePorts[0].path;
        }

        return null;
    }

    /**
     * Se connecte à un port spécifique
     * @private
     * @param {string} portPath - Chemin du port
     * @returns {Promise<void>}
     */
    async _connectToPort(portPath) {
        return new Promise((resolve, reject) => {
            this.serialConnection = new this.SerialPort({
                path: portPath,
                baudRate: this.config.baudRate,
                dataBits: this.config.dataBits,
                stopBits: this.config.stopBits,
                parity: this.config.parity
            });

            this.serialConnection.on('open', () => {
                console.log(`Port série ouvert: ${portPath}`);
                resolve();
            });

            this.serialConnection.on('data', (data) => {
                this._handleSerialData(data);
            });

            this.serialConnection.on('error', (error) => {
                console.error(`Erreur du port série:`, error);
                this._updateStatus('error', error.message);

                if (this.config.autoReconnect) {
                    this._scheduleReconnect();
                }
            });

            this.serialConnection.on('close', () => {
                console.log('Port série fermé');
                if (this.status === 'connected' && this.config.autoReconnect) {
                    this._updateStatus('connecting');
                    this._scheduleReconnect();
                }
            });

            // Timeout de connexion
            setTimeout(() => {
                if (this.status === 'connecting') {
                    reject(new Error('Timeout de connexion série'));
                }
            }, 5000);
        });
    }

    /**
     * Traite les données reçues du port série
     * @private
     * @param {Buffer} data - Données reçues
     */
    _handleSerialData(data) {
        // Convertir en string et ajouter au buffer
        this.buffer += data.toString();

        // Traiter les lignes complètes (terminées par \n)
        const lines = this.buffer.split('\n');
        this.buffer = lines.pop() || ''; // Garder la dernière ligne incomplète

        // Traiter chaque ligne complète
        lines.forEach(line => {
            const trimmedLine = line.trim();
            if (trimmedLine) {
                this._processMessage(trimmedLine, {
                    port: this.serialConnection.path,
                    baudRate: this.config.baudRate
                });
            }
        });
    }

    /**
     * Planifie une reconnexion automatique
     * @private
     */
    _scheduleReconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }

        this.reconnectTimer = setTimeout(async () => {
            try {
                console.log(`Tentative de reconnexion série...`);
                await this.start();
            } catch (error) {
                console.error('Échec de la reconnexion série:', error);
            }
        }, this.config.reconnectInterval);
    }

    /**
     * Retourne la liste des clients connectés (pour compatibilité)
     * @returns {Array}
     */
    getConnectedClients() {
        return this.serialConnection && this.serialConnection.isOpen ? [{
            id: 'serial-connection',
            connectedAt: this.startTime,
            port: this.serialConnection.path,
            baudRate: this.config.baudRate
        }] : [];
    }
}

module.exports = SerialInput;