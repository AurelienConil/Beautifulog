import { ChainHandler } from './ChainHandler.js';

export class DetectVariablesHandler extends ChainHandler {
    handle(data) {
        const itemToAdd = [];

        data.forEach(item => {
            itemToAdd.push(...this.detectVariables(item));
        });

        data = data.filter(item => item.msg && item.msg.length > 0);

        itemToAdd.forEach(newItem => {
            data.push(newItem);
        });

        return super.handle(data);
    }

    detectVariables(item) {
        const rawsegments = item.msg.split(',').map(s => s.trim());
        const segments = rawsegments.filter(s => s.length > 0);

        const segmentObjects = segments.map(segment => ({
            segment: segment,
            hasVariables: false,
            variables: {
                name: null,
                value: null
            }
        }));

        for (const segmentObj of segmentObjects) {
            let match = segmentObj.segment.match(/^([a-zA-Z0-9_ ]+)\s*=\s*(-?\d+(?:\.\d+)?)(?:\s*%|%|\s*([a-zA-Z]+))?$/);

            if (match) {
                const name = match[1].trim();
                const value = match[2].trim();
                let unit = null;
                if (match[0].includes('%')) {
                    unit = '%';
                } else if (match[3]) {
                    unit = match[3].trim();
                }

                segmentObj.hasVariables = true;
                segmentObj.variables.name = name;
                segmentObj.variables.value = unit ? value + ' ' + unit : value;
            }
        }

        const originalItem = { ...item };
        const newItems = [];
        let combinedMsg = '';

        segmentObjects.forEach((segmentObj, index) => {
            if (!segmentObj.hasVariables)
                combinedMsg += (combinedMsg ? ', ' : '') + segmentObj.segment;
        });

        item.msg = combinedMsg;
        if (item.format !== 'json') {
            item.format = 'string';
        }

        segmentObjects.forEach((segmentObj, index) => {
            if (segmentObj.hasVariables) {
                let newItem = { ...originalItem };
                newItem.msg = segmentObj.segment;
                newItem.variables = {};
                newItem.variables[segmentObj.variables.name] = segmentObj.variables.value;
                newItem.format = 'variable';

                newItems.push(newItem);
            }
        });

        return newItems;
    }
}
