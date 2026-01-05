<template>
  <v-card class="ma-4">
    <v-card-title class="text-h5 d-flex align-center">
      <v-icon icon="mdi-serial-port" class="mr-2"></v-icon>
      Gestionnaire de Ports Série
    </v-card-title>

    <v-card-text>
      <!-- Statut actuel -->
      <div class="mb-4">
        <h3 class="text-h6 mb-2">Statut Actuel</h3>
        <v-alert
          v-if="currentStatus"
          :type="getAlertType(currentStatus.status)"
          variant="tonal"
          class="mb-3"
        >
          <div class="d-flex align-center">
            <v-icon
              :icon="getStatusIcon(currentStatus.status)"
              class="mr-2"
            ></v-icon>
            <div>
              <div class="font-weight-bold">
                {{ getStatusText(currentStatus.status) }}
              </div>
              <div class="text-caption">
                <span v-if="currentStatus.config && currentStatus.config.port">
                  Port: {{ currentStatus.config.port }}
                </span>
                <span
                  v-if="currentStatus.config && currentStatus.config.baudRate"
                >
                  | Baud: {{ currentStatus.config.baudRate }}
                </span>
                <span v-if="currentStatus.lastError">
                  | Erreur: {{ currentStatus.lastError }}
                </span>
              </div>
            </div>
          </div>
        </v-alert>
      </div>

      <v-divider class="my-4"></v-divider>

      <!-- Liste des ports disponibles -->
      <div class="mb-4">
        <div class="d-flex align-center mb-2">
          <h3 class="text-h6">Ports Série Disponibles</h3>
          <v-spacer></v-spacer>
          <v-btn
            @click="refreshPorts"
            size="small"
            variant="outlined"
            :loading="refreshingPorts"
          >
            <v-icon icon="mdi-refresh" size="small"></v-icon>
            Actualiser
          </v-btn>
        </div>

        <v-alert v-if="portsError" type="error" variant="tonal" class="mb-3">
          {{ portsError }}
        </v-alert>

        <v-alert
          v-else-if="availablePorts.length === 0"
          type="info"
          variant="tonal"
          class="mb-3"
        >
          <v-icon icon="mdi-information" class="mr-2"></v-icon>
          Aucun port série détecté. Vérifiez qu'un périphérique série (Arduino,
          ESP32, etc.) est connecté.
        </v-alert>

        <v-row v-else>
          <v-col
            v-for="port in availablePorts"
            :key="port.path"
            cols="12"
            md="6"
          >
            <v-card
              variant="outlined"
              :color="isCurrentPort(port.path) ? 'primary' : ''"
              class="pa-3"
            >
              <div class="d-flex align-center mb-2">
                <v-icon icon="mdi-usb-port" class="mr-2" size="large"></v-icon>
                <div class="flex-grow-1">
                  <div class="font-weight-bold">{{ port.path }}</div>
                  <div class="text-caption text-medium-emphasis">
                    {{ port.manufacturer || "Fabricant inconnu" }}
                  </div>
                  <div class="text-caption" v-if="port.productId">
                    PID: {{ port.productId }} | VID: {{ port.vendorId }}
                  </div>
                </div>
                <v-chip
                  v-if="isCurrentPort(port.path)"
                  color="primary"
                  size="small"
                  variant="elevated"
                >
                  <v-icon icon="mdi-check" size="small"></v-icon>
                  Connecté
                </v-chip>
              </div>

              <v-divider class="my-2"></v-divider>

              <div class="d-flex gap-2">
                <v-btn
                  @click="connectToPort(port.path)"
                  :disabled="connecting || isCurrentPort(port.path)"
                  :loading="connecting && connectingToPort === port.path"
                  color="primary"
                  size="small"
                  variant="elevated"
                >
                  <v-icon
                    icon="mdi-connection"
                    size="small"
                    class="mr-1"
                  ></v-icon>
                  {{ isCurrentPort(port.path) ? "Connecté" : "Connecter" }}
                </v-btn>

                <v-btn
                  @click="openPortConfig(port)"
                  size="small"
                  variant="outlined"
                >
                  <v-icon icon="mdi-cog" size="small" class="mr-1"></v-icon>
                  Configurer
                </v-btn>
              </div>
            </v-card>
          </v-col>
        </v-row>
      </div>

      <v-divider class="my-4"></v-divider>

      <!-- Configuration globale -->
      <div class="mb-4">
        <h3 class="text-h6 mb-2">Configuration Par Défaut</h3>
        <v-row>
          <v-col cols="12" md="3">
            <v-select
              v-model="defaultConfig.baudRate"
              :items="baudRates"
              label="Baud Rate"
              variant="outlined"
              density="compact"
            ></v-select>
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="defaultConfig.dataBits"
              :items="dataBitsOptions"
              label="Data Bits"
              variant="outlined"
              density="compact"
            ></v-select>
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="defaultConfig.stopBits"
              :items="stopBitsOptions"
              label="Stop Bits"
              variant="outlined"
              density="compact"
            ></v-select>
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="defaultConfig.parity"
              :items="parityOptions"
              label="Parité"
              variant="outlined"
              density="compact"
            ></v-select>
          </v-col>
        </v-row>

        <v-btn
          @click="saveDefaultConfig"
          color="success"
          variant="outlined"
          :loading="savingConfig"
        >
          <v-icon icon="mdi-content-save" class="mr-1"></v-icon>
          Sauvegarder Configuration
        </v-btn>
      </div>
    </v-card-text>

    <!-- Dialog de configuration de port -->
    <v-dialog v-model="configDialog" max-width="500">
      <v-card v-if="selectedPort">
        <v-card-title> Configuration - {{ selectedPort.path }} </v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12">
              <v-select
                v-model="portConfig.baudRate"
                :items="baudRates"
                label="Baud Rate"
                variant="outlined"
              ></v-select>
            </v-col>
            <v-col cols="6">
              <v-select
                v-model="portConfig.dataBits"
                :items="dataBitsOptions"
                label="Data Bits"
                variant="outlined"
              ></v-select>
            </v-col>
            <v-col cols="6">
              <v-select
                v-model="portConfig.stopBits"
                :items="stopBitsOptions"
                label="Stop Bits"
                variant="outlined"
              ></v-select>
            </v-col>
            <v-col cols="12">
              <v-select
                v-model="portConfig.parity"
                :items="parityOptions"
                label="Parité"
                variant="outlined"
              ></v-select>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="configDialog = false">Annuler</v-btn>
          <v-btn
            @click="connectWithConfig"
            color="primary"
            :loading="connecting"
          >
            Connecter avec cette config
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";

