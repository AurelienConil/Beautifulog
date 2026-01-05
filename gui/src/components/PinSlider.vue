<template>
  <div class="pin-slider-container mb-2">
    <div class="slider-wrapper">
      <v-slider
        :model-value="currentValue"
        :label="variableName"
        :min="minValue"
        :max="maxValue"
        :step="step"
        hide-details
        track-color="grey-lighten-2"
        track-fill-color="primary"
        thumb-color="primary"
        readonly
        class="slider-display"
        thumb-size="10"
        thumb-label="always"
      ></v-slider>

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
import { computed, ref, watch } from "vue";

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

// Historique des valeurs pour calculer les bornes
const valueHistory = ref([...props.history]);

// Convertir la valeur actuelle en nombre si possible
const currentValue = computed(() => {
  const numValue = parseFloat(props.value);
  return isNaN(numValue) ? 0 : numValue;
});

// Calculer les bornes dynamiquement
const minValue = computed(() => {
  const allValues = [...valueHistory.value, currentValue.value];
  const numericValues = allValues
    .filter((v) => !isNaN(parseFloat(v)))
    .map((v) => parseFloat(v));
  if (numericValues.length === 0) return 0;
  const min = Math.min(...numericValues);
  // Ajouter une marge de 10%
  const range = Math.max(...numericValues) - min;
  const marginMin = min - range * 0.1;
  return Math.floor(marginMin * 100) / 100;
});

const maxValue = computed(() => {
  const allValues = [...valueHistory.value, currentValue.value];
  const numericValues = allValues
    .filter((v) => !isNaN(parseFloat(v)))
    .map((v) => parseFloat(v));
  if (numericValues.length === 0) return 100;
  const max = Math.max(...numericValues);
  // Ajouter une marge de 10%
  const range = max - Math.min(...numericValues);
  const marginMax = max + range * 0.1;
  return Math.ceil(marginMax * 100) / 100;
});

// Calculer le pas approprié
const step = computed(() => {
  const range = maxValue.value - minValue.value;
  if (range > 1000) return 10;
  if (range > 100) return 1;
  if (range > 10) return 0.1;
  return 0.01;
});

// Surveiller les changements d'historique depuis les props
watch(
  () => props.history,
  (newHistory) => {
    if (Array.isArray(newHistory)) {
      valueHistory.value = [...newHistory];
    }
  },
  { immediate: true }
);

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
        // Garder seulement les 50 dernières valeurs
        if (valueHistory.value.length > 50) {
          valueHistory.value = valueHistory.value.slice(-50);
        }
      }
    }
  }
);

// Formatage du timestamp
const formatTimestamp = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};
</script>

<style scoped>
.pin-slider-container {
  position: relative;
  background-color: rgba(103, 58, 183, 0.05);
  border: 1px solid rgba(103, 58, 183, 0.2);
  border-radius: 6px;
  overflow: hidden;
}

.slider-wrapper {
  position:relative;
  height: 60px;
display: flex;
align-items: flex-end;
margin-bottom: 0cap;
}



.close-btn {
  position: absolute;
  top: 2px;
  right: 2px;
  z-index: 3;
}

.slider-display {
  margin: 0;
  padding: 0;
  flex: 1;
}

.slider-display :deep(.v-slider-track__background),
.slider-display :deep(.v-slider-track__fill) {
  height: 8px;
}

.slider-display :deep(.v-slider-thumb__surface) {
  width: 20px;
  height: 20px;
}
</style>