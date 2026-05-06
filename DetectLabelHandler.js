const ChainHandler = require('./ChainHandler.js');
//LABEL is the system origin of the log. It can be any string. Default one is LOG
// Data is an array of objects with at least a 'msg' property


class DetectLabelHandler extends ChainHandler {
    handle(data) {
        // Logic to detect labels in the data
        data.forEach(item => {
            this.detectLabel(item);
        });

        return super.handle(data);
    }

    detectLabel(item) {
        // Détecter si le message commence par un format [LABEL]
        // Un label ne doit pas contenir de virgule, d'accolades ou de crochets (sinon c'est du JSON)
        const labelRegex = /^\s*\[\s*([^\]]+)\s*\]/;
        const match = item.msg.match(labelRegex);

        if (match) {
            const potentialLabel = match[1].trim();
            // Vérifier que ce n'est pas du JSON: pas de virgule, pas d'accolades, pas de crochets
            if (!potentialLabel.includes(',') && !potentialLabel.includes('{') && !potentialLabel.includes('[')) {
                item.label = potentialLabel;
                item.msg = item.msg.slice(match[0].length).trim();
            } else {
                item.label = 'log';
            }
        } else {
            item.label = 'log';
        }

        // Detect now if the item.msg start is SUBLABEL : something like "SUBLABEL: actual message", or "SUB LABEL : something"
        // This mean there is text before the first ":" that does not contain special characters, only letters, numbers, spaces 
        const subLabelRegex = /^\s*([a-zA-Z0-9_ ]+)\s*:\s*/;
        const subMatch = item.msg.match(subLabelRegex);

        if (subMatch) {
            item.subLabel = subMatch[1].trim();
            item.msg = item.msg.slice(subMatch[0].length).trim();
        } else {
            item.subLabel = null;
        }


    }
}

module.exports = DetectLabelHandler;


/*
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
*/