// État local
const availablePorts = ref([]);
const currentStatus = ref(null);
const refreshingPorts = ref(false);
const connecting = ref(false);
const connectingToPort = ref(null);
const portsError = ref(null);

// Configuration
const defaultConfig = ref({
  baudRate: 9600,
  dataBits: 8,
  stopBits: 1,
  parity: "none",
});

const savingConfig = ref(false);

// Dialog de configuration
const configDialog = ref(false);
const selectedPort = ref(null);
const portConfig = ref({
  baudRate: 9600,
  dataBits: 8,
  stopBits: 1,
  parity: "none",
});

// Options de configuration
const baudRates = [
  { title: "9600", value: 9600 },
  { title: "19200", value: 19200 },
  { title: "38400", value: 38400 },
  { title: "57600", value: 57600 },
  { title: "115200", value: 115200 },
];

const dataBitsOptions = [
  { title: "7 bits", value: 7 },
  { title: "8 bits", value: 8 },
];

const stopBitsOptions = [
  { title: "1 bit", value: 1 },
  { title: "2 bits", value: 2 },
];

const parityOptions = [
  { title: "Aucune", value: "none" },
  { title: "Paire", value: "even" },
  { title: "Impaire", value: "odd" },
];

// Timer pour actualisation automatique
let statusTimer = null;

