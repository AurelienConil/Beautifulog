const { formatMessage } = require('../formatMessage');

// Tests de la fonction formatMessage
console.log('=== Tests du module formatMessage ===\n');

// Test 1: Message simple
try {
    console.log('Test 1: Message simple');
    const result1 = formatMessage('Ceci est un message simple');
    console.log('Résultat:', result1);
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
    const result8 = formatMessage('[SYSTEM] temperature = 25.4');
    console.log('Résultat:', result8);
    console.log('Format:', result8.format);
    console.log('Variables:', result8.variables);
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

console.log('=== Fin des tests ===');