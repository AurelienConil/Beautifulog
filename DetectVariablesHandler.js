const ChainHandler = require('./ChainHandler.js');

class DetectVariablesHandler extends ChainHandler {
    handle(data) {
        const itemToAdd = [];

        data.forEach(item => {
            itemToAdd.push(...this.detectVariables(item));
        });

        //Remove item with item.msg empty
        data = data.filter(item => item.msg && item.msg.length > 0);

        itemToAdd.forEach(newItem => {
            data.push(newItem);
        });

        return super.handle(data);
    }

    detectVariables(item) {


        // Séparation des potentielles multiples variables (séparées par des virgules)
        const rawsegments = item.msg.split(',').map(s => s.trim());

        //Remove empty segments
        const segments = rawsegments.filter(s => s.length > 0);

        // Transform sgments into array of objects with 2 field : segment and hasVariables
        const segmentObjects = segments.map(segment => ({
            segment: segment,
            hasVariables: false,
            variables: {
                name: null,
                value: null
            }
        }));

        for (const segmentObj of segmentObjects) {
            // Détection du format "nom = valeur [unité]" avec décimal et %, unité collée ou séparée
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

        // Create a copy of original item.
        const originalItem = { ...item };

        // All segments without variable are combined back into item.msg
        const newItems = [];
        let combinedMsg = '';

        segmentObjects.forEach((segmentObj, index) => {
            if (!segmentObj.hasVariables)
                // Sinon, on ajoute au message combiné
                combinedMsg += (combinedMsg ? ', ' : '') + segmentObj.segment;
        }
        );

        item.msg = combinedMsg;
        item.format = 'string';


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

module.exports = DetectVariablesHandler;
