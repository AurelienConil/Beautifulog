<template>
  <v-card class="performance-monitor">
    <v-card-title class="d-flex align-center">
      <v-icon class="mr-2">mdi-speedometer</v-icon>
      Performance Monitor
      <v-spacer></v-spacer>
      <v-btn
        :color="monitoring ? 'error' : 'success'"
        size="small"
        @click="toggleMonitoring"
      >
        {{ monitoring ? "Stop" : "Start" }}
      </v-btn>
    </v-card-title>

    <v-card-text>
      <!-- Métriques principales -->
      <v-row>
        <v-col cols="3">
          <v-card variant="outlined" class="pa-2">
            <div class="text-caption">Messages Socket</div>
            <div class="text-h6">
              {{ metrics.socketMessages?.received || 0 }}
            </div>
            <div class="text-caption text-grey">
              Last: {{ formatTimeSince(metrics.socketMessages?.lastTimestamp) }}
            </div>
          </v-card>
        </v-col>

        <v-col cols="3">
          <v-card variant="outlined" class="pa-2">
            <div class="text-caption">Messages IPC</div>
            <div class="text-h6">{{ metrics.ipcMessages?.sent || 0 }}</div>
            <div class="text-caption text-grey">
              Last: {{ formatTimeSince(metrics.ipcMessages?.lastTimestamp) }}
            </div>
          </v-card>
        </v-col>

        <v-col cols="3">
          <v-card variant="outlined" class="pa-2">
            <div class="text-caption">Batches Traités</div>
            <div class="text-h6 text-success">
              {{ socketStore.batchMetrics?.batchesProcessed || 0 }}
            </div>
            <div class="text-caption text-grey">
              Throttle: {{ socketStore.batchMetrics?.throttleEvents || 0 }}
            </div>
          </v-card>
        </v-col>

        <v-col cols="3">
          <v-card variant="outlined" class="pa-2" :class="queueStatusClass">
            <div class="text-caption">Queue Size</div>
            <div class="text-h6">{{ metrics.queueSizes?.current || 0 }}</div>
            <div class="text-caption">
              Max: {{ metrics.queueSizes?.max || 0 }}
            </div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Alertes de performance -->
      <v-alert
        v-if="bottlenecks.length > 0"
        type="warning"
        class="mt-4"
        closable
      >
        <div class="text-subtitle2">Goulots d'étranglement détectés:</div>
        <ul class="mt-2">
          <li v-for="bottleneck in bottlenecks" :key="bottleneck">
            {{ bottleneck }}
          </li>
        </ul>
      </v-alert>

      <!-- Graphique de la queue (simple) -->
      <div class="mt-4">
        <div class="text-subtitle2 mb-2">
          Queue History (dernières 2 minutes)
        </div>
        <v-card variant="outlined" class="pa-2" style="height: 100px">
          <svg width="100%" height="100%" v-if="queueHistory.length > 0">
            <polyline
              :points="queueHistoryPoints"
              fill="none"
              stroke="#1976d2"
              stroke-width="2"
            />
          </svg>
          <div
            v-else
            class="d-flex align-center justify-center h-100 text-grey"
          >
            Pas de données
          </div>
        </v-card>
      </div>

      <!-- Actions -->
      <v-row class="mt-4">
        <v-col>
          <v-btn color="orange" @click="resetMetrics" size="small">
            Reset Métriques
          </v-btn>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useSocketStore } from "../stores/socket.js";

// Store
const socketStore = useSocketStore();

// État réactif
const metrics = ref({});
const monitoring = ref(false);
const updateInterval = ref(null);

// Métriques calculées
const averageBatchSize = computed(() => {
  const batches = metrics.value.batchesSent?.count || 0;
  const total = metrics.value.batchesSent?.totalSize || 0;
  return batches > 0 ? Math.round(total / batches) : 0;
});

const queueStatusClass = computed(() => {
  const current = metrics.value.queueSizes?.current || 0;
  if (current > 50) return "bg-red-lighten-4";
  if (current > 20) return "bg-orange-lighten-4";
  return "";
});

