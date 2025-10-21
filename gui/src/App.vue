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

      <!-- Toggle debug mode -->
      <v-btn icon @click="socketStore.toggleDebugMode" class="mr-2">
        <v-icon :color="socketStore.debugMode ? 'warning' : 'default'">
          mdi-bug
        </v-icon>
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
import { ref, computed } from "vue";
import { useTheme } from "vuetify";
import { useSocketStore } from "./stores/socket.js";
import WelcomeCard from "./components/WelcomeCard.vue";
import FeatureCard from "./components/FeatureCard.vue";
import SocketManager from "./components/SocketManager.vue";
import StoreViewer from "./components/StoreViewer.vue";
import DynamicTable from "./components/DynamicTable.vue";

const theme = useTheme();
const isDark = computed(() => theme.global.name.value === "dark");

// Store
const socketStore = useSocketStore();

// Gestion des modales
const welcomeModal = ref(false);
const storeModal = ref(false);
const socketModal = ref(false);

// Debug
const debugMessage = ref("");

const toggleTheme = () => {
  theme.global.name.value = theme.global.current.value.dark ? "light" : "dark";
};

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

// Fonction pour ajouter un message de debug
const addDebugMessage = () => {
  if (debugMessage.value.trim()) {
    socketStore.addDebugMessage(debugMessage.value.trim());
    debugMessage.value = "";
  }
};
</script>

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