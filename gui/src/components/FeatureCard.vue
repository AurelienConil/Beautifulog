<template>
  <v-card
    elevation="4"
    hover
    class="h-100"
  >
    <v-card-title class="text-center">
      <v-icon
        :color="iconColor"
        size="48"
        class="mb-2"
      >
        {{ icon }}
      </v-icon>
      <div class="text-h5">{{ title }}</div>
    </v-card-title>
    
    <v-card-text class="text-center">
      <p class="text-body-1">{{ description }}</p>
    </v-card-text>
    
    <v-card-actions class="justify-center">
      <v-btn
        :color="iconColor"
        variant="text"
        size="small"
      >
        En savoir plus
        <v-icon end>mdi-arrow-right</v-icon>
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  }
})

// Couleur basée sur l'icône pour varier les couleurs
const iconColor = computed(() => {
  const colors = ['primary', 'success', 'info', 'warning', 'error', 'purple']
  const hash = props.icon.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
})
</script>