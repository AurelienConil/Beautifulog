#!/usr/bin/env node

/**
 * Script de pré-build pour synchroniser formatMessage.js
 * 
 * POURQUOI CE SCRIPT ?
 * ====================
 * Le fichier formatMessage.js doit être utilisé à la fois côté Node.js (Electron main process)
 * et côté Vue.js (frontend). Problème : Node.js utilise CommonJS (require/module.exports)
 * et Vue.js utilise ES Modules (import/export).
 * 
 * SOLUTION :
 * - Un seul fichier source : formatMessage.js (CommonJS) à la racine
 * - Synchronisation automatique vers gui/src/utils/formatMessage.js (ES Module)
 * - Conversion automatique CommonJS → ES Module
 * 
 * CE QUI SE PASSE :
 * 1. Vérifie si la synchronisation est nécessaire (dates de modification)
 * 2. Lit le fichier source formatMessage.js
 * 3. Convertit module.exports vers export
 * 4. Ajoute un header d'avertissement
 * 5. Écrit le fichier dans gui/src/utils/
 * 
 * QUAND C'EST EXÉCUTÉ :
 * - Automatiquement avant npm run dev
 * - Automatiquement avant npm run build
 */

const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, '..', 'formatMessage.js');
const targetFile = path.join(__dirname, '..', 'gui', 'src', 'utils', 'formatMessage.js');

function syncFormatMessage() {
    try {
        console.log('🔄 Synchronisation de formatMessage.js...');

        // Lire le fichier source
        if (!fs.existsSync(sourceFile)) {
            throw new Error(`Fichier source non trouvé: ${sourceFile}`);
        }

        let content = fs.readFileSync(sourceFile, 'utf8');

        // Conversion CommonJS vers ES Module
        // Remplace "module.exports = { formatMessage };" par "export { formatMessage };"
        content = content.replace(
            'module.exports = {\n    formatMessage\n};',
            'export { formatMessage };'
        );

        // Ajouter un commentaire d'avertissement en haut du fichier
        const header = `/**
 * ⚠️  FICHIER GÉNÉRÉ AUTOMATIQUEMENT ⚠️
 * Ce fichier est synchronisé depuis formatMessage.js (racine du projet)
 * Ne pas modifier directement - vos changements seront écrasés
 * Modifiez plutôt le fichier source: formatMessage.js
 * 
 * Dernière synchronisation: ${new Date().toISOString()}
 */

`;

        content = header + content;

        // Créer le dossier cible s'il n'existe pas
        const targetDir = path.dirname(targetFile);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        // Écrire le fichier cible
        fs.writeFileSync(targetFile, content);

        console.log('✅ formatMessage.js synchronisé avec succès !');
        console.log(`   Source: ${sourceFile}`);
        console.log(`   Cible:  ${targetFile}`);

        return true;
    } catch (error) {
        console.error('❌ Erreur lors de la synchronisation:', error.message);
        return false;
    }
}

function checkAndSync() {
    console.log('🔍 Vérification de la synchronisation formatMessage.js...');

    try {
        // Vérifier si les fichiers existent
        if (!fs.existsSync(sourceFile)) {
            console.error('❌ Fichier source formatMessage.js non trouvé');
            process.exit(1);
        }

        if (!fs.existsSync(targetFile)) {
            console.log('📄 Fichier cible non trouvé, synchronisation nécessaire');
            syncFormatMessage();
            return;
        }

        // Comparer les dates de modification
        const sourceStats = fs.statSync(sourceFile);
        const targetStats = fs.statSync(targetFile);

        if (sourceStats.mtime > targetStats.mtime) {
            console.log('⏰ Fichier source plus récent, synchronisation nécessaire');
            syncFormatMessage();
        } else {
            console.log('✅ Les fichiers sont synchronisés');
        }

    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error.message);
        process.exit(1);
    }
}

// Exécuter la vérification et synchronisation si nécessaire
checkAndSync();