// Méthodes
const getAlertType = (status) => {
  switch (status) {
    case "connected":
      return "success";
    case "connecting":
      return "warning";
    case "error":
      return "error";
    default:
      return "info";
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case "connected":
      return "mdi-check-circle";
    case "connecting":
      return "mdi-loading";
    case "error":
      return "mdi-alert-circle";
    default:
      return "mdi-information";
  }
};

const getStatusText = (status) => {
  switch (status) {
    case "connected":
      return "Connecté";
    case "connecting":
      return "Connexion en cours...";
    case "error":
      return "Erreur de connexion";
    case "disconnected":
      return "Déconnecté";
    default:
      return "Statut inconnu";
  }
};

const isCurrentPort = (portPath) => {
  return (
    currentStatus.value &&
    currentStatus.value.config &&
    currentStatus.value.config.port === portPath &&
    currentStatus.value.status === "connected"
  );
};

const refreshPorts = async () => {
  refreshingPorts.value = true;
  portsError.value = null;

  try {
    const result = await window.electronAPI.serial.listPorts();

    if (result.success) {
      availablePorts.value = result.ports;
      portsError.value = null;
    } else {
      portsError.value =
        result.message || "Erreur lors de la détection des ports";
      availablePorts.value = [];
    }
  } catch (error) {
    console.error("Erreur lors de l'actualisation des ports:", error);
    portsError.value = "Erreur de communication avec le backend";
    availablePorts.value = [];
  } finally {
    refreshingPorts.value = false;
  }
};

const connectToPort = async (portPath) => {
  connecting.value = true;
  connectingToPort.value = portPath;

  try {
    const result = await window.electronAPI.serial.connectToPort(
      portPath,
      defaultConfig.value
    );

    if (result.success) {
      console.log("Connexion réussie:", result.message);
      // Actualiser le statut après un court délai
      setTimeout(updateCurrentStatus, 1000);
    } else {
      console.error("Échec de la connexion:", result.message);
      portsError.value = result.message;
    }
  } catch (error) {
    console.error("Erreur lors de la connexion:", error);
    portsError.value = "Erreur de communication avec le backend";
  } finally {
    connecting.value = false;
    connectingToPort.value = null;
  }
};

const openPortConfig = (port) => {
  selectedPort.value = port;
  portConfig.value = { ...defaultConfig.value };
  configDialog.value = true;
};

const connectWithConfig = async () => {
  connecting.value = true;

  try {
    const result = await window.electronAPI.serial.connectToPort(
      selectedPort.value.path,
      portConfig.value
    );

    if (result.success) {
      console.log("Connexion réussie avec configuration:", result.message);
      configDialog.value = false;
      // Actualiser le statut après un court délai
      setTimeout(updateCurrentStatus, 1000);
    } else {
      console.error("Échec de la connexion:", result.message);
      portsError.value = result.message;
    }
  } catch (error) {
    console.error("Erreur lors de la connexion:", error);
    portsError.value = "Erreur de communication avec le backend";
  } finally {
    connecting.value = false;
  }
};

const saveDefaultConfig = async () => {
  savingConfig.value = true;

  try {
    const result = await window.electronAPI.serial.configure(
      defaultConfig.value
    );

    if (result.success) {
      console.log("Configuration sauvegardée");
    } else {
      console.error("Échec de la sauvegarde:", result.message);
    }
  } catch (error) {
    console.error("Erreur lors de la sauvegarde:", error);
  } finally {
    savingConfig.value = false;
  }
};

const updateCurrentStatus = async () => {
  try {
    const status = await window.electronAPI.inputs.getDetails("Serial");
    currentStatus.value = status;
  } catch (error) {
    console.error("Erreur lors de la récupération du statut:", error);
  }
};

// Lifecycle
onMounted(() => {
  refreshPorts();
  updateCurrentStatus();

  // Actualiser le statut toutes les 3 secondes
  statusTimer = setInterval(updateCurrentStatus, 3000);
});

onUnmounted(() => {
  if (statusTimer) {
    clearInterval(statusTimer);
  }
});
</script>

<style scoped>
/* Styles spécifiques au composant */
</style>