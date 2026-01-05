<!-- <template>
  <div class="feature-chart">
    <canvas ref="canvasRef" :width="width" :height="height"></canvas>
    <span>
      {{ formattedValue }} :: {{ props.feature.minMax[0] }} -
      {{ props.feature.minMax[1] }}
    </span>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  onMounted,
  watch,
  nextTick,
  onBeforeUnmount,
  computed,
} from "vue";
import {
  Chart,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  LineController,
  Filler,
  Legend,
  Tooltip,
} from "chart.js";
import type { ChartConfiguration, ChartData } from "chart.js";
import type { Feature } from "../mediapipe/types";

// Enregistrer les composants Chart.js nécessaires
Chart.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  LineController,
  Filler,
  Legend,
  Tooltip
);

interface Props {
  feature: Feature;
  featureKey: string;
  width?: number;
  height?: number;
  maxHistoryLength?: number;
}

const props = withDefaults(defineProps<Props>(), {
  width: 250,
  height: 50,
  maxHistoryLength: 50,
});

const canvasRef = ref<HTMLCanvasElement>();
let chart: Chart | null = null;
const chartData = ref<ChartData<"line">>({
  labels: [],
  datasets: [
    {
      label: props.feature.name,
      data: [],
      borderColor: getFeatureColor(props.feature),
      backgroundColor: getFeatureColor(props.feature) + "20", // 20% opacity
      borderWidth: 1,
      pointRadius: 0,
      pointHoverRadius: 3,
      tension: 0.1,
      fill: true,
    },
  ],
});

// Historique des valeurs pour le graphique
const history = ref<Array<{ timestamp: number; value: number }>>([]);

function getFeatureColor(feature: Feature): string {
  // Couleurs basées sur la catégorie ou le type
  const colors = {
    DistanceFinger: "#2196F3",
    AccelBaseFinger: "#4CAF50",
    HandOrientationInSpace: "#FF9800",
    HandSizeNormalise: "#9C27B0",
    default: "#607D8B",
  };

  return colors[feature.parents as keyof typeof colors] || colors.default;
}

//computed function that format properly a number to 3 decimal places and fixe position with adding zéro and space.
// The goal is to have always the xxx.xxx format à the same position
const formattedValue = computed(() => {
  if (typeof props.feature.value !== "number") return "N/A";
  const value = props.feature.value;
  const absValue = Math.abs(value);
  // Always pad integer part to 3 digits, sign is always in first position
  const [intPart, decPart] = absValue.toFixed(3).split(".");
  // If negative, sign is '-', else space
  const sign = value < 0 ? "-" : "+";
  // Always 3 digits for int part
  const paddedInt = (intPart || "0").padStart(3, "0");
  // Compose and pad to 8 chars (sign + 3 int + dot + 3 decimals)
  return `${sign}${paddedInt}.${decPart}`;
});

function updateHistory() {
  if (typeof props.feature.value !== "number") return;

  // Ajouter la nouvelle valeur
  history.value.push({
    timestamp: Date.now(),
    value: props.feature.value,
  });

  // Limiter l'historique
  if (history.value.length > props.maxHistoryLength) {
    history.value = history.value.slice(-props.maxHistoryLength);
  }

  // Mettre à jour les données du graphique
  const labels = history.value.map((_, index) => index.toString());
  const data = history.value.map((item) => item.value);

  chartData.value = {
    labels,
    datasets: [
      {
        ...chartData.value.datasets[0],
        data,
      },
    ],
  };

  // Mettre à jour le graphique s'il existe
  if (chart) {
    chart.data = chartData.value;
    chart.update("none"); // Animation désactivée pour les performances
  }
}

function initChart() {
  if (!canvasRef.value) {
    return;
  }

  const config: ChartConfiguration<"line"> = {
    type: "line",
    data: chartData.value,
    options: {
      responsive: false,
      maintainAspectRatio: false,
      animation: false, // Désactiver les animations pour les performances
      interaction: {
        intersect: false,
        mode: "index",
      },
      scales: {
        x: {
          display: false, // Cacher l'axe X pour un look plus propre
        },
        y: {
          display: false, // Cacher l'axe Y pour économiser l'espace
          min: props.feature.minMax[0],
          max: props.feature.minMax[1],
        },
      },
      plugins: {
        legend: {
          display: false, // Cacher la légende pour économiser l'espace
        },
        tooltip: {
          enabled: true,
          displayColors: false,
          callbacks: {
            title: () => props.feature.name,
            label: (context) =>
              context.parsed.y != null ? `${context.parsed.y.toFixed(3)}` : "",
          },
        },
      },
      elements: {
        line: {
          borderWidth: 1,
        },
        point: {
          radius: 0,
        },
      },
    },
  };

  chart = new Chart(canvasRef.value, config);
}

// Surveiller les changements de feature
watch(
  () => props.feature.value,
  () => {
    updateHistory();
  },
  { deep: true }
);

onMounted(async () => {
  await nextTick();
  initChart();
  // Initialiser avec la valeur actuelle
  updateHistory();
});

onBeforeUnmount(() => {
  if (chart) {
    chart.destroy();
    chart = null;
  }
});
</script>

<style scoped>
.feature-chart {
  position: relative;
}

canvas {
  border-radius: 4px;
  background-color: rgba(0, 0, 0, 0.02);
}
</style> -->

