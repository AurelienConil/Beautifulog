import { ChainHandler } from './ChainHandler.js';

export class DetectLabelHandler extends ChainHandler {
    handle(data) {
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
            const potentialLabel = match[1].trim();
            if (!potentialLabel.includes(',') && !potentialLabel.includes('{') && !potentialLabel.includes('[')) {
                item.label = potentialLabel;
                item.msg = item.msg.slice(match[0].length).trim();
            } else {
                item.label = 'log';
            }
        } else {
            item.label = 'log';
        }

        // Detect SUBLABEL: format
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
