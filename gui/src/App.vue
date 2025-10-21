<template>
  <v-app>
    <v-app-bar
      app
      color="primary"
      dark
    >
      <v-app-bar-title>
        <v-icon left>mdi-file-document-outline</v-icon>
        Log Viewer
      </v-app-bar-title>
      
      <v-spacer></v-spacer>
      
      <v-btn
        icon
        @click="toggleTheme"
      >
        <v-icon>{{ isDark ? 'mdi-white-balance-sunny' : 'mdi-weather-night' }}</v-icon>
      </v-btn>
    </v-app-bar>

    <v-main>
      <v-container fluid>
        <v-row>
          <v-col cols="12">
            <WelcomeCard />
          </v-col>
        </v-row>
        
        <v-row>
          <v-col cols="12" md="6">
            <FeatureCard
              title="Electron Integration"
              icon="mdi-desktop-classic"
              description="Application de bureau native avec Electron"
            />
          </v-col>
          
          <v-col cols="12" md="6">
            <FeatureCard
              title="Vue 3 Composition API"
              icon="mdi-vuejs"
              description="Interface réactive avec Vue 3 et Composition API"
            />
          </v-col>
        </v-row>
        
        <v-row>
          <v-col cols="12" md="6">
            <FeatureCard
              title="Vuetify Components"
              icon="mdi-material-design"
              description="Composants Material Design avec Vuetify"
            />
          </v-col>
          
          <v-col cols="12" md="6">
            <FeatureCard
              title="Vite Build Tool"
              icon="mdi-lightning-bolt"
              description="Développement rapide avec Vite"
            />
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useTheme } from 'vuetify'
import WelcomeCard from './components/WelcomeCard.vue'
import FeatureCard from './components/FeatureCard.vue'

const theme = useTheme()
const isDark = computed(() => theme.global.name.value === 'dark')

const toggleTheme = () => {
  theme.global.name.value = theme.global.current.value.dark ? 'light' : 'dark'
}
</script>

<style scoped>
/* Styles personnalisés si nécessaire */
</style>