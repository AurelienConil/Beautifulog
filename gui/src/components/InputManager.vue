<template>
  <v-card class="ma-4">
    <v-card-title class="text-h5 d-flex align-center">
      <v-icon icon="mdi-connection" class="mr-2"></v-icon>
      Gestionnaire d'Entrées
    </v-card-title>

    <v-card-text>
      <!-- Vue d'ensemble des inputs -->
      <div class="mb-4">
        <h3 class="text-h6 mb-2">État des Entrées</h3>
        <v-row>
          <v-col
            v-for="input in inputsStatus"
            :key="input.name"
            cols="12"
            md="6"
            lg="4"
          >
            <v-card
              variant="outlined"
              :color="getInputCardColor(input.status)"
              class="pa-3"
            >
              <div class="d-flex align-center mb-2">
                <v-icon
                  :icon="getInputIcon(input.type)"
                  class="mr-2"
                  :color="getInputColor(input.status)"
                ></v-icon>
                <div>
                  <div class="font-weight-bold">{{ input.name }}</div>
                  <div class="text-caption">{{ input.type }}</div>
                </div>
                <v-spacer></v-spacer>
                <v-chip
                  :color="getInputColor(input.status)"
                  size="small"
                  variant="elevated"
                >
                  {{ getStatusLabel(input.status) }}
                </v-chip>
              </div>

              <!-- Détails de l'input -->
              <v-divider class="my-2"></v-divider>
              <div class="text-caption">
                <div v-if="input.config">
                  <div v-if="input.config.port">
                    Port: {{ input.config.port }}
                  </div>
                  <div v-if="input.config.baudRate">
                    Baud: {{ input.config.baudRate }}
                  </div>
                  <div
                    v-if="
                      input.config.availablePorts &&
                      input.config.availablePorts.length > 0
                    "
                  >
                    Ports disponibles: {{ input.config.availablePorts.length }}
                  </div>
                </div>
                <div>
                  Clients: {{ input.connectedClients }} | Messages:
                  {{ input.messagesReceived }}
                </div>
                <div v-if="input.uptime > 0" class="text-success">
                  Uptime: {{ formatDuration(input.uptime) }}
                </div>
                <div v-if="input.lastError" class="text-error">
                  Erreur: {{ input.lastError }}
                </div>
                <!-- Alerte spéciale pour les ports série -->
                <div
                  v-if="
                    input.type === 'SerialInput' &&
                    input.status !== 'connected' &&
                    (!input.config.availablePorts ||
                      input.config.availablePorts.length === 0)
                  "
                  class="text-warning mt-1"
                >
                  <v-icon icon="mdi-alert" size="small"></v-icon>
                  Aucun port série détecté
                </div>
              </div>

              <!-- Actions -->
              <v-divider class="my-2"></v-divider>
              <div class="d-flex gap-1">
                <v-btn
                  v-if="
                    input.status === 'error' || input.status === 'disconnected'
                  "
                  @click="restartInput(input.name)"
                  size="small"
                  color="primary"
                  variant="outlined"
                  :loading="restarting[input.name]"
                >
                  <v-icon icon="mdi-restart" size="small"></v-icon>
                  Redémarrer
                </v-btn>

                <!-- Bouton spécial pour configurer les ports série -->
                <v-btn
                  v-if="input.type === 'SerialInput'"
                  @click="showSerialConfig"
                  size="small"
                  color="purple"
                  variant="outlined"
                >
                  <v-icon icon="mdi-serial-port" size="small"></v-icon>
                  Ports Série
                </v-btn>

                <v-btn
                  @click="showInputDetails(input)"
                  size="small"
                  color="info"
                  variant="text"
                >
                  <v-icon icon="mdi-information" size="small"></v-icon>
                  Détails
                </v-btn>
              </div>
            </v-card>
          </v-col>
        </v-row>
      </div>

      <v-divider class="my-4"></v-divider>

      <!-- Statistiques globales -->
      <div class="mb-4">
        <h3 class="text-h6 mb-2">Statistiques Globales</h3>
        <v-row>
          <v-col cols="6" md="3">
            <v-card variant="outlined" class="text-center pa-2">
              <div class="text-h6">{{ totalMessages }}</div>
              <div class="text-caption">Messages totaux</div>
            </v-card>
          </v-col>
          <v-col cols="6" md="3">
            <v-card variant="outlined" class="text-center pa-2">
              <div class="text-h6 text-success">{{ connectedInputsCount }}</div>
              <div class="text-caption">Inputs connectés</div>
            </v-card>
          </v-col>
          <v-col cols="6" md="3">
            <v-card variant="outlined" class="text-center pa-2">
              <div class="text-h6 text-primary">{{ totalClients }}</div>
              <div class="text-caption">Clients totaux</div>
            </v-card>
          </v-col>
          <v-col cols="6" md="3">
            <v-card variant="outlined" class="text-center pa-2">
              <div class="text-h6">{{ inputsStatus.length }}</div>
              <div class="text-caption">Inputs configurés</div>
            </v-card>
          </v-col>
        </v-row>
      </div>

      <v-divider class="my-4"></v-divider>

      <!-- Actions globales -->
      <div class="mb-4">
        <h3 class="text-h6 mb-2">Actions</h3>
        <div class="d-flex gap-2 flex-wrap">
          <v-btn
            @click="refreshStatus"
            color="primary"
            variant="outlined"
            :loading="refreshing"
          >
            <v-icon icon="mdi-refresh" class="mr-1"></v-icon>
            Actualiser
          </v-btn>

          <v-btn
            @click="openBroadcastDialog"
            color="success"
            variant="outlined"
            :disabled="connectedInputsCount === 0"
          >
            <v-icon icon="mdi-broadcast" class="mr-1"></v-icon>
            Diffuser Message
          </v-btn>

          <v-btn @click="showAllClients" color="info" variant="outlined">
            <v-icon icon="mdi-account-group" class="mr-1"></v-icon>
            Voir Clients
          </v-btn>
        </div>
      </div>
    </v-card-text>

    <!-- Dialog pour les détails d'un input -->
    <v-dialog v-model="detailsDialog" max-width="600">
      <v-card v-if="selectedInput">
        <v-card-title> Détails - {{ selectedInput.name }} </v-card-title>
        <v-card-text>
          <pre>{{ JSON.stringify(selectedInput, null, 2) }}</pre>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="detailsDialog = false">Fermer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog pour diffuser un message -->
    <v-dialog v-model="broadcastDialog" max-width="500">
      <v-card>
        <v-card-title>Diffuser un Message</v-card-title>
        <v-card-text>
          <v-textarea
            v-model="broadcastMessage"
            label="Message à diffuser"
            placeholder="[Test] Message de test depuis le gestionnaire"
            rows="3"
          ></v-textarea>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="broadcastDialog = false">Annuler</v-btn>
          <v-btn @click="sendBroadcast" color="primary" :loading="broadcasting">
            Envoyer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog pour voir tous les clients -->
    <v-dialog v-model="clientsDialog" max-width="700">
      <v-card>
        <v-card-title>Clients Connectés</v-card-title>
        <v-card-text>
          <div v-for="input in inputsStatus" :key="input.name">
            <h4 class="mb-2">{{ input.name }}</h4>
            <v-table v-if="input.clients && input.clients.length > 0">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Connecté depuis</th>
                  <th>Dernier message</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="client in input.clients" :key="client.id">
                  <td>{{ client.id }}</td>
                  <td>{{ formatTime(client.connectedAt) }}</td>
                  <td>
                    {{
                      client.lastMessageAt
                        ? formatTime(client.lastMessageAt)
                        : "Aucun"
                    }}
                  </td>
                </tr>
              </tbody>
            </v-table>
            <div v-else class="text-grey">Aucun client connecté</div>
            <v-divider class="my-3"></v-divider>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="clientsDialog = false">Fermer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog pour la configuration des ports série -->
    <v-dialog v-model="serialConfigDialog" max-width="900">
      <SerialPortManager />
    </v-dialog>
  </v-card>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import SerialPortManager from "./SerialPortManager.vue";

