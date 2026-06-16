import { DetectLabelHandler } from './DetectLabelHandler.js';
import { DetectJSONHandler } from './DetectJSONHandler.js';
import { DetectVariablesHandler } from './DetectVariablesHandler.js';

const LEVEL_TO_TYPE = {
    error: 'error-message',
    warn: 'warning-message',
    warning: 'warning-message',
    info: 'info-message',
    log: 'log-message'
};

function levelToType(level) {
    if (typeof level !== 'string') return 'log-message';
    return LEVEL_TO_TYPE[level.toLowerCase()] || 'log-message';
}

export function formatMessage(rawMessage, level) {
    const type = levelToType(level);

    const data = [
        { msg: rawMessage, type }
    ];

    const detectLabelHandler = new DetectLabelHandler();
    const detectJSONHandler = new DetectJSONHandler();
    const detectVariablesHandler = new DetectVariablesHandler();

    detectLabelHandler.setNext(detectJSONHandler).setNext(detectVariablesHandler);

    return detectLabelHandler.handle(data);
}
