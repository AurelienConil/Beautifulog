const ChainHandler = require('./ChainHandler.js');

class DetectVariablesHandler extends ChainHandler {
    handle(data) {
        const itemToAdd = [];

        data.forEach(item => {
            itemToAdd.push(...this.detectVariables(item));
        });

        itemToAdd.forEach(newItem => {
            data.push(newItem);
        });

        return super.handle(data);
    }

    detectVariables(item) {


        // Séparation des potentielles multiples variables (séparées par des virgules)
        const segments = item.msg.split(',').map(s => s.trim());

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
            // Détection du format "nom = valeur"
            let match = segmentObj.segment.match(/^([a-zA-Z0-9_]+)\s*=\s*([^=]+)$/);
            if (!match) {
                // Détection du format "nom : valeur"
                match = segmentObj.segment.match(/^([a-zA-Z0-9_]+)\s*:\s*([^:]+)$/);
            }

            if (match) {
                const name = match[1].trim();
                const value = match[2].trim();

                // Vérifier si la valeur est valide selon nos nouvelles règles
                const isValidVariable = (
                    // Règle 1: Un nombre seul
                    /^\d+(\.\d+)?$/.test(value) ||

                    // Règle 2: Un nombre suivi d'un seul mot (unité)
                    /^\d+(\.\d+)?\s+\w+$/.test(value) ||

                    // Règle 3: Une chaîne sans espace (un seul "mot")
                    /^"[^"]*"$/.test(value) || /^'[^']*'$/.test(value) || /^[^\s]+$/.test(value)
                );

                if (isValidVariable) {
                    segmentObj.hasVariables = true;
                    segmentObj.variables.name = name;
                    segmentObj.variables.value = value;
                }
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