// État local
const inputsStatus = ref([]);
const refreshing = ref(false);
const restarting = ref({});

// Dialogs
const detailsDialog = ref(false);
const broadcastDialog = ref(false);
const clientsDialog = ref(false);
const serialConfigDialog = ref(false);
const selectedInput = ref(null);
const broadcastMessage = ref("[Test] Message de test depuis le gestionnaire");
const broadcasting = ref(false);

// Timer pour actualisation automatique
let refreshTimer = null;

// Computed
const totalMessages = computed(() => {
  return inputsStatus.value.reduce(
    (total, input) => total + input.messagesReceived,
    0
  );
});

const connectedInputsCount = computed(() => {
  return inputsStatus.value.filter((input) => input.status === "connected")
    .length;
});

const totalClients = computed(() => {
  return inputsStatus.value.reduce(
    (total, input) => total + input.connectedClients,
    0
  );
});

// Méthodes
const getInputIcon = (type) => {
  switch (type) {
    case "SocketInput":
      return "mdi-lan";
    case "SerialInput":
      return "mdi-serial-port";
    default:
      return "mdi-connection";
  }
};

const getInputColor = (status) => {
  switch (status) {
    case "connected":
      return "success";
    case "connecting":
      return "warning";
    case "error":
      return "error";
    case "disconnected":
      return "grey";
    default:
      return "grey";
  }
};

