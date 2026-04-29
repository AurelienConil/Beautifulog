<template>
  <v-container fluid class="dynamic-table pa-0 my-0" >

    <v-row v-if="uniqueLabels.length === 0" class="mt-0 py-0 border-lg">
      <v-col cols="12" class="pt-2">
        <v-card class="text-center pa-4">
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

    <v-row v-else class="mt-0 py-1 ">
      <v-col
        v-for="label in uniqueLabels"
        :key="label"
        :cols="getColumnSize()"
        class="column-container my-0 py-0"
      >
        <div class="log-column">
          <LogView :label="label" @hide="hideLabel" />
        </div>
      </v-col>
    </v-row>

    <!-- Bannière pour afficher les labels masqués -->
    <v-row v-if="getHiddenLabelsInMessages.length > 0" class="mt-2">
      <v-col cols="12">
        <v-alert
          variant="tonal"
          color="info"
          density="compact"
          class="hidden-labels-alert"
        >
          <div class="d-flex align-center flex-wrap">
            <span class="mr-2">Labels masqués:</span>
            <v-chip
              v-for="label in getHiddenLabelsInMessages"
              :key="label"
              size="small"
              class="ma-1"
              closable
              @click:close="
                hiddenLabels = hiddenLabels.filter((l) => l !== label)
              "
            >
              {{ label }}
            </v-chip>
          </div>
        </v-alert>
      </v-col>
    </v-row>

    <!-- Statistiques -->
    <v-row class="mt-4" v-if="socketStore.debugMode">
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
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useSocketStore } from "../stores/socket.js";
import LogView from "./LogView.vue";

const socketStore = useSocketStore();

// Stocker l'ordre d'apparition des labels
const labelOrder = ref([]);

// Stocker les labels masqués temporairement
const hiddenLabels = ref([]);

// Suivre les nouveaux messages pour capturer les nouveaux labels dans leur ordre d'apparition
watch(
  () => socketStore.recentMessages.length,
  () => {
    // Vérifier s'il y a des nouveaux messages
    if (socketStore.recentMessages.length > 0) {
      // Prendre le dernier message ajouté (le plus récent)
      const latestMessage = socketStore.latestMessage;
      if (latestMessage && latestMessage.label) {
        // Si le label n'est pas encore dans l'ordre, l'ajouter
        if (!labelOrder.value.includes(latestMessage.label)) {
          // Ajouter le nouveau label à la fin de l'ordre (à droite)
          labelOrder.value.push(latestMessage.label);
        }
      }
    }
  }
);

// Labels uniques extraits des messages, en préservant l'ordre d'apparition et en excluant les labels masqués
const uniqueLabels = computed(() => {
  // Récupérer tous les labels disponibles dans le store
  const currentLabels = new Set(socketStore.getAvailableLabels);

  // Filtrer labelOrder pour ne garder que les labels qui existent encore
  // et ajouter les nouveaux labels qui pourraient ne pas être dans labelOrder
  const result = [
    // D'abord les labels connus dans leur ordre d'apparition
    ...labelOrder.value.filter((label) => currentLabels.has(label)),
    // Ensuite les nouveaux labels qui ne sont pas dans labelOrder
    ...Array.from(currentLabels).filter(
      (label) => !labelOrder.value.includes(label)
    ),
  ];

  // Filtrer les labels masqués
  return result.filter((label) => !hiddenLabels.value.includes(label));
});

// Nombre d'erreurs total
const errorCount = computed(() => {
  return socketStore.recentMessages.filter(
    (msg) => msg.type === "error-message"
  ).length;
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

// Fonction pour masquer temporairement un label
const hideLabel = (label) => {
  hiddenLabels.value.push(label);
};

// Fonction pour vérifier si un label est dans les messages actuels mais masqué
const getHiddenLabelsInMessages = computed(() => {
  // Récupérer tous les labels des messages actuels
  const currentLabels = new Set(socketStore.getAvailableLabels);

  // Retourner les labels qui sont à la fois dans les messages et dans hiddenLabels
  return hiddenLabels.value.filter((label) => currentLabels.has(label));
});

// Lifecycle
onMounted(() => {
  console.log("DynamicTable monté");

  // Initialiser les écouteurs si ce n'est pas déjà fait
  socketStore.initializeSocketListeners();

  // Initialiser labelOrder avec les labels existants lors du montage
  // pour préserver l'ordre actuel et ne pas tout réorganiser
  const existingLabels = socketStore.getAvailableLabels;
  existingLabels.forEach((label) => {
    if (!labelOrder.value.includes(label)) {
      labelOrder.value.push(label);
    }
  });

  console.log(
    "DynamicTable Valeur initiale de IPCActivated:",
    socketStore.IPCActivated
  );
  console.log("Store complet :", socketStore);
});

onUnmounted(() => {
  console.log("DynamicTable démonté");
});
</script>

<style scoped>
.title-bar {
  font-size: medium;
  margin: 1px;
  padding: 5px;
}

.dynamic-table {
  margin-top: 0px;
  margin-bottom: 0px;
  height: 95%;
  display: flex;
  flex-direction: column;
}

.column-container {
  height: 70vh; /* Utiliser vh plutôt qu'une hauteur fixe en pixels */
  padding: 8px;
  /* Empêcher le débordement */
  overflow: hidden;
}

.log-column {
  height: 100%;
  width: 100%;
  /* Contenir la log-view dans la hauteur disponible */
  max-height: 100%;
  overflow: hidden;
}

.hidden-labels-alert {
  margin-bottom: 8px;
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
