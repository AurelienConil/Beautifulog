const ChainHandler = require('./ChainHandler.js');

class DetectTypeHandler extends ChainHandler {
    handle(data) {

        //Choose a defaut type if none detected

        // Logic to detect types in the data
        data.forEach(item => {
            item.type = 'log-message'; // default type
            this.detectType(item);
        });


        return super.handle(data);
    }

    typeKeywords = {
        'error': 'error-message',
        'warning': 'warning-message',
        'info': 'info-message',
        'log': 'log-message'
    };

    detectType(item) {
        // Example logic to determine type
        for (const [keyword, type] of Object.entries(this.typeKeywords)) {
            const regex = new RegExp(`\\b${keyword}\\b:?`, 'i');
            if (regex.test(item.msg)) {
                item.type = type;
                // Enlever le mot clé du message et nettoyer
                item.msg = item.msg.replace(regex, '').trim();
                // Enlever les ":" en début de message s'il en reste
                if (item.msg.startsWith(':')) {
                    item.msg = item.msg.substring(1).trim();
                }
                break;
            }
        }
    }
}

module.exports = DetectTypeHandler;
