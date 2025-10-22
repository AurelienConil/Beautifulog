<template>
  <v-app>
    <v-app-bar app color="primary" dark>
      <v-app-bar-title>
        <v-icon left>mdi-file-document-outline</v-icon>
        Log Viewer
      </v-app-bar-title>

      <v-spacer></v-spacer>

      <!-- Input de debug -->
      <div v-if="socketStore.debugMode" class="debug-input-container mr-4">
        <v-text-field
          v-model="debugMessage"
          placeholder="Ex: [API] ERROR: Connexion échoué"
          variant="outlined"
          density="compact"
          hide-details
          class="debug-input"
          @focus="openHelpModal"
          @keyup.escape="helpModal = false"
          @keyup.enter="addDebugMessage"
          prepend-inner-icon="mdi-bug"
        >
          <template #append-inner>
            <v-btn
              icon
              size="small"
              @click="addDebugMessage"
              :disabled="!debugMessage.trim()"
            >
              <v-icon>mdi-send</v-icon>
            </v-btn>
          </template>
        </v-text-field>
      </div>

      <!-- Icônes de navigation -->
      <v-btn icon @click="openWelcomeModal" class="mr-2">
        <v-icon>mdi-home</v-icon>
      </v-btn>

      <v-btn icon @click="openStoreModal" class="mr-2">
        <v-icon>mdi-database</v-icon>
      </v-btn>

      <v-btn icon @click="openSocketModal" class="mr-2">
        <v-icon>mdi-lan-connect</v-icon>
      </v-btn>

      <v-btn icon @click="openHelpModal" class="mr-2">
        <v-icon>mdi-help-circle</v-icon>
      </v-btn>

      <!-- Toggle debug mode -->
      <v-btn icon @click="socketStore.toggleDebugMode" class="mr-2">
        <v-icon :color="socketStore.debugMode ? 'warning' : 'default'">
          mdi-bug
        </v-icon>
      </v-btn>

      <v-btn
        icon
        @click="toggleCompactMode"
        class="mr-2 compact-mode-btn"
        v-tooltip="'Mode compact'"
      >
        <v-icon>{{
          themeStore.isCompact ? "mdi-fullscreen-exit" : "mdi-fullscreen"
        }}</v-icon>
      </v-btn>

      <v-btn icon @click="toggleTheme">
        <v-icon>{{
          isDark ? "mdi-white-balance-sunny" : "mdi-weather-night"
        }}</v-icon>
      </v-btn>
    </v-app-bar>

    <v-main>
      <v-container fluid class="fill-height pa-0">
        <DynamicTable />
      </v-container>
    </v-main>

    <!-- Composant DebugHelp -->
    <DebugHelp :visible="helpModal" @close="helpModal = false" />

    <!-- Modal WelcomeCard -->
    <v-dialog v-model="welcomeModal" max-width="800px">
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          <span>Accueil</span>
          <v-btn icon @click="welcomeModal = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text>
          <WelcomeCard />
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Modal StoreViewer -->
    <v-dialog v-model="storeModal" max-width="1000px">
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          <span>Store Viewer</span>
          <v-btn icon @click="storeModal = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text>
          <StoreViewer />
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Modal SocketManager -->
    <v-dialog v-model="socketModal" max-width="800px">
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          <span>Socket Manager</span>
          <v-btn icon @click="socketModal = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text>
          <SocketManager />
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useTheme } from "vuetify";
import { useSocketStore } from "./stores/socket.js";
import { useThemeStore } from "./stores/theme.js";
import WelcomeCard from "./components/WelcomeCard.vue";
import FeatureCard from "./components/FeatureCard.vue";
import SocketManager from "./components/SocketManager.vue";
import StoreViewer from "./components/StoreViewer.vue";
import DynamicTable from "./components/DynamicTable.vue";
import DebugHelp from "./components/DebugHelp.vue";

const theme = useTheme();
const isDark = computed(() => theme.global.name.value === "dark");

