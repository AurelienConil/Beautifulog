<template>
  <v-container fluid class="dynamic-table pa-4">
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex justify-space-between align-center">
            <span>Vue des Logs par Process</span>
            <div class="d-flex align-center">
              <v-chip color="primary" size="small" class="mr-2">
                {{ uniqueLabels.length }} process{{
                  uniqueLabels.length > 1 ? "us" : ""
                }}
              </v-chip>
              <v-btn
                icon="mdi-refresh"
                size="small"
                @click="refreshData"
                variant="text"
              />
              <v-btn
                icon="mdi-delete-sweep"
                size="small"
                @click="clearAllMessages"
                variant="text"
                color="error"
              />
            </div>
          </v-card-title>
        </v-card>
      </v-col>
    </v-row>

    <v-row v-if="uniqueLabels.length === 0" class="mt-4">
      <v-col cols="12">
        <v-card class="text-center pa-8">
          <v-icon size="64" color="grey-lighten-1" class="mb-4">
            mdi-inbox-outline
          </v-icon>
          <h3 class="text-grey-darken-1 mb-2">Aucun message reçu</h3>
          <p class="text-grey">
            Les messages avec différents labels apparaîtront ici sous forme de
            colonnes
          </p>
        </v-card>
      </v-col>
    </v-row>

    <v-row v-else class="mt-4">
      <v-col
        v-for="label in uniqueLabels"
        :key="label"
        :cols="getColumnSize()"
        class="column-container"
      >
        <div class="log-column">
          <LogView :label="label" />
        </div>
      </v-col>
    </v-row>

    <!-- Statistiques -->
    <v-row class="mt-4">
      <v-col cols="12">
        <v-card>
          <v-card-title>Statistiques</v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="3">
                <v-card variant="outlined" class="text-center pa-3">
                  <div class="text-h4 text-primary">
                    {{ socketStore.messageCount }}
                  </div>
                  <div class="text-caption">Total Messages</div>
                </v-card>
              </v-col>
              <v-col cols="3">
                <v-card variant="outlined" class="text-center pa-3">
                  <div class="text-h4 text-error">{{ errorCount }}</div>
                  <div class="text-caption">Erreurs</div>
                </v-card>
              </v-col>
              <v-col cols="3">
                <v-card variant="outlined" class="text-center pa-3">
                  <div class="text-h4 text-success">
                    {{ socketStore.serverStatus.connectedClients }}
                  </div>
                  <div class="text-caption">Clients Connectés</div>
                </v-card>
              </v-col>
              <v-col cols="3">
                <v-card variant="outlined" class="text-center pa-3">
                  <div class="text-h4 text-info">{{ uniqueLabels.length }}</div>
                  <div class="text-caption">Process Actifs</div>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from "vue";
import { useSocketStore } from "../stores/socket.js";
import LogView from "./LogView.vue";

const socketStore = useSocketStore();

// Labels uniques extraits des messages
const uniqueLabels = computed(() => {
  const labels = new Set();
  socketStore.messages.forEach((message) => {
    if (message.label) {
      labels.add(message.label);
    }
  });
  return Array.from(labels).sort();
});

// Nombre d'erreurs total
const errorCount = computed(() => {
  return socketStore.messages.filter((msg) => msg.type === "error-message")
    .length;
});

// Calcul dynamique de la taille des colonnes
const getColumnSize = () => {
  const labelCount = uniqueLabels.value.length;
  if (labelCount === 0) return 12;
  if (labelCount === 1) return 12;
  if (labelCount === 2) return 6;
  if (labelCount === 3) return 4;
  if (labelCount <= 6) return 4;
  return 3; // Pour plus de 6 colonnes
};

// Actions
const refreshData = async () => {
  await socketStore.updateServerStatus();
};

const clearAllMessages = () => {
  if (confirm("Êtes-vous sûr de vouloir effacer tous les messages ?")) {
    socketStore.clearMessages();
  }
};

// Lifecycle
onMounted(() => {
  console.log("DynamicTable monté");
  // Initialiser les écouteurs si ce n'est pas déjà fait
  socketStore.initializeSocketListeners();
});

onUnmounted(() => {
  console.log("DynamicTable démonté");
});
</script>

<style scoped>
.dynamic-table {
  min-height: 100%;
  /* Suppression de height: 100vh et overflow-y: auto */
}

.column-container {
  height: 600px;
  padding: 8px;
}

.log-column {
  height: 100%;
  width: 100%;
}

/* Responsive design pour mobile */
@media (max-width: 768px) {
  .column-container {
    height: 400px;
  }
}

/* Animation pour les nouvelles colonnes */
.v-col {
  transition: all 0.3s ease-in-out;
}

/* Style pour les cartes de statistiques */
.v-card.v-card--outlined {
  transition: all 0.2s ease-in-out;
}

.v-card.v-card--outlined:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}
</style>
