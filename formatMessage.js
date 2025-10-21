/**
 * Module pour lire et formatter des messages sous forme d'objets
 * Formate les messages entrants avec label, type et timestamp
 */

/**
 * Formate un message string en objet structuré
 * @param {string} input - Le message à formatter
 * @param {Object} options - Options de formatage (pour usage futur)
 * @returns {Object} Objet formaté avec label, type, msg, format, variables et timestamp
 */
function formatMessage(input, options = {}) {
    // Validation de l'input
    if (typeof input !== 'string') {
        throw new Error('Input doit être une chaîne de caractères');
    }

    if (input.trim() === '') {
        throw new Error('Input ne peut pas être vide');
    }

    // Initialiser le résultat
    const result = {};

    // Détecter le label
    const labelResult = detectLabel(input);
    result.label = labelResult.label;
    const msgWithoutLabel = labelResult.msg;

    // Détecter le type
    const typeResult = detectType(msgWithoutLabel, result.label);
    result.type = typeResult.type;
    result.msg = typeResult.msg;

    // Détecter les variables
    const variableResult = detectVariables(result.msg);
    if (variableResult.hasVariables) {
        result.format = "variable";
        result.variables = variableResult.variables;
    } else {
        result.format = "string";
    }

    // Ajouter le timestamp
    result.timestamp = new Date().toISOString();

    return result;
}

/**
 * Détecte et extrait le label d'un message
 * Format attendu: [LABEL] message
 * @param {string} message - Le message à analyser
 * @returns {Object} Objet avec label et message sans label
 */
function detectLabel(message) {
    // Détecter si le message commence par un format [LABEL]
    const labelRegex = /^\s*\[\s*([^\]]+)\s*\]/;
    const match = message.match(labelRegex);

    const result = {
        label: null,
        msg: message
    };

    if (match) {
        result.label = match[1].trim();
        result.msg = message.slice(match[0].length).trim();
    } else {
        result.label = 'log';
    }

    return result;
}

/**
 * Détecte le type de message basé sur des mots-clés
 * @param {string} message - Le message à analyser
 * @param {string} label - Le label du message
 * @returns {Object} Objet avec type et message nettoyé
 */
function detectType(message, label) {
    // Cherche dans les strings message et label si un mot clé ERROR, WARNING, INFO, LOG existe
    const result = {
        type: 'log-message',
        msg: message
    };

    const typeKeywords = {
        'error': 'error-message',
        'warning': 'warning-message',
        'info': 'info-message',
        'log': 'log-message'
    };

    for (const [keyword, type] of Object.entries(typeKeywords)) {
        const regex = new RegExp(`\\b${keyword}\\b:?`, 'i');
        if (regex.test(message) || (label && regex.test(label))) {
            result.type = type;
            // Enlever le mot clé du message et nettoyer
            result.msg = message.replace(regex, '').trim();
            // Enlever les ":" en début de message s'il en reste
            if (result.msg.startsWith(':')) {
                result.msg = result.msg.substring(1).trim();
            }
            break;
        }
    }

    return result;
}

/**
 * Détecte si le message contient des définitions de variables
 * Formats supportés: "nom = valeur", "nom : valeur" avec séparation par virgules
 * @param {string} message - Le message à analyser
 * @returns {Object} Informations sur les variables détectées
 */
function detectVariables(message) {
    const result = {
        hasVariables: false,
        variables: {}
    };

    // Séparation des potentielles multiples variables (séparées par des virgules)
    const segments = message.split(',').map(s => s.trim());

    for (const segment of segments) {
        // Détection du format "nom = valeur"
        let match = segment.match(/^([a-zA-Z0-9_]+)\s*=\s*([^=]+)$/);
        if (!match) {
            // Détection du format "nom : valeur"
            match = segment.match(/^([a-zA-Z0-9_]+)\s*:\s*([^:]+)$/);
        }

        if (match) {
            const name = match[1].trim();
            const value = match[2].trim();
            result.variables[name] = value;
            result.hasVariables = true;
        }
    }

    return result;
}

module.exports = {
    formatMessage
};
