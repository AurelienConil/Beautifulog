const  ChainHandler  = require('./ChainHandler.js');
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
        const labelRegex = /^\s*\[\s*([^\]]+)\s*\]/;
        const match = item.msg.match(labelRegex);


        if (match) {
            item.label = match[1].trim();
            item.msg = item.msg.slice(match[0].length).trim();
        } else {
            item.label = 'log';
        }
        //Do not return as we modify the item directly
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