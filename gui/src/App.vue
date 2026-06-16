<template>
  <v-app>
    <v-app-bar app color="primary" dark density="compact">
      <v-app-bar-title>
        <v-icon left>mdi-file-document-outline</v-icon>
        BeautifuLog
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

      <!-- Contrôles logs principaux (issus de DynamicTable) -->
      <v-chip color="primary" size="small" class="mr-2">
        {{ uniqueLabels && uniqueLabels.length ? uniqueLabels.length : 0 }}
        process{{ uniqueLabels && uniqueLabels.length > 1 ? "us" : "" }}
      </v-chip>
      <v-btn
        icon="mdi-refresh"
        size="small"
        @click="refreshData"
        variant="text"
        class="mr-1"
      />
      <v-btn
        icon="mdi-delete-sweep"
        size="small"
        @click="clearAllMessages"
        variant="text"
        color="error"
        class="mr-1"
      />
      <v-btn
        :icon="socketStore.IPCActivated ? 'mdi-pause' : 'mdi-play'"
        size="small"
        @click="socketStore.toggleIPCReception(!socketStore.IPCActivated)"
        :color="socketStore.IPCActivated ? 'warning' : 'success'"
        variant="text"
        class="mr-1"
      />
      <span class="ml-2 mr-2">{{
        socketStore.IPCActivated ? "IPC Actif" : "IPC Inactif"
      }}</span>
      <v-slider
        v-if="!socketStore.IPCActivated"
        v-model="socketStore.maxTimestampValue"
        :min="socketStore.timeStampAtStop - 10000"
        :max="socketStore.timeStampAtStop"
        density="compact"
        label="go back in time"
        class="my-0 py-0 ml-4"
        style="max-width: 200px; min-width: 120px"
      />
    </v-app-bar>

    <v-main>
      <v-container fluid class="fillheight">
        <DynamicTable />
      </v-container>
    </v-main>

    <!-- Composant DebugHelp -->
    <DebugHelp :visible="helpModal" @close="helpModal = false" />

    <!-- Modal Performance Monitor -->
    <v-dialog v-model="showPerformanceModal" max-width="1000px" persistent>
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          <span>Performance Monitor</span>
          <v-btn icon @click="showPerformanceModal = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text class="pa-4">
          <PerformanceMonitor />
        </v-card-text>
      </v-card>
    </v-dialog>

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

    <!-- Modal InputManager -->
    <v-dialog
      v-model="socketModal"
      max-width="90vw"
      max-height="90vh"
      scrollable
    >
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          <span>Gestionnaire d'Entrées</span>
          <v-btn icon @click="socketModal = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text class="pa-0">
          <InputManager />
          <v-divider class="my-4"></v-divider>
          <SocketManager />
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useTheme } from "vuetify";
import { useSocketStore } from "./stores/socket.js";
import { useThemeStore } from "./stores/theme.js";
import WelcomeCard from "./components/WelcomeCard.vue";
import FeatureCard from "./components/FeatureCard.vue";
import SocketManager from "./components/SocketManager.vue";
import InputManager from "./components/InputManager.vue";
import StoreViewer from "./components/StoreViewer.vue";
import DynamicTable from "./components/DynamicTable.vue";
import DebugHelp from "./components/DebugHelp.vue";
import PerformanceMonitor from "./components/PerformanceMonitor.vue";

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
const showPerformanceModal = ref(false);

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

// Initialiser au chargement
onMounted(() => {
  themeStore.initialize();
  socketStore.initializeInputListeners();
});

// Cleanup lors du démontage
onUnmounted(() => {
  socketStore.cleanup();
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
  helpModal.value = false;
  if (debugMessage.value.trim()) {
    socketStore.addDebugMessage(debugMessage.value.trim());
    debugMessage.value = "";
  }
};

const clearAllMessages = () => {
  console.log("Clearing all messages...");
  socketStore.clearMessages();
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

.fillheight {
  height: 100%;
  margin-top: 0px;
  padding-top: 0px;
}
</style>