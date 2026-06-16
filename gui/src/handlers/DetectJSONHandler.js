import { ChainHandler } from './ChainHandler.js';

export class DetectJSONHandler extends ChainHandler {
    handle(data) {
        data.forEach(item => {
            const isJsonData = this.isJSON(item.msg);

            if (isJsonData) {
                try {
                    let parsed;
                    const trimmed = item.msg.trim();

                    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
                        const unquoted = JSON.parse(trimmed);
                        parsed = JSON.parse(unquoted);
                    } else {
                        parsed = JSON.parse(item.msg);
                    }

                    item.jsonData = parsed;
                    item.format = 'json';
                } catch (error) {
                    console.error('Invalid JSON:', item.msg.substring(0, 100));
                    item.format = 'string';
                }
            }
        });

        return super.handle(data);
    }

    isJSON(rawString) {
        const trimmed = rawString.trim();

        if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
            try {
                const unquoted = JSON.parse(trimmed);
                JSON.parse(unquoted);
                return true;
            } catch (e) {
                return false;
            }
        }

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
