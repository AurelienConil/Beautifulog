<template>
  <v-card class="ma-4">
    <v-card-title class="text-h6">
      <v-icon icon="mdi-database" class="mr-2"></v-icon>
      Store Socket.IO - Vue des données
    </v-card-title>

    <v-card-text>
      <!-- Statistiques rapides -->
      <div class="mb-4">
        <v-row>
          <v-col cols="12" md="6">
            <v-card variant="outlined" class="pa-3">
              <h4>Serveur</h4>
              <p>
                <strong>Status:</strong>
                {{ socketStore.isServerRunning ? "En ligne" : "Hors ligne" }}
              </p>
              <p><strong>Port:</strong> {{ socketStore.serverStatus.port }}</p>
              <p>
                <strong>Clients connectés:</strong>
                {{ socketStore.serverStatus.connectedClients }}
              </p>
            </v-card>
          </v-col>
          <v-col cols="12" md="6">
            <v-card variant="outlined" class="pa-3">
              <h4>Messages</h4>
              <p><strong>Total:</strong> {{ socketStore.messageCount }}</p>
              <p><strong>Logs:</strong> {{ socketStore.logMessages.length }}</p>
              <p>
                <strong>Erreurs:</strong> {{ socketStore.errorMessages.length }}
              </p>
              <p>
                <strong>Événements:</strong>
                {{ socketStore.connectionHistory.length }}
              </p>
            </v-card>
          </v-col>
        </v-row>
      </div>

      <!-- Dernier message -->
      <div v-if="socketStore.latestMessage" class="mb-4">
        <h4>Dernier message reçu</h4>
        <v-card variant="outlined" class="pa-3">
          <p><strong>Type:</strong> {{ socketStore.latestMessage.type }}</p>
          <p>
            <strong>Heure:</strong>
            {{ formatTime(socketStore.latestMessage.timestamp) }}
          </p>
          <p>
            <strong>Client:</strong> {{ socketStore.latestMessage.socketId }}
          </p>
          <pre class="text-caption">{{
            JSON.stringify(socketStore.latestMessage.msg, null, 2)
          }}</pre>
        </v-card>
      </div>

      <!-- Actions rapides -->
      <div class="d-flex gap-2">
        <v-btn
          @click="refreshStore"
          color="primary"
          variant="outlined"
          size="small"
        >
          <v-icon icon="mdi-refresh" class="mr-1"></v-icon>
          Actualiser
        </v-btn>

        <v-btn
          @click="logStoreState"
          color="info"
          variant="outlined"
          size="small"
        >
          <v-icon icon="mdi-console" class="mr-1"></v-icon>
          Log Store
        </v-btn>

        <v-btn
          @click="clearStore"
          color="warning"
          variant="outlined"
          size="small"
        >
          <v-icon icon="mdi-delete" class="mr-1"></v-icon>
          Vider Store
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { onMounted } from "vue";
import { useSocketStore } from "../stores/socket.js";

const socketStore = useSocketStore();

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString();
};

const refreshStore = async () => {
  await socketStore.updateServerStatus();
};

const logStoreState = () => {
  console.log("=== État du Store Socket.IO ===");
  console.log("Serveur:", socketStore.serverStatus);
  console.log("Messages:", socketStore.messages);
  console.log("Historique des connexions:", socketStore.connectionHistory);
  console.log("Statistiques:", socketStore.getStatistics);
};

const clearStore = () => {
  socketStore.clearAll();
};

onMounted(async () => {
  console.log("StoreViewer monté");
  await refreshStore();
});
</script>

<style scoped>
pre {
  background-color: #f5f5f5;
  padding: 8px;
  border-radius: 4px;
  max-height: 100px;
  overflow-y: auto;
}

.gap-2 {
  gap: 8px;
}
</style>