<template>
  <div class="pin-graph-container mb-2">
    <div class="graph-wrapper">
      <canvas ref="canvasRef" :width="300" :height="60"></canvas>
      <div class="value-overlay">{{variableName}}= {{ currentValue }}</div>
      <v-btn
        icon="mdi-close"
        size="x-small"
        variant="text"
        color="grey"
        class="close-btn"
        @click="$emit('close')"
      ></v-btn>
    </div>
  </div>
</template>

<script setup>
import {
  computed,
  ref,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from "vue";
import {
  Chart,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  LineController,
  Filler,
} from "chart.js";

// Enregistrer les composants Chart.js nécessaires
Chart.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  LineController,
  Filler
);

const props = defineProps({
  variableName: {
    type: String,
    required: true,
  },
  value: {
    type: [Number, String],
    required: true,
  },
  timestamp: {
    type: String,
    required: true,
  },
  updates: {
    type: Number,
    default: 0,
  },
  history: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["close"]);

// Références
const canvasRef = ref(null);
let chart = null;

// Historique des valeurs pour le graphique
const valueHistory = ref([...props.history]);

// Convertir la valeur actuelle en nombre si possible
const currentValue = computed(() => {
  const numValue = parseFloat(props.value);
  return isNaN(numValue) ? 0 : numValue;
});

// Données pour le sparkline - inclure l'historique ET la valeur actuelle
const sparklineData = computed(() => {
  // Commencer par l'historique, puis ajouter la valeur actuelle
  const allValues = [...valueHistory.value, currentValue.value];
  const numericValues = allValues
    .filter((v) => v !== null && v !== undefined)
    .map((v) => parseFloat(v))
    .filter((v) => !isNaN(v));

  return numericValues;
});

// Vérifier si on a assez de données valides
const hasValidData = computed(() => sparklineData.value.length >= 1);

// Calculer les bornes
const minValue = computed(() => {
  if (sparklineData.value.length === 0) return "0";
  return Math.min(...sparklineData.value).toFixed(2);
});

const maxValue = computed(() => {
  if (sparklineData.value.length === 0) return "0";
  return Math.max(...sparklineData.value).toFixed(2);
});

// Initialiser le graphique Chart.js
const initChart = () => {
  if (!canvasRef.value || !hasValidData.value) return;

  const config = {
    type: "line",
    data: {
      labels: sparklineData.value.map((_, index) => index.toString()),
      datasets: [
        {
          data: sparklineData.value,
          borderColor: "#1976D2",
          backgroundColor: "rgba(25, 118, 210, 0.15)",
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 0,
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      animation: false,
      interaction: {
        intersect: false,
        mode: "index",
      },
      scales: {
        x: {
          display: false,
        },
        y: {
          display: false,
          min: Math.min(...sparklineData.value) * 0.9,
          max: Math.max(...sparklineData.value) * 1.1,
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          enabled: false,
        },
      },
      elements: {
        point: {
          radius: 0,
        },
      },
    },
  };

  if (chart) {
    chart.destroy();
  }

  chart = new Chart(canvasRef.value, config);
};

// Mettre à jour le graphique
const updateChart = () => {
  if (!chart || !hasValidData.value) {
    if (hasValidData.value) {
      nextTick(() => initChart());
    }
    return;
  }

  chart.data.labels = sparklineData.value.map((_, index) => index.toString());
  chart.data.datasets[0].data = sparklineData.value;
  chart.options.scales.y.min = Math.min(...sparklineData.value) * 0.9;
  chart.options.scales.y.max = Math.max(...sparklineData.value) * 1.1;
  chart.update("none");
};

// Mettre à jour l'historique quand la valeur change
watch(
  () => props.value,
  (newValue) => {
    const numValue = parseFloat(newValue);
    if (!isNaN(numValue)) {
      // Ajouter uniquement si différent de la dernière valeur
      const lastValue = valueHistory.value[valueHistory.value.length - 1];
      if (lastValue === undefined || Math.abs(lastValue - numValue) > 0.001) {
        valueHistory.value.push(numValue);
        // Garder seulement les 30 dernières valeurs pour le graphique
        if (valueHistory.value.length > 30) {
          valueHistory.value = valueHistory.value.slice(-30);
        }
        updateChart();
      }
    }
  }
);

// Surveiller les changements d'historique depuis les props
watch(
  () => props.history,
  (newHistory) => {
    if (Array.isArray(newHistory)) {
      valueHistory.value = [...newHistory];
      updateChart();
    }
  },
  { immediate: true }
);

// Surveiller les données du graphique
watch(sparklineData, updateChart);

onMounted(async () => {
  await nextTick();
  initChart();
});

onBeforeUnmount(() => {
  if (chart) {
    chart.destroy();
    chart = null;
  }
});
</script>

<style scoped>
.pin-graph-container {
  position: relative;
  background-color: rgba(33, 150, 243, 0.05);
  border: 1px solid rgba(33, 150, 243, 0.2);
  border-radius: 6px;
  overflow: hidden;
}

.graph-wrapper {
  position: relative;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.value-overlay {
  position: absolute;
  top: 4px;
  left: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  color: #1976d2;
  background: rgba(255, 255, 255, 0.8);
  padding: 2px 6px;
  border-radius: 4px;
  backdrop-filter: blur(2px);
  z-index: 2;
}

.close-btn {
  position: absolute;
  top: 2px;
  right: 2px;
  z-index: 3;
}

canvas {
  border-radius: 6px;
}
</style>