const bottlenecks = computed(() => {
  const warnings = [];
  const now = Date.now();

  // Queue trop pleine
  const queueSize = metrics.value.queueSizes?.current || 0;
  if (queueSize > 50) {
    warnings.push(`Queue overflow: ${queueSize} messages en attente`);
  }

  // Messages qui ne sont plus traités
  const socketDelay =
    now - (metrics.value.socketMessages?.lastTimestamp || now);
  const ipcDelay = now - (metrics.value.ipcMessages?.lastTimestamp || now);

  if (socketDelay > 3000) {
    warnings.push(
      `Socket stalled: ${Math.round(socketDelay / 1000)}s sans messages`
    );
  }

  if (ipcDelay > 3000) {
    warnings.push(`IPC stalled: ${Math.round(ipcDelay / 1000)}s sans envoi`);
  }

  return warnings;
});

const queueHistory = computed(() => {
  const history = metrics.value.queueSizes?.history || [];
  const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
  return history.filter((h) => h.timestamp > twoMinutesAgo);
});

const queueHistoryPoints = computed(() => {
  if (queueHistory.value.length === 0) return "";

  const width = 400; // Largeur approximative du SVG
  const height = 80;
  const maxSize = Math.max(...queueHistory.value.map((h) => h.size), 1);

  return queueHistory.value
    .map((h, i) => {
      const x = (i / (queueHistory.value.length - 1)) * width;
      const y = height - (h.size / maxSize) * height;
      return `${x},${y}`;
    })
    .join(" ");
});

// Méthodes
const updateMetrics = async () => {
  try {
    if (window.electronAPI?.performance?.getMetrics) {
      const result = await window.electronAPI.performance.getMetrics();
      if (result) {
        metrics.value = result;
      }
    }
  } catch (error) {
    console.error("Erreur lors de la récupération des métriques:", error);
  }
};

const toggleMonitoring = async () => {
  try {
    if (window.electronAPI?.performance?.toggleMonitoring) {
      const newState = !monitoring.value;
      const result = await window.electronAPI.performance.toggleMonitoring(
        newState
      );
      if (result?.success) {
        monitoring.value = newState;

        if (newState) {
          // Démarrer les updates côté frontend
          updateInterval.value = setInterval(updateMetrics, 1000);
        } else {
          // Arrêter les updates
          if (updateInterval.value) {
            clearInterval(updateInterval.value);
            updateInterval.value = null;
          }
        }
      }
    }
  } catch (error) {
    console.error("Erreur lors du toggle monitoring:", error);
  }
};

const resetMetrics = async () => {
  try {
    if (window.electronAPI?.performance?.resetMetrics) {
      await window.electronAPI.performance.resetMetrics();
      metrics.value = {};
    }
  } catch (error) {
    console.error("Erreur lors du reset:", error);
  }
};

const formatTimeSince = (timestamp) => {
  if (!timestamp || timestamp === 0) return "never";
  const diff = Date.now() - timestamp;
  if (diff < 1000) return "now";
  if (diff < 60000) return `${Math.round(diff / 1000)}s ago`;
  return `${Math.round(diff / 60000)}m ago`;
};

// Lifecycle
onMounted(async () => {
  // Check if performance APIs are available
  if (window.electronAPI?.performance) {
    console.log("✅ Performance APIs disponibles");
    await updateMetrics();
  } else {
    console.log("❌ Performance APIs non disponibles");
  }
});

onUnmounted(() => {
  if (updateInterval.value) {
    clearInterval(updateInterval.value);
  }
});
</script>

<style scoped>
.performance-monitor {
  font-family: "Roboto Mono", monospace;
}

.text-h6 {
  font-weight: bold;
  color: #1976d2;
}

.bg-red-lighten-4 {
  background-color: rgba(244, 67, 54, 0.1) !important;
}

.bg-orange-lighten-4 {
  background-color: rgba(255, 152, 0, 0.1) !important;
}
</style>