const getInputCardColor = (status) => {
  switch (status) {
    case "connected":
      return "success-lighten-5";
    case "error":
      return "error-lighten-5";
    case "connecting":
      return "warning-lighten-5";
    default:
      return "";
  }
};

const getStatusLabel = (status) => {
  switch (status) {
    case "connected":
      return "Connecté";
    case "connecting":
      return "Connexion...";
    case "error":
      return "Erreur";
    case "disconnected":
      return "Déconnecté";
    default:
      return "Inconnu";
  }
};

const formatDuration = (ms) => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

const formatTime = (timestamp) => {
  if (!timestamp) return "Jamais";
  return new Date(timestamp).toLocaleTimeString();
};

const refreshStatus = async () => {
  refreshing.value = true;
  try {
    const status = await window.electronAPI.inputs.getStatus();

    // Charger les clients pour chaque input
    for (const input of status) {
      try {
        const clients = await window.electronAPI.inputs.getClients(input.name);
        input.clients = clients;
      } catch (error) {
        input.clients = [];
      }
    }

    inputsStatus.value = status;
  } catch (error) {
    console.error("Erreur lors de l'actualisation:", error);
  } finally {
    refreshing.value = false;
  }
};

const restartInput = async (inputName) => {
  restarting.value[inputName] = true;
  try {
    const result = await window.electronAPI.inputs.restart(inputName);
    if (result.success) {
      // Actualiser le statut après un court délai
      setTimeout(refreshStatus, 1000);
    } else {
      console.error("Échec du redémarrage:", result.message);
    }
  } catch (error) {
    console.error("Erreur lors du redémarrage:", error);
  } finally {
    restarting.value[inputName] = false;
  }
};

const showInputDetails = (input) => {
  selectedInput.value = input;
  detailsDialog.value = true;
};

const openBroadcastDialog = () => {
  broadcastDialog.value = true;
};

const sendBroadcast = async () => {
  broadcasting.value = true;
  try {
    const result = await window.electronAPI.inputs.broadcast(
      broadcastMessage.value
    );
    if (result.success) {
      console.log("Message diffusé:", result.results);
    } else {
      console.error("Échec de la diffusion:", result.message);
    }
    broadcastDialog.value = false;
  } catch (error) {
    console.error("Erreur lors de la diffusion:", error);
  } finally {
    broadcasting.value = false;
  }
};

const showAllClients = async () => {
  // Actualiser les clients avant d'afficher
  await refreshStatus();
  clientsDialog.value = true;
};

const showSerialConfig = () => {
  serialConfigDialog.value = true;
};

// Lifecycle
onMounted(() => {
  refreshStatus();
  // Actualiser toutes les 5 secondes
  refreshTimer = setInterval(refreshStatus, 5000);
});

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
});
</script>

<style scoped>
.variables-container {
  max-height: 100px;
  overflow-y: auto;
}
</style>