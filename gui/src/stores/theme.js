// stores/theme.js
import { defineStore } from 'pinia'
import { ref, watch, onMounted } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  // État
  const isCompact = ref(false) // Mode normal par défaut
  
  // Action pour basculer le mode compact
  function toggleCompactMode() {
    isCompact.value = !isCompact.value
    localStorage.setItem('compactMode', isCompact.value)
    applyCompactMode()
    console.log('Mode compact:', isCompact.value) // Pour debugging
  }
  
  // Appliquer le mode compact
  function applyCompactMode() {
    const app = document.documentElement
    if (isCompact.value) {
      app.classList.add('compact-mode')
    } else {
      app.classList.remove('compact-mode')
    }
  }
  
  // Fonction d'initialisation à appeler au montage de l'app
  function initialize() {
    // Récupérer le mode depuis le localStorage si disponible
    if (localStorage.getItem('compactMode') !== null) {
      isCompact.value = localStorage.getItem('compactMode') === 'true'
      applyCompactMode()
    }
  }
  
  return {
    isCompact,
    toggleCompactMode,
    initialize
  }
})