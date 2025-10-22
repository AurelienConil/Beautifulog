const { formatMessage } = require('../formatMessage');

// Tests de la fonction formatMessage
console.log('=== Tests du module formatMessage ===\n');

// Test 1: Message simple
try {
    let msg = 'Ceci est un message simple';
    console.log('Test 1: ', msg);
    const result1 = formatMessage(msg);
    console.log('result', result1);
    console.log('✅ Succès\n');
} catch (error) {
    console.log('❌ Erreur:', error.message, '\n');
}

// Test 2: Message avec label
try {
    console.log('Test 2: Message avec label');
    const result2 = formatMessage('[APP] Application démarrée');
    console.log('Résultat:', result2);
    console.log('✅ Succès\n');
} catch (error) {
    console.log('❌ Erreur:', error.message, '\n');
}

// Test 3: Message avec type error
try {
    console.log('Test 3: Message avec type error');
    const result3 = formatMessage('[DATABASE] ERROR: Connexion impossible');
    console.log('Résultat:', result3);
    console.log('✅ Succès\n');
} catch (error) {
    console.log('❌ Erreur:', error.message, '\n');
}

// Test 4: Message avec type warning
try {
    console.log('Test 4: Message avec type warning');
    const result4 = formatMessage('WARNING: Mémoire faible');
    console.log('Résultat:', result4);
    console.log('✅ Succès\n');
} catch (error) {
    console.log('❌ Erreur:', error.message, '\n');
}

// Test 5: Message avec type info
try {
    console.log('Test 5: Message avec type info');
    const result5 = formatMessage('[API] INFO: Nouvelle connexion utilisateur');
    console.log('Résultat:', result5);
    console.log('✅ Succès\n');
} catch (error) {
    console.log('❌ Erreur:', error.message, '\n');
}

// Test 6: Test d'erreur - input non string
try {
    console.log('Test 6: Test d\'erreur - input non string');
    const result6 = formatMessage(123);
    console.log('Résultat:', result6);
    console.log('❌ Ce test devrait échouer\n');
} catch (error) {
    console.log('✅ Erreur attendue:', error.message, '\n');
}

// Test 7: Test d'erreur - input vide
try {
    console.log('Test 7: Test d\'erreur - input vide');
    const result7 = formatMessage('   ');
    console.log('Résultat:', result7);
    console.log('❌ Ce test devrait échouer\n');
} catch (error) {
    console.log('✅ Erreur attendue:', error.message, '\n');
}

// Test 8: Message avec une variable (format =)
try {
    console.log('Test 8: Message avec une variable (format =)');
    const result8 = formatMessage('[SYSTEM] chauffage en cours,  temperature = 25.4');
    console.log('Résultat:', result8);
    console.log('✅ Succès\n');
} catch (error) {
    console.log('❌ Erreur:', error.message, '\n');
}

// Test 9: Message avec une variable (format :)
try {
    console.log('Test 9: Message avec une variable (format :)');
    const result9 = formatMessage('[SENSOR] humidity: 78');
    console.log('Résultat:', result9);
    console.log('Format:', result9.format);
    console.log('Variables:', result9.variables);
    console.log('✅ Succès\n');
} catch (error) {
    console.log('❌ Erreur:', error.message, '\n');
}

// Test 10: Message avec plusieurs variables séparées par des virgules
try {
    console.log('Test 10: Message avec plusieurs variables séparées par des virgules');
    const result10 = formatMessage('[MONITOR] cpu = 45%, ram = 3.2GB, disk: 120GB');
    console.log('Résultat:', result10);
    console.log('Format:', result10.format);
    console.log('Variables:', result10.variables);
    console.log('✅ Succès\n');
} catch (error) {
    console.log('❌ Erreur:', error.message, '\n');
}

// Test 11: Message avec formats mixtes de variables
try {
    console.log('Test 11: Message avec formats mixtes de variables');
    const result11 = formatMessage('[METRICS] online: true, errors = 0, response_time: 250ms');
    console.log('Résultat:', result11);
    console.log('Format:', result11.format);
    console.log('Variables:', result11.variables);
    console.log('✅ Succès\n');
} catch (error) {
    console.log('❌ Erreur:', error.message, '\n');
}

// Test 12: Message service avec deux points suivi de texte (ne devrait pas être détecté comme variable)
try {
    console.log('Test 12: Message service avec deux points suivi de texte');
    const result12 = formatMessage('AnalyzerService: Restarting analyzer 1');
    console.log('Résultat:', result12);
    console.log('Format:', result12.format);
    if (result12.format === "string") {
        console.log('✅ Succès - Correctement identifié comme string et non comme variable\n');
    } else {
        console.log('❌ Échec - Détecté comme', result12.format, 'au lieu de string\n');
    }
} catch (error) {
    console.log('❌ Erreur:', error.message, '\n');
}

// Test 13: Message avec valeur numérique suivie d'une unité (devrait être détecté comme variable)
try {
    console.log('Test 13: Message avec valeur numérique suivie d\'une unité');
    const result13 = formatMessage('[SENSOR] temperature = 25 C, humidity = 78 %');
    console.log('Résultat:', result13);
    console.log('Format:', result13.format);
    console.log('Variables:', result13.variables);
    if (result13.format === "variable" &&
        result13.variables.temperature === "25 C" &&
        result13.variables.humidity === "78 %") {
        console.log('✅ Succès - Correctement identifié les variables avec unités\n');
    } else {
        console.log('❌ Échec - Variables avec unités non détectées correctement\n');
    }
} catch (error) {
    console.log('❌ Erreur:', error.message, '\n');
}

// Test 14: Message au format JSON simple
try {
    console.log('Test 14: Message au format JSON simple');
    const result14 = formatMessage('{"name": "test", "value": 123}');
    console.log('Résultat:', result14);
    console.log('Format:', result14.format);
    if (result14.format === "json" &&
        result14.jsonData.name === "test" &&
        result14.jsonData.value === 123) {
        console.log('✅ Succès - Correctement identifié comme JSON\n');
    } else {
        console.log('❌ Échec - JSON non détecté correctement\n');
    }
} catch (error) {
    console.log('❌ Erreur:', error.message, '\n');
}

// Test 15: Message au format JSON plus complexe
try {
    console.log('Test 15: Message au format JSON complexe');
    const result15 = formatMessage('{"sensor": {"id": "temp-01", "readings": [21.5, 22.1, 22.3], "status": "active"}}');
    console.log('Résultat:', result15);
    console.log('Format:', result15.format);
    if (result15.format === "json" &&
        result15.jsonData.sensor.id === "temp-01" &&
        Array.isArray(result15.jsonData.sensor.readings)) {
        console.log('✅ Succès - Correctement identifié comme JSON complexe\n');
    } else {
        console.log('❌ Échec - JSON complexe non détecté correctement\n');
    }
} catch (error) {
    console.log('❌ Erreur:', error.message, '\n');
}

// Test 16: JSON mal formé (devrait être traité comme une chaîne normale)
try {
    console.log('Test 16: JSON mal formé');
    const result16 = formatMessage('{"name": "test", value: 123}');  // virgule manquante
    console.log('Résultat:', result16);
    console.log('Format:', result16.format);
    if (result16.format === "string") {
        console.log('✅ Succès - JSON mal formé correctement identifié comme string\n');
    } else {
        console.log('❌ Échec - JSON mal formé non détecté correctement\n');
    }
} catch (error) {
    console.log('❌ Erreur:', error.message, '\n');
}

console.log('=== Fin des tests ===');