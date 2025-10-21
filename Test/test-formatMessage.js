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

console.log('=== Fin des tests ===');