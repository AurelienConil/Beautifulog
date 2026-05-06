#!/usr/bin/env node

/**
 * Script de pré-build pour synchroniser les fichiers liés à formatMessage.js
 * 
 * POURQUOI CE SCRIPT ?
 * ====================
 * Les fichiers liés à formatMessage.js doivent être utilisés à la fois côté Node.js (Electron main process)
 * et côté Vue.js (frontend). Problème : Node.js utilise CommonJS (require/module.exports)
 * et Vue.js utilise ES Modules (import/export).
 * 
 * SOLUTION :
 * - Un seul fichier source par fonctionnalité (CommonJS) à la racine
 * - Synchronisation automatique vers gui/src/utils/ (ES Module)
 * - Conversion automatique CommonJS → ES Module
 * 
 * CE QUI SE PASSE :
 * 1. Vérifie si la synchronisation est nécessaire (dates de modification)
 * 2. Lit les fichiers sources
 * 3. Convertit module.exports vers export
 * 4. Ajoute un header d'avertissement
 * 5. Écrit les fichiers dans gui/src/utils/
 * 
 * QUAND C'EST EXÉCUTÉ :
 * - Automatiquement avant npm run dev
 * - Automatiquement avant npm run build
 */

const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '..');
const targetDir = path.join(__dirname, '..', 'gui', 'src', 'utils');

const filesToSync = [
    'formatMessage.js',
    'ChainHandler.js',
    'DetectJSONHandler.js',
    'DetectLabelHandler.js',
    'DetectVariablesHandler.js'
];

function syncFile(fileName) {
    try {
        console.log(`🔄 Synchronisation de ${fileName}...`);

        const sourceFile = path.join(sourceDir, fileName);
        const targetFile = path.join(targetDir, fileName);

        // Lire le fichier source
        if (!fs.existsSync(sourceFile)) {
            throw new Error(`Fichier source non trouvé: ${sourceFile}`);
        }

        let content = fs.readFileSync(sourceFile, 'utf8');

        // Conversion CommonJS vers ES Module
        content = content.replace(
            /module\.exports = \{\s*([a-zA-Z0-9_,\s]+)\s*\};/g,
            (match, exports) => {
                const exportStatements = exports
                    .split(',')
                    .map(exp => exp.trim())
                    .map(exp => `export const ${exp} = ${exp};`)
                    .join('\n');
                return exportStatements;
            }
        );

        // Remplacer les require par des import avec gestion des chemins relatifs
        content = content.replace(
            /const (\w+) = require\(['"](\.\/\w+)['"]\);/g,
            (match, variable, path) => `import ${variable} from '${path}.js';`
        );

        // Remplacer module.exports par export default
        content = content.replace(
            /module\.exports = (\w+);/g,
            (match, variable) => `export default ${variable};`
        );

        // Ajouter un commentaire d'avertissement en haut du fichier
        const header = `/**
 * ⚠️  FICHIER GÉNÉRÉ AUTOMATIQUEMENT ⚠️
 * Ce fichier est synchronisé depuis ${fileName} (racine du projet)
 * Ne pas modifier directement - vos changements seront écrasés
 * Modifiez plutôt le fichier source: ${fileName}
 * 
 * Dernière synchronisation: ${new Date().toISOString()}
 */

`;

        content = header + content;

        // Créer le dossier cible s'il n'existe pas
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        // Écrire le fichier cible
        fs.writeFileSync(targetFile, content);

        console.log(`✅ ${fileName} synchronisé avec succès !`);
        console.log(`   Source: ${sourceFile}`);
        console.log(`   Cible:  ${targetFile}`);

        return true;
    } catch (error) {
        console.error(`❌ Erreur lors de la synchronisation de ${fileName}:`, error.message);
        return false;
    }
}

function checkAndSync() {
    console.log('🔍 Vérification de la synchronisation des fichiers...');

    filesToSync.forEach(fileName => {
        const sourceFile = path.join(sourceDir, fileName);
        const targetFile = path.join(targetDir, fileName);

        try {
            // Vérifier si les fichiers existent
            if (!fs.existsSync(sourceFile)) {
                console.error(`❌ Fichier source ${fileName} non trouvé`);
                return;
            }

            if (!fs.existsSync(targetFile)) {
                console.log(`📄 Fichier cible ${fileName} non trouvé, synchronisation nécessaire`);
                syncFile(fileName);
                return;
            }

            // Comparer les dates de modification
            const sourceStats = fs.statSync(sourceFile);
            const targetStats = fs.statSync(targetFile);

            if (sourceStats.mtime > targetStats.mtime) {
                console.log(`⏰ Fichier source ${fileName} plus récent, synchronisation nécessaire`);
                syncFile(fileName);
            } else {
                console.log(`✅ ${fileName} est déjà synchronisé`);
            }

        } catch (error) {
            console.error(`❌ Erreur lors de la vérification de ${fileName}:`, error.message);
        }
    });
}

// Exécuter la vérification et synchronisation si nécessaire
checkAndSync();