/**
 * Module pour lire et formatter des messages sous forme d'objets
 * Formate les messages entrants avec label, type et timestamp
 */

const DetectLabelHandler = require('./DetectLabelHandler');
const DetectVariablesHandler = require('./DetectVariablesHandler');
const DetectTypeHandler = require('./DetectTypeHandler');
const DetectJSONHandler = require('./DetectJSONHandler');

/**
 * Formate un message string en objet structuré
 * @param {string} input - Le message à formatter
 * @param {Object} options - Options de formatage (pour usage futur)
 * @returns {Object} Objet formaté avec label, type, msg, format, variables et timestamp
 */
function formatMessage(rawMessages) {
    // Convertir les messages bruts en un tableau d'objets
    const data = [
        { msg: rawMessages }
    ]

    console.log('Raw data for formatting:', data);

    // Créer la chaîne de responsabilité
    const detectLabelHandler = new DetectLabelHandler();
    const detectVariablesHandler = new DetectVariablesHandler();
    const detectTypeHandler = new DetectTypeHandler();
    const detectJSONHandler = new DetectJSONHandler();

    detectLabelHandler.setNext(detectVariablesHandler).setNext(detectTypeHandler).setNext(detectJSONHandler);

    // Traiter les données à travers la chaîne
    return detectLabelHandler.handle(data);
}

module.exports = { formatMessage };
