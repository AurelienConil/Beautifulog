/**
 * Module pour lire et formatter des messages sous forme d'objets
 * Formate les messages entrants avec label, type et timestamp
 */

/**
 * Formate un message string en objet structuré
 * @param {string} input - Le message à formatter
 * @param {Object} options - Options de formatage (pour usage futur)
 * @returns {Object} Objet formaté avec label, type, msg et timestamp
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

module.exports = {
    formatMessage
};
