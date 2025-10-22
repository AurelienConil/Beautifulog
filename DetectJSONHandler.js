const ChainHandler = require('./ChainHandler.js');

class DetectJSONHandler extends ChainHandler {
    handle(data) {
        data.forEach(item => {
            if (this.isJSON(item.msg)) {
                try {
                    const parsed = JSON.parse(item.msg);
                    item.jsonData = parsed;
                    item.format = 'json';
                } catch (error) {
                    // JSON invalide, on peut ignorer ou logger l'erreur
                    console.error('Invalid JSON:', item.msg);
                    item.format = "string";
                }
            }
        });

        return super.handle(data);
    }

    isJSON(rawString) {
        if (!rawString.trim().startsWith('{') || !rawString.trim().endsWith('}')) {
            return false;
        }

        try {
            JSON.parse(rawString);
            return true;
        } catch (e) {
            return false;
        }
    }
}

module.exports = DetectJSONHandler;