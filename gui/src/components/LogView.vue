<template>
  <v-card class="log-view" height="100%">
    <v-card-title class="d-flex justify-space-between align-center">
      <span>{{ label }}</span>
      <v-chip :color="getStatusColor()" size="small">
        {{ filteredMessages.length }} messages
      </v-chip>
    </v-card-title>

    <v-card-text
      class="pa-2"
      style="height: calc(100% - 64px); overflow-y: auto"
    >
      <div v-if="filteredMessages.length === 0" class="text-center text-grey">
        Aucun message pour {{ label }}
      </div>

      <div v-else>
        <v-list density="compact" class="pa-0">
          <v-list-item
            v-for="message in filteredMessages"
            :key="message.id"
            class="message-item"
            :class="getMessageClass(message)"
          >
            <template v-slot:prepend>
              <v-icon :color="getMessageIconColor(message)" size="small">
                {{ getMessageIcon(message) }}
              </v-icon>
            </template>

            <v-list-item-content>
              <v-list-item-title class="message-content">
                <div class="message-header">
                  <span class="timestamp">
                    {{ formatTimestamp(message.timestamp) }}
                  </span>
                  <v-chip
                    v-if="message.socketId"
                    size="x-small"
                    variant="outlined"
                    class="ml-2"
                  >
                    {{ message.socketId.substring(0, 8) }}
                  </v-chip>
                </div>
                <div class="message-data">
                  <pre v-if="isJsonData(message.msg)" class="json-data">{{
                    formatJson(message.msg)
                  }}</pre>
                  <span v-else>{{ message.msg }}</span>
                </div>
              </v-list-item-title>
            </v-list-item-content>
          </v-list-item>
        </v-list>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed } from "vue";
import { useSocketStore } from "../stores/socket.js";

const props = defineProps({
  label: {
    type: String,
    required: true,
  },
});

const socketStore = useSocketStore();

// Messages filtrés par label
const filteredMessages = computed(() => {
  return socketStore.messages.filter(
    (message) => message.label === props.label
  );
});

// Couleur du statut basée sur les types de messages
const getStatusColor = () => {
  const messages = filteredMessages.value;
  if (messages.length === 0) return "grey";

  const hasError = messages.some((msg) => msg.type === "error-message");
  if (hasError) return "error";

  const hasWarning = messages.some((msg) => msg.type === "warning-message");
  if (hasWarning) return "warning";

  return "success";
};

// Classe CSS pour le message
const getMessageClass = (message) => {
  return {
    "error-message": message.type === "error-message",
    "warning-message": message.type === "warning-message",
    "info-message": message.type === "info-message",
    "log-message": message.type === "log-message",
  };
};

// Icône pour le type de message
const getMessageIcon = (message) => {
  switch (message.type) {
    case "error-message":
      return "mdi-alert-circle";
    case "warning-message":
      return "mdi-alert";
    case "info-message":
      return "mdi-information";
    case "log-message":
      return "mdi-note-text";
    default:
      return "mdi-message";
  }
};

// Couleur de l'icône
const getMessageIconColor = (message) => {
  switch (message.type) {
    case "error-message":
      return "error";
    case "warning-message":
      return "warning";
    case "info-message":
      return "info";
    case "log-message":
      return "primary";
    default:
      return "grey";
  }
};

// Formatage de la timestamp
const formatTimestamp = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  });
};

// Vérifie si les données sont du JSON
const isJsonData = (msg) => {
  return typeof msg === "object" && msg !== null;
};

// Formate le JSON pour l'affichage
const formatJson = (msg) => {
  return JSON.stringify(msg, null, 2);
};
</script>

<style scoped>
.log-view {
  border: 1px solid rgba(0, 0, 0, 0.12);
}

.message-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  margin-bottom: 2px;
}

.message-item.error-message {
  background-color: rgba(244, 67, 54, 0.05);
}

.message-item.warning-message {
  background-color: rgba(255, 152, 0, 0.05);
}

.message-item.info-message {
  background-color: rgba(33, 150, 243, 0.05);
}

.message-item.log-message {
  background-color: rgba(76, 175, 80, 0.05);
}

.message-header {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}

.timestamp {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.6);
  font-family: monospace;
}

.message-data {
  font-size: 0.875rem;
  word-break: break-word;
}

.json-data {
  font-size: 0.75rem;
  background-color: rgba(0, 0, 0, 0.05);
  padding: 8px;
  border-radius: 4px;
  margin: 4px 0;
  overflow-x: auto;
  max-height: 200px;
  overflow-y: auto;
}

.message-content {
  font-size: 0.875rem !important;
}
</style>
