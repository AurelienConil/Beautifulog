const { formatMessage } = require('../formatMessage');

// Tests du module DetectJSONHandler - JSON objects et arrays
console.log('=== Tests DetectJSONHandler ===\n');

function testJSON(description, inputMsg, expectedData) {
    try {
        console.log(`Test: ${description}`);
        const results = formatMessage(inputMsg);
        const result = results[0]; // formatMessage returns an array

        if (result.format === 'json' &&
            JSON.stringify(result.jsonData) === JSON.stringify(expectedData)) {
            console.log('✅ Succès\n');
            return true;
        } else {
            console.log(`❌ Échec - format: ${result.format}, jsonData: ${JSON.stringify(result.jsonData)}\n`);
            return false;
        }
    } catch (error) {
        console.log(`❌ Erreur: ${error.message}\n`);
        return false;
    }
}

function testNotJSON(description, inputMsg) {
    try {
        console.log(`Test: ${description}`);
        const results = formatMessage(inputMsg);
        const result = results[0]; // formatMessage returns an array

        if (result.format !== 'json') {
            console.log(`✅ Succès - format: ${result.format} (pas JSON)\n`);
            return true;
        } else {
            console.log(`❌ Échec - détecté comme JSON au lieu de ${result.format}\n`);
            return false;
        }
    } catch (error) {
        console.log(`❌ Erreur: ${error.message}\n`);
        return false;
    }
}

// Test 1: JSON object simple
testJSON(
    'JSON object simple',
    '{"name": "John", "age": 30}',
    { name: "John", age: 30 }
);

// Test 2: JSON array simple
testJSON(
    'JSON array simple',
    '[1, 2, 3, 4]',
    [1, 2, 3, 4]
);

// Test 3: JSON array vide
testJSON(
    'JSON array vide',
    '[]',
    []
);

// Test 4: JSON array d'objets
testJSON(
    'JSON array d\'objets',
    '[{"id": 1}, {"id": 2}]',
    [{ id: 1 }, { id: 2 }]
);

// Test 5: JSON mal formé
testNotJSON(
    'JSON mal formé {invalid json}',
    '{invalid json}'
);

// Test 6: Chaîne simple (pas JSON)
testNotJSON(
    'Chaîne simple sans JSON',
    'Just a plain string'
);

// Test 7: Array au début du message sans label
testJSON(
    'Array JSON sans label [1, 2]',
    '[1, 2]',
    [1, 2]
);

// Test 8: JSON object avec whitespace
testJSON(
    'JSON object avec whitespace',
    '  {"key": "value"}  ',
    { key: "value" }
);

// Test 9: JSON array avec whitespace
testJSON(
    'JSON array avec whitespace',
    '  [1, 2, 3]  ',
    [1, 2, 3]
);

// Test 10: JSON array complexe avec objets imbriqués
testJSON(
    'JSON array complexe',
    '[{"id": 1, "tags": ["a", "b"]}, {"id": 2, "tags": ["c"]}]',
    [{ id: 1, tags: ["a", "b"] }, { id: 2, tags: ["c"] }]
);

// Test 11: Label + JSON object
testJSON(
    'Label [DATA] + JSON object',
    '[DATA] {"sensor": "temp", "value": 25.5}',
    { sensor: "temp", value: 25.5 }
);

// Test 12: Label + JSON array
testJSON(
    'Label [READINGS] + JSON array',
    '[READINGS] [10, 20, 30, 40]',
    [10, 20, 30, 40]
);

console.log('=== Fin des tests ===');
