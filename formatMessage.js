/**
 * Module pour lire et formatter des messages sous forme d'objets
 * Formate les messages entrants avec label, type et timestamp
 */

const DetectLabelHandler = require('./DetectLabelHandler');
const DetectVariablesHandler = require('./DetectVariablesHandler');
const DetectJSONHandler = require('./DetectJSONHandler');

// Map an explicit client-side level to the GUI-facing message type
const LEVEL_TO_TYPE = {
    error: 'error-message',
    warn: 'warning-message',
    warning: 'warning-message',
    info: 'info-message',
    log: 'log-message'
};

function levelToType(level) {
    if (typeof level !== 'string') return 'log-message';
    return LEVEL_TO_TYPE[level.toLowerCase()] || 'log-message';
}

/**
 * Formate un message string en objet structuré
 * @param {string} rawMessage - Le message à formatter
 * @param {string} level - Niveau explicite ("log" | "warn" | "error" | "info")
 * @returns {Array<Object>} Tableau d'objets formatés avec label, type, msg, format, variables et timestamp
 */
function formatMessage(rawMessage, level) {
    const type = levelToType(level);

    const data = [
        { msg: rawMessage, type }
    ];

    // Créer la chaîne de responsabilité
    const detectLabelHandler = new DetectLabelHandler();
    const detectJSONHandler = new DetectJSONHandler();
    const detectVariablesHandler = new DetectVariablesHandler();

    // Order: DetectJSON must run BEFORE DetectVariables to prevent JSON arrays from being split
    detectLabelHandler.setNext(detectJSONHandler).setNext(detectVariablesHandler);

    // Traiter les données à travers la chaîne
    return detectLabelHandler.handle(data);
}

module.exports = { formatMessage };
