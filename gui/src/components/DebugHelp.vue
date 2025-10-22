<template>
  <div v-if="visible" class="debug-help-modal">
    <v-card elevation="2" class="debug-help-card">
      <v-card-title class="d-flex justify-space-between align-center">
        <span>Aide</span>
        <v-btn icon @click="$emit('close')">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text>
        <p>Utilisez la syntaxe suivante :</p>
        <ul>
          <li><code>[API]</code> : Indique une source</li>
          <li><code>ERROR</code> : Signale une erreur</li>
          <li>Ajoutez un message descriptif</li>
        </ul>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { defineProps } from "vue";

const props = defineProps({
  visible: {
    type: Boolean,
    required: true,
  },
});
</script>

<style scoped>
.debug-help-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5); /* Fond semi-transparent */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000; /* Au-dessus des autres éléments */
}

.debug-help-card {
  width: 400px;
  background-color: white;
  border-radius: 8px;
  padding: 20px;
}
</style>