// Stores
const socketStore = useSocketStore();
const themeStore = useThemeStore();

// Gestion des modales
const welcomeModal = ref(false);
const storeModal = ref(false);
const socketModal = ref(false);
const helpModal = ref(false);

// Debug
const debugMessage = ref("");
const showDebugHelp = ref(false);

const toggleTheme = () => {
  theme.global.name.value = theme.global.current.value.dark ? "light" : "dark";
};

// Fonction pour basculer entre les modes normal et compact
const toggleCompactMode = () => {
  themeStore.toggleCompactMode();
};

// Initialiser le thème au chargement
onMounted(() => {
  themeStore.initialize();
});

// Fonctions pour ouvrir les modales
const openWelcomeModal = () => {
  welcomeModal.value = true;
};

const openStoreModal = () => {
  storeModal.value = true;
};

const openSocketModal = () => {
  socketModal.value = true;
};

const openHelpModal = () => {
  helpModal.value = true;
};

// Fonction pour ajouter un message de debug
const addDebugMessage = () => {
  if (debugMessage.value.trim()) {
    socketStore.addDebugMessage(debugMessage.value.trim());
    debugMessage.value = "";
  }
};

const hideDebugHelp = () => {
  if (!debugMessage.value.trim()) {
    showDebugHelp.value = false;
  }
};
</script>

<style>
/* Styles globaux */
:deep(.v-card-title) {
  font-size: var(--font-size-large);
  padding: var(--spacing-md) var(--spacing-lg);
}

:deep(.v-card-text) {
  padding: var(--spacing-md);
}

:deep(.v-container) {
  padding: var(--container-padding);
}

:deep(.v-dialog > .v-card > .v-card-text) {
  padding-top: 0;
}

:deep(.v-list-item) {
  min-height: auto;
}

:deep(.v-btn) {
  text-transform: none;
}

:deep(.v-table) {
  font-size: var(--font-size-base);
}

:deep(.v-data-table-header th) {
  font-size: var(--font-size-base) !important;
  padding: var(--spacing-xs) var(--spacing-sm) !important;
}

:deep(.v-data-table-row td) {
  font-size: var(--font-size-base) !important;
  padding: var(--spacing-xs) var(--spacing-sm) !important;
}

/* Ajustements des dimensions dans toute l'application avec transitions */
:deep(.v-input) {
  font-size: var(--font-size-base);
  transition: font-size 0.3s, padding 0.3s, margin 0.3s;
}

:deep(.v-btn) {
  font-size: var(--font-size-base);
  transition: font-size 0.3s, padding 0.3s, margin 0.3s;
}

:deep(.v-list-item-title) {
  font-size: var(--font-size-base);
  transition: font-size 0.3s;
}

:deep(.v-list-item-subtitle) {
  font-size: var(--font-size-small);
  transition: font-size 0.3s;
}

:deep(.v-dialog > .v-card) {
  padding: var(--spacing-sm);
  transition: padding 0.3s;
}

/* Réduire l'espace entre les composants */
:deep(.v-col) {
  padding: var(--spacing-xs);
  transition: padding 0.3s;
}

:deep(.v-row) {
  margin: 0 calc(-1 * var(--spacing-xs));
  transition: margin 0.3s;
}

/* Ajouter une indication visuelle pour le bouton de mode compact */
.v-btn.compact-mode-btn {
  position: relative;
}

.compact-mode-btn::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--v-theme-primary);
  opacity: 0;
  transition: opacity 0.3s;
}

.compact-mode .compact-mode-btn::after {
  opacity: 1;
}
</style>

<style scoped>
.debug-input-container {
  width: 300px;
}

.debug-input :deep(.v-field) {
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.debug-input :deep(.v-field__input) {
  color: white;
  font-size: 14px;
}

.debug-input :deep(.v-field__input::placeholder) {
  color: rgba(255, 255, 255, 0.7);
}

.debug-input :deep(.v-icon) {
  color: rgba(255, 255, 255, 0.8);
}
</style>