<template>
  <v-card
    class="mx-auto"
    elevation="8"
  >
    <v-card-title class="text-h4 text-center py-8">
      <v-icon
        size="48"
        color="primary"
        class="mr-4"
      >
        mdi-rocket-launch
      </v-icon>
      Bienvenue dans votre App Electron!
    </v-card-title>
    
    <v-card-text class="text-center text-h6">
      <p>
        Cette application utilise <strong>Electron</strong>, <strong>Vue 3</strong> 
        et <strong>Vuetify</strong> pour créer une expérience de bureau moderne.
      </p>
      
      <v-divider class="my-4"></v-divider>
      
      <v-chip-group>
        <v-chip color="primary" variant="elevated">
          <v-icon start>mdi-electron-framework</v-icon>
          Electron
        </v-chip>
        <v-chip color="success" variant="elevated">
          <v-icon start>mdi-vuejs</v-icon>
          Vue 3
        </v-chip>
        <v-chip color="info" variant="elevated">
          <v-icon start>mdi-material-design</v-icon>
          Vuetify
        </v-chip>
        <v-chip color="warning" variant="elevated">
          <v-icon start>mdi-lightning-bolt</v-icon>
          Vite
        </v-chip>
      </v-chip-group>
    </v-card-text>
    
    <v-card-actions class="justify-center pb-8">
      <v-btn
        color="primary"
        size="large"
        variant="elevated"
        @click="showVersions = !showVersions"
      >
        <v-icon start>mdi-information</v-icon>
        Versions
      </v-btn>
    </v-card-actions>
    
    <v-expand-transition>
      <v-card-text v-show="showVersions" class="pt-0">
        <v-alert
          type="info"
          variant="tonal"
        >
          <template #title>Informations de version</template>
          <div class="mt-2">
            <p><strong>Chrome:</strong> <code id="chrome-version">{{ chromeVersion }}</code></p>
            <p><strong>Node.js:</strong> <code id="node-version">{{ nodeVersion }}</code></p>
            <p><strong>Electron:</strong> <code id="electron-version">{{ electronVersion }}</code></p>
          </div>
        </v-alert>
      </v-card-text>
    </v-expand-transition>
  </v-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const showVersions = ref(false)
const chromeVersion = ref('Loading...')
const nodeVersion = ref('Loading...')
const electronVersion = ref('Loading...')

onMounted(() => {
  // Récupérer les versions depuis le processus Electron
  chromeVersion.value = process.versions.chrome || 'N/A'
  nodeVersion.value = process.versions.node || 'N/A'
  electronVersion.value = process.versions.electron || 'N/A'
})
</script>