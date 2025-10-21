<template>
  <v-card class="log-view" height="100%">
    <v-card-title class="d-flex justify-space-between align-center">
      <div class="d-flex align-center">
        <span>{{ label }}</span>
        <v-btn
          icon="mdi-arrow-down-bold-circle"
          size="x-small"
          variant="text"
          class="ml-2"
          title="Défiler vers le bas"
          @click="scrollToBottom(true)"
        ></v-btn>
        <v-btn
          :icon="autoScroll ? 'mdi-sync' : 'mdi-sync-off'"
          size="x-small"
          :color="autoScroll ? 'primary' : 'grey'"
          variant="text"
          class="ml-2"
          :title="
            autoScroll ? 'Défilement auto activé' : 'Défilement auto désactivé'
          "
          @click="toggleAutoScroll"
        ></v-btn>
      </div>
      <v-chip :color="getStatusColor()" size="small">
        {{ filteredMessages.length }} messages
      </v-chip>
    </v-card-title>

    <!-- Section des variables épinglées -->
    <v-card-subtitle v-if="hasVarsToShow" class="pinned-vars-panel pa-2">
      <div class="d-flex flex-wrap align-center mb-2">
        <span class="text-caption text-grey mr-2">Variables épinglées:</span>
        <v-chip
          v-for="(varInfo, varName) in pinnedVariables"
          :key="varName"
          class="ma-1"
          closable
          variant="outlined"
          :color="primary"
          @click:close="unpinVariable(varName)"
        >
          <template v-slot:prepend>
            <v-icon size="x-small">mdi-pin</v-icon>
          </template>
          <span class="font-weight-medium">{{ varName }}:</span>
          <span class="ml-1">{{ varInfo.value }}</span>
          <template v-if="varInfo.updates > 0" v-slot:append> </template>
          <v-tooltip activator="parent" location="bottom">
            Dernière mise à jour: {{ formatTimestamp(varInfo.timestamp) }}
            <br />
            Nombre de mises à jour: {{ varInfo.updates }}
          </v-tooltip>
        </v-chip>
      </div>
    </v-card-subtitle>

    <v-card-text
      class="pa-2 message-container"
      :style="getCardTextStyle()"
      ref="messagesContainer"
    >
      <div v-if="filteredMessages.length === 0" class="text-center text-grey">
        Aucun message pour {{ label }}
      </div>

      <div v-else class="messages-list" ref="messagesList">
        <v-virtual-scroll
          :items="filteredMessages"
          item-height="50"
          class="pa-0"
          ref="virtualScroll"
          v-slot="{ item: message }"
        >
          <v-list-item
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
                  <template v-else-if="message.format === 'json'">
                    <div class="json-message">
                      <JsonViewer :data="message.jsonData" />
                    </div>
                  </template>
                  <template v-else-if="message.format === 'variable'">
                    <div class="variable-message">
                      <span>{{ message.msg }}</span>
                      <div class="mt-1 variables-container">
                        <template
                          v-for="(value, varName) in message.variables"
                          :key="varName"
                        >
                          <span
                            v-if="!isPinned(varName)"
                            class="variable-link"
                            @click="
                              pinVariable(varName, value, message.timestamp)
                            "
                          >
                            <v-chip
                              size="x-small"
                              color="purple-lighten-4"
                              class="mr-1"
                            >
                              {{ varName }}: {{ value }}
                            </v-chip>
                          </span>
                        </template>
                      </div>
                    </div>
                  </template>
                  <span v-else>{{ message.msg }}</span>
                </div>
              </v-list-item-title>
            </v-list-item-content>
          </v-list-item>
        </v-virtual-scroll>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, computed, watch, watchEffect } from "vue";
import { useSocketStore } from "../stores/socket.js";
import JsonViewer from "./JsonViewer.vue";
import { onMounted, onUnmounted, nextTick } from "vue";

const props = defineProps({
  label: {
    type: String,
    required: true,
  },
});

const socketStore = useSocketStore();

// Référence au conteneur des messages pour le défilement automatique
const messagesContainer = ref(null);
const messagesList = ref(null);
const virtualScroll = ref(null);

// État pour le défilement automatique
const autoScroll = ref(true);

// Toggle pour le défilement automatique
const toggleAutoScroll = () => {
  autoScroll.value = !autoScroll.value;
  if (autoScroll.value) {
    scrollToBottom(true);
  }
};

// État local pour les variables épinglées
const pinnedVariables = ref({});

// Vérifier si une variable est épinglée
const isPinned = (varName) => {
  return Object.keys(pinnedVariables.value).includes(varName);
};

// Épingler une variable
const pinVariable = (varName, value, timestamp) => {
  // Lors de l'épinglage initial, on considère qu'il n'y a pas encore de "mise à jour".
  pinnedVariables.value[varName] = {
    value,
    timestamp,
    messageId: Date.now(), // Pour garantir l'unicité
    updates: 0, // Compteur de mises à jour (0 = pas d'update reçue après épinglage)
  };
};

// Mettre à jour une variable épinglée
const updatePinnedVariable = (varName, value, timestamp) => {
  if (!isPinned(varName)) return;

  const currentVar = pinnedVariables.value[varName];
  // Incrémenter le compteur uniquement si la valeur a réellement changé
  const hasChanged = String(currentVar.value) !== String(value);
  pinnedVariables.value[varName] = {
    ...currentVar,
    value,
    timestamp,
    updates: hasChanged
      ? (currentVar.updates || 0) + 1
      : currentVar.updates || 0,
  };
};

// Désépingler une variable
const unpinVariable = (varName) => {
  delete pinnedVariables.value[varName];
};

// Y a-t-il des variables à afficher ?
const hasVarsToShow = computed(() => {
  return Object.keys(pinnedVariables.value).length > 0;
});

// Ajuster le style du card-text en fonction de la présence de variables épinglées
const getCardTextStyle = () => {
  const baseStyle =
    "flex: 1; overflow-y: auto; min-height: 0; display: flex; flex-direction: column;";

  if (hasVarsToShow.value) {
    return baseStyle + " max-height: calc(100% - 64px - 56px);";
  } else {
    return baseStyle + " max-height: calc(100% - 64px);";
  }
};

// Messages filtrés par label
const filteredMessages = computed(() => {
  console.log("Recalcul de filteredMessages");
  // Filtrer les messages et les inverser pour que les plus récents apparaissent en bas
  return socketStore.messages
    .filter((message) => message.label === props.label)
    .filter((message) => {
      // Si ce n'est pas un message de type variable, l'afficher normalement
      if (message.format !== "variable") {
        return true;
      }

      // Pour les messages de type variable, vérifier si toutes ses variables sont épinglées
      const allVarsArePinned = Object.keys(message.variables).every((varName) =>
        isPinned(varName)
      );

      // Si toutes les variables sont épinglées, ne pas afficher le message
      return !allVarsArePinned;
    })
    .slice() // Créer une copie pour ne pas modifier le tableau original
    .reverse(); // Inverser pour que les messages les plus récents soient en bas
});

// Variable pour mémoriser le dernier timestamp
const lastMessageTimestamp = ref(0);

// Fonction de défilement vers le bas (pour le bouton et les appels automatiques)
const scrollToBottom = (force = false) => {
  console.log("scrollToBottom called with force =", force);

  if (virtualScroll.value) {
    const performScroll = () => {
      virtualScroll.value.scrollToIndex(filteredMessages.value.length - 1);
    };

    if (force || autoScroll.value) {
      // Exécution immédiate
      performScroll();
    }
  } else if (messagesContainer.value) {
    const performScroll = () => {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    };

    if (force || autoScroll.value) {
      performScroll();
      nextTick(performScroll);
      setTimeout(performScroll, 100);
    }
  }
};

// Détecter quand l'utilisateur fait défiler manuellement
const handleScroll = () => {
  if (!messagesContainer.value) return;

  const { scrollTop, scrollHeight, clientHeight } = messagesContainer.value;
  const isAtBottom = scrollHeight - scrollTop - clientHeight < 20; // Marge de 20px

  // Si l'utilisateur n'est pas près du bas, désactiver le défilement automatique
  if (!isAtBottom) {
    autoScroll.value = false;
  }
};

watchEffect(() => {
  console.log("filteredMessages Watch Effect :", filteredMessages.value);
	//scroll to bottom in 200ms
	setTimeout(() => {
		scrollToBottom(true);
	}, 200);
});

// Observer filteredMessages.length pour détecter les changements
watch(
  () => filteredMessages.length,
  (newLength, oldLength) => {
    console.log(
      `filteredMessages.length a changé : ancien = ${oldLength}, nouveau = ${newLength}`
    );
  }
);

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
  const baseClasses = {
    "error-message": message.type === "error-message",
    "warning-message": message.type === "warning-message",
    "info-message": message.type === "info-message",
    "log-message": message.type === "log-message",
  };

  // Ajouter la classe pour les formats spéciaux
  if (message.format === "variable") {
    baseClasses["variable-message"] = true;
  } else if (message.format === "json") {
    baseClasses["json-message"] = true;
  }

  return baseClasses;
};

// Icône pour le type de message
const getMessageIcon = (message) => {
  // Choisir l'icône en fonction du format
  if (message.format === "variable") {
    return "mdi-variable";
  } else if (message.format === "json") {
    return "mdi-code-json";
  }

  // Sinon, utiliser l'icône en fonction du type
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
  // Choisir la couleur en fonction du format
  if (message.format === "variable") {
    return "purple";
  } else if (message.format === "json") {
    return "blue";
  }

  // Sinon, utiliser la couleur en fonction du type
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

// Défiler vers le bas au chargement initial
onMounted(() => {
  nextTick(() => {
    // Défiler vers le bas après le rendu initial
    scrollToBottom(true);

    // Essayer à nouveau après un délai pour s'assurer que tout est chargé
    setTimeout(() => scrollToBottom(true), 200);

    // Ajouter un event listener pour détecter le défilement manuel
    if (messagesContainer.value) {
      messagesContainer.value.addEventListener("scroll", handleScroll);
    }
  });
});

// Nettoyer l'event listener quand le composant est détruit
onUnmounted(() => {
  if (messagesContainer.value) {
    messagesContainer.value.removeEventListener("scroll", handleScroll);
  }
});
</script>

<style scoped>
.log-view {
  border: 1px solid rgba(0, 0, 0, 0.12);
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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
  font-size: 0.35rem;
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

.variable-message {
  padding: 4px 0;
}

.variable-link {
  cursor: pointer;
  display: inline-block;
  transition: transform 0.2s;
}

.variable-link:hover {
  transform: translateY(-2px);
}

.variable-link:active {
  transform: translateY(0);
}

.pinned-vars-panel {
  background-color: rgba(103, 58, 183, 0.05);
  border-bottom: 1px solid rgba(103, 58, 183, 0.2);
}

.message-item.variable-message {
  background-color: rgba(103, 58, 183, 0.05);
}

.json-message {
  padding: 8px;
  border-radius: 4px;
  background-color: rgba(33, 150, 243, 0.05);
  margin: 4px 0;
  border-left: 3px solid rgba(33, 150, 243, 0.3);
}

.variables-container {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.message-container {
  position: relative;
  scroll-behavior: smooth;
  display: flex;
  flex-direction: column;
  overflow-anchor: auto; /* Aide à maintenir la position de défilement lors de l'ajout de contenu */
}

.messages-list {
  display: flex;
  flex-direction: column; /* Ordre normal - anciens en haut, nouveaux en bas */
  min-height: 100%;
}
</style>
