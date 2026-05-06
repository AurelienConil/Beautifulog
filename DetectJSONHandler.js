const ChainHandler = require('./ChainHandler.js');

class DetectJSONHandler extends ChainHandler {
    handle(data) {
        data.forEach(item => {
            const isJsonData = this.isJSON(item.msg);

            if (isJsonData) {
                try {
                    let parsed;
                    const trimmed = item.msg.trim();

                    // Check if it's a stringified JSON
                    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
                        // First parse to get the JSON string
                        const unquoted = JSON.parse(trimmed);
                        // Then parse the JSON string
                        parsed = JSON.parse(unquoted);
                    } else {
                        // Direct JSON parsing
                        parsed = JSON.parse(item.msg);
                    }

                    item.jsonData = parsed;
                    item.format = 'json';
                } catch (error) {
                    console.error('Invalid JSON:', item.msg.substring(0, 100));
                    item.format = "string";
                }
            }
        });

        return super.handle(data);
    }

    isJSON(rawString) {
        const trimmed = rawString.trim();

        // Check if it's a stringified JSON (starts and ends with quotes)
        if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
            try {
                // Parse the string to get the actual JSON string inside
                const unquoted = JSON.parse(trimmed);
                // Then try to parse that as JSON
                JSON.parse(unquoted);
                return true;
            } catch (e) {
                return false;
            }
        }

        // Check if it's direct JSON (object or array)
        const isObject = trimmed.startsWith('{') && trimmed.endsWith('}');
        const isArray = trimmed.startsWith('[') && trimmed.endsWith(']');

        if (!isObject && !isArray) {
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