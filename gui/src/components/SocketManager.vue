<template>
  <v-card class="ma-4">
    <v-card-title class="text-h5 d-flex align-center">
      <v-icon icon="mdi-lan" class="mr-2"></v-icon>
      Serveur Socket.IO
    </v-card-title>

    <v-card-text>
      <div class="mb-4">
        <v-chip
          :color="socketStore.isServerRunning ? 'success' : 'error'"
          variant="elevated"
          class="mr-2"
        >
          <v-icon
            :icon="
              socketStore.isServerRunning
                ? 'mdi-check-circle'
                : 'mdi-close-circle'
            "
            class="mr-1"
          ></v-icon>
          {{ socketStore.isServerRunning ? "En ligne" : "Hors ligne" }}
        </v-chip>

        <v-chip
          v-if="socketStore.isServerRunning"
          color="info"
          variant="outlined"
        >
          Port: {{ socketStore.serverStatus.port }}
        </v-chip>

        <v-chip
          v-if="socketStore.isServerRunning"
          color="primary"
          variant="outlined"
          class="ml-2"
        >
          Clients: {{ socketStore.serverStatus.connectedClients }}
        </v-chip>
      </div>

      <v-divider class="my-4"></v-divider>

      <!-- Statistiques du store -->
      <div class="mb-4">
        <h3 class="text-h6 mb-2">Statistiques</h3>
        <v-row>
          <v-col cols="6" md="3">
            <v-card variant="outlined" class="text-center pa-2">
              <div class="text-h6">{{ socketStore.messageCount }}</div>
              <div class="text-caption">Messages totaux</div>
            </v-card>
          </v-col>
          <v-col cols="6" md="3">
            <v-card variant="outlined" class="text-center pa-2">
              <div class="text-h6 text-success">
                {{ socketStore.logMessages.length }}
              </div>
              <div class="text-caption">Logs</div>
            </v-card>
          </v-col>
          <v-col cols="6" md="3">
            <v-card variant="outlined" class="text-center pa-2">
              <div class="text-h6 text-error">
                {{ socketStore.errorMessages.length }}
              </div>
              <div class="text-caption">Erreurs</div>
            </v-card>
          </v-col>
          <v-col cols="6" md="3">
            <v-card variant="outlined" class="text-center pa-2">
              <div class="text-h6">
                {{ socketStore.connectionHistory.length }}
              </div>
              <div class="text-caption">Événements</div>
            </v-card>
          </v-col>
        </v-row>
      </div>

      <v-divider class="my-4"></v-divider>

      <!-- Section des messages récents -->
      <div class="mb-4">
        <h3 class="text-h6 mb-2">
          Messages récents ({{ socketStore.recentMessages.length }})
        </h3>
        <v-sheet
          height="200"
          class="overflow-y-auto pa-2"
          color="grey-lighten-5"
        >
          <div
            v-if="socketStore.recentMessages.length === 0"
            class="text-center text-grey"
          >
            Aucun message reçu
          </div>
          <v-card
            v-for="message in socketStore.recentMessages"
            :key="message.id"
            class="mb-2 pa-2"
            variant="outlined"
          >
            <div class="d-flex justify-space-between align-center">
              <div class="d-flex align-center">
                <v-chip
                  :color="getMessageTypeColor(message.type)"
                  size="small"
                  variant="elevated"
                  class="mr-2"
                >
                  {{ message.type }}
                </v-chip>
                <v-chip
                  v-if="message.format === 'variable'"
                  color="purple"
                  size="small"
                  variant="outlined"
                >
                  Variables
                </v-chip>
              </div>
              <small class="text-grey">{{
                formatTime(message.timestamp)
              }}</small>
            </div>
            <div class="mt-1">
              <template v-if="message.format === 'variable'">
                <div>{{ message.msg }}</div>
                <div class="mt-1 variables-container">
                  <v-chip
                    v-for="(value, name) in message.variables"
                    :key="name"
                    color="purple-lighten-5"
                    size="small"
                    class="mr-1 mb-1"
                  >
                    {{ name }}: {{ value }}
                  </v-chip>
                </div>
              </template>
              <template v-else>
                {{ JSON.stringify(message.msg) }}
              </template>
            </div>
            <small class="text-grey">Client: {{ message.socketId }}</small>
          </v-card>
        </v-sheet>
      </div>

      <!-- Section pour envoyer des messages -->
      <div class="mb-4">
        <h3 class="text-h6 mb-2">Diffuser un message</h3>
        <v-row>
          <v-col cols="8">
            <v-text-field
              v-model="broadcastMessage"
              label="Message à diffuser"
              variant="outlined"
              density="compact"
            ></v-text-field>
          </v-col>
          <v-col cols="4">
            <v-btn
              @click="sendBroadcast"
              :disabled="
                !broadcastMessage.trim() || !socketStore.isServerRunning
              "
              color="primary"
              block
            >
              Diffuser
            </v-btn>
          </v-col>
        </v-row>
      </div>

      <!-- Boutons de contrôle -->
      <div class="d-flex gap-2">
        <v-btn @click="refreshStatus" color="primary" variant="outlined">
          <v-icon icon="mdi-refresh" class="mr-1"></v-icon>
          Actualiser
        </v-btn>

        <v-btn @click="clearMessages" color="warning" variant="outlined">
          <v-icon icon="mdi-delete" class="mr-1"></v-icon>
          Effacer messages
        </v-btn>

        <v-btn @click="clearAll" color="error" variant="outlined">
          <v-icon icon="mdi-delete-sweep" class="mr-1"></v-icon>
          Tout effacer
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useSocketStore } from "../stores/socket.js";

// Utilisation du store
const socketStore = useSocketStore();

// État local pour l'interface uniquement
const broadcastMessage = ref("");

// Méthodes
const refreshStatus = async () => {
  await socketStore.updateServerStatus();
};

const sendBroadcast = async () => {
  if (!broadcastMessage.value.trim()) return;

  const result = await socketStore.broadcastMessage(broadcastMessage.value);
  if (result.success) {
    console.log("Message diffusé avec succès");
    broadcastMessage.value = "";
  } else {
    console.error("Erreur lors de la diffusion:", result.message);
  }
};

const clearMessages = () => {
  socketStore.clearMessages();
};

const clearAll = () => {
  socketStore.clearAll();
};

const getMessageTypeColor = (type) => {
  switch (type) {
    case "log-message":
      return "success";
    case "error-message":
      return "error";
    case "variable-message":
      return "purple"; // Nouvelle couleur pour les messages de type variable
    default:
      return "info";
  }
};

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString();
};

// Lifecycle hooks
onMounted(async () => {
  console.log("SocketManager monté, initialisation du store...");

  // Initialiser les écouteurs du store
  socketStore.initializeSocketListeners();

  // Actualiser le statut du serveur
  await refreshStatus();
});

onUnmounted(() => {
  console.log("SocketManager démonté, nettoyage...");
  // Le store gère le nettoyage via sa méthode cleanup
  socketStore.cleanup();
});
</script>

<style scoped>
.gap-2 {
  gap: 8px;
}
</style>