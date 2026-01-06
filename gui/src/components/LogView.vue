<template>
  <v-card class="log-view">
    <v-card-title class="d-flex justify-space-between align-center">
      <v-expansion-panels class="my-0 py-0">
        <v-expansion-panel class="my-0 py-0">
          <v-expansion-panel-title class="my-0 py-0">
            <span>{{ label }}</span>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-chip-group
              v-model="selectedTypes"
              column
              multiple
              class="type-filters"
            >
              <v-chip
                v-for="type in messageTypes"
                :key="type.value"
                :value="type.value"
                filter
                variant="outlined"
                :color="type.color"
                size="small"
              >
                <v-icon start size="x-small" :color="type.color">{{
                  type.icon
                }}</v-icon>
              </v-chip>
            </v-chip-group>
            <div class="d-flex align-center">
              <v-text-field
                v-model="contentFilter"
                placeholder="Filtrer le contenu"
                variant="outlined"
                density="compact"
                hide-details
                class="content-filter mr-2"
                prepend-inner-icon="mdi-filter-outline"
                clearable
              ></v-text-field>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
      <v-btn
        icon="mdi-close"
        size="x-small"
        variant="text"
        color="grey"
        class="ml-2"
        title="Masquer cette colonne"
        @click="hideColumn"
      ></v-btn>
    </v-card-title>

    <!-- Section des variables épinglées -->
    <v-card-subtitle v-if="hasVarsToShow" class="pinned-vars-panel pa-2">
      <div class="d-flex flex-wrap align-center mb-2">
        <span class="text-caption text-grey mr-2">Variables épinglées:</span>
        <template v-for="(varInfo, varName) in normalVariables" :key="varName">
          <v-menu
            v-model="contextMenus[varName]"
            :close-on-content-click="false"
            location="bottom"
            offset="8"
          >
            <template v-slot:activator="{ props: menuProps }">
              <v-chip
                v-bind="menuProps"
                class="ma-1"
                variant="outlined"
                color="primary"
              >
                <template v-slot:prepend>
                  <v-icon size="x-small">mdi-pin</v-icon>
                </template>
                <span class="font-weight-medium">{{ varName }}=</span>
                <span class="ml-1">{{ varInfo.value }}</span>
                <v-tooltip activator="parent" location="bottom">
                  Dernière mise à jour: {{ formatTimestamp(varInfo.timestamp) }}
                  <br />
                  Nombre de mises à jour: {{ varInfo.updates }}
                </v-tooltip>
              </v-chip>
            </template>

            <v-card min-width="200">
              <v-list density="compact">
                <v-list-item
                  prepend-icon="mdi-pin-off"
                  title="Désépingler"
                  @click="
                    unpinVariable(varName);
                    closeContextMenu(varName);
                  "
                ></v-list-item>
                <v-list-item
                  prepend-icon="mdi-tune"
                  title="Mode Slider"
                  @click="
                    setVariableMode(varName, 'slider');
                    closeContextMenu(varName);
                  "
                ></v-list-item>
                <v-list-item
                  prepend-icon="mdi-chart-line"
                  title="Mode Graphique"
                  @click="
                    setVariableMode(varName, 'graph');
                    closeContextMenu(varName);
                  "
                ></v-list-item>
              </v-list>
            </v-card>
          </v-menu>
        </template>
      </div>
    </v-card-subtitle>

    <!-- Section des sliders -->
    <div v-if="Object.keys(sliderVariables).length > 0" class="pa-2">
      <PinSlider
        v-for="(varInfo, varName) in sliderVariables"
        :key="`slider-${varName}`"
        :variable-name="varName"
        :value="varInfo.value"
        :timestamp="varInfo.timestamp"
        :updates="varInfo.updates"
        :history="varInfo.history || []"
        @close="setVariableMode(varName, 'normal')"
      />
    </div>

    <!-- Section des graphiques -->
    <div v-if="Object.keys(graphVariables).length > 0" class="pa-2">
      <PinGraph
        v-for="(varInfo, varName) in graphVariables"
        :key="`graph-${varName}`"
        :variable-name="varName"
        :value="varInfo.value"
        :timestamp="varInfo.timestamp"
        :updates="varInfo.updates"
        :history="varInfo.history || []"
        @close="setVariableMode(varName, 'normal')"
      />
    </div>

    <v-card-text class="pa-2 log-content-area" ref="messagesContainer">
      <div v-if="filteredMessages.length === 0" class="text-center text-grey">
        Aucun message pour {{ label }}
      </div>

      <v-virtual-scroll
        v-else
        :items="filteredMessages"
        item-height="50"
        ref="scrollContainer"
      >
        <template v-slot:default="{ item: message }">
          <div
            v-memo="[
              message.id,
              message.timestamp,
              message.msg,
              message.type,
              isPinned,
            ]"
            class="message-item message-content"
            :class="getMessageClass(message)"
            :title="message.msg"
            style="padding: 8px; border-radius: 4px; margin-bottom: 2px"
          >
            <div class="message-header">
              <span class="timestamp">{{
                formatTimestamp(message.timestamp)
              }}</span>
              <span
                v-if="message.type"
                class="type-label"
                :class="message.type.replace('-message', '')"
              >
                {{ message.type.replace("-message", "") }}
              </span>
              <span v-if="message.format != 'string'" class="type-label">
                {{ message.format }}
              </span>
              <span v-if="message.subLabel" class="type-label sublabel">
                {{ message.subLabel }}
              </span>
            </div>
            <div class="message-data">
              <pre v-if="isJsonData(message.msg)" class="json-data">{{
                formatJson(message.msg)
              }}</pre>
              <template v-else-if="message.format === 'json'">
                <div>
                  {{ message.msg }}
                  <span
                    class="open-json variable-link variable-badge"
                    @click="openJsonModal(message.jsonData)"
                    >Click to view JSON</span
                  >
                </div>
              </template>
              <template v-else-if="message.format === 'variable'">
                <div class="variable-message">
                  {{ message.msg }}
                  <div class="variables-container">
                    <template
                      v-for="(value, varName) in message.variables"
                      :key="varName"
                    >
                      <span
                        v-if="!isPinned(varName)"
                        class="variable-link variable-badge"
                        @click="pinVariable(varName, value, message.timestamp)"
                      >
                        {{ varName }}: {{ value }}
                        <v-icon size="x-small" class="ml-1">mdi-pin</v-icon>
                      </span>

                      <span v-else class="variable-badge variable-badge-pinned">
                        {{ varName }}
                      </span>
                    </template>
                  </div>
                </div>
              </template>
              <span v-else>{{ message.msg }}</span>
            </div>
          </div>
        </template>
      </v-virtual-scroll>
    </v-card-text>

    <v-dialog v-model="modalJsonOpen" max-width="600" class="json-message">
      <v-card>
        <v-card-title class="headline">JSON Viewer</v-card-title>
        <v-card-text>
          <JsonViewer :data="modalJsonModel" />
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" text @click="modalJsonOpen = false"
            >Close</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup>
import { ref, computed, watch, watchEffect } from "vue";
import { useSocketStore } from "../stores/socket.js";
import JsonViewer from "./JsonViewer.vue";
import PinSlider from "./PinSlider.vue";
import PinGraph from "./PinGraph.vue";
import { onMounted, onUnmounted, nextTick } from "vue";

const props = defineProps({
  label: {
    type: String,
    required: true,
  },
});

// Définir les événements émis par ce composant
const emit = defineEmits(["hide"]);

// Fonction pour émettre l'événement de masquage de la colonne
const hideColumn = () => {
  emit("hide", props.label);
};

const socketStore = useSocketStore();

// Référence au conteneur des messages pour le défilement automatique
const messagesContainer = ref(null);
const scrollContainer = ref(null);

// Référence pour le timeout de scroll (debouncing)
const scrollTimeoutRef = ref(null);

// Variable simple d'ajustement du scroll (réglage développeur)
const SCROLL_DELAY = 20; // ms - Ajuster selon besoins de performance

// État pour le défilement automatique (toujours activé)
const autoScroll = true; // Changé de ref(true) à une constante fixe

// Filtre pour le contenu des messages
const contentFilter = ref("");

// Types de messages disponibles
const messageTypes = [
  {
    label: "INFO",
    value: "info-message",
    color: "info",
    icon: "mdi-information",
  },
  {
    label: "WARNING",
    value: "warning-message",
    color: "warning",
    icon: "mdi-alert",
  },
  {
    label: "ERROR",
    value: "error-message",
    color: "error",
    icon: "mdi-alert-circle",
  },
  {
    label: "LOG",
    value: "log-message",
    color: "primary",
    icon: "mdi-note-text",
  },
];

// Types de messages sélectionnés (tous par défaut)
const selectedTypes = ref(messageTypes.map((type) => type.value));

// État local pour les variables épinglées - DEPRECATED (maintenant dans le store)
const pinnedVariables = ref({});

// Vérifier si une variable est épinglée (utilise le store)
const isPinned = (varName) => {
  return Object.keys(pinnedVariablesFromStore.value).includes(varName);
};

// Épingler une variable (utilise le store)
const pinVariable = (varName, value, timestamp) => {
  socketStore.pinVariable(props.label, varName, value, timestamp);
};

// Mettre à jour une variable épinglée - DEPRECATED (maintenant géré dans le store)
const updatePinnedVariable = (varName, value, timestamp) => {
  // Cette fonction n'est plus utilisée car les mises à jour sont faites automatiquement dans le store
  console.log(
    "updatePinnedVariable est obsolète, les mises à jour sont gérées dans le store"
  );
};

// Désépingler une variable (utilise le store)
const unpinVariable = (varName) => {
  socketStore.unpinVariable(props.label, varName);
};

// Changer le mode d'affichage d'une variable (utilise le store)
const setVariableMode = (varName, mode) => {
  socketStore.setPinnedVariableMode(props.label, varName, mode);
};

// Obtenir les variables par mode (utilise le store)
const getVariablesByMode = (mode) => {
  return Object.fromEntries(
    Object.entries(pinnedVariablesFromStore.value).filter(
      ([, varInfo]) => varInfo.mode === mode
    )
  );
};

// Computed properties simplifiés pour les variables (utilise le store)
const normalVariables = computed(() => {
  const vars = getVariablesByMode("normal");
  const entries = Object.entries(vars);
  if (entries.length > 10) {
    return Object.fromEntries(entries.slice(0, 10));
  }
  return vars;
});

const sliderVariables = computed(() => {
  const vars = getVariablesByMode("slider");
  const entries = Object.entries(vars);
  if (entries.length > 5) {
    return Object.fromEntries(entries.slice(0, 5));
  }
  return vars;
});

const graphVariables = computed(() => {
  const vars = getVariablesByMode("graph");
  const entries = Object.entries(vars);
  if (entries.length > 3) {
    return Object.fromEntries(entries.slice(0, 3));
  }
  return vars;
});

// Y a-t-il des variables à afficher ? (utilise le store)
const hasVarsToShow = computed(() => {
  return Object.keys(pinnedVariablesFromStore.value).length > 0;
});

// Ajuster le style du card-text en fonction de la présence de variables épinglées et des filtres de type
const getCardTextStyle = () => {
  const baseStyle =
    "flex: 1; overflow-y: auto; min-height: 0; display: flex; flex-direction: column;";

  // Hauteur de la card-title (64px) + hauteur de la card-subtitle des filtres (48px)
  const filterHeight = "112px";

  if (hasVarsToShow.value) {
    // Ajouter la hauteur de la section des variables épinglées (56px)
    return baseStyle + " max-height: calc(100% - " + filterHeight + " - 56px);";
  } else {
    return baseStyle + " max-height: calc(100% - " + filterHeight + ");";
  }
};

//NOUVEAU : Réactivité ciblée - seulement ce label
const labelMessages = socketStore.createLabelComputed(props.label);

// NOUVEAU : Variables pinnées depuis le store
const pinnedVariablesFromStore = socketStore.createPinnedVariablesComputed(
  props.label
);

//Messages filtrés (ULTRA-OPTIMISÉ - ne travaille QUE sur les messages de ce label)
const filteredMessages = computed(() => {
  const messages = labelMessages.value; // Déjà filtrés par label !

  if (messages.length === 0) {
    return [];
  }

  let filtered = messages;

  // Filtrer par type (seulement si nécessaire)
  if (selectedTypes.value.length < messageTypes.length) {
    filtered = filtered.filter((message) =>
      selectedTypes.value.includes(message.type || "log-message")
    );
  }

  // Filtrer par variables épinglées (optimisé)
  filtered = filtered.filter((message) => {
    if (message.format === "variable" && message.variables) {
      const allVarsArePinned = Object.keys(message.variables).every((varName) =>
        isPinned(varName)
      );
      return !allVarsArePinned;
    }
    return true;
  });

  // Filtrer par contenu (seulement si actif)
  if (contentFilter.value?.trim()) {
    const filter = contentFilter.value.toLowerCase();
    filtered = filtered.filter((message) => {
      // Recherche rapide dans le message principal
      if (
        typeof message.msg === "string" &&
        message.msg.toLowerCase().includes(filter)
      ) {
        return true;
      }

      // Variables (optimisé)
      if (message.format === "variable" && message.variables) {
        return Object.entries(message.variables).some(
          ([varName, value]) =>
            varName.toLowerCase().includes(filter) ||
            String(value).toLowerCase().includes(filter)
        );
      }

      return false;
    });
  }

  // Filtre temporel (seulement si IPC désactivé)
  if (!socketStore.IPCActivated) {
    filtered = filtered.filter((message) => {
      const messageTime = new Date(message.timestamp).getTime();
      return messageTime <= socketStore.maxTimestampValue;
    });
  }

  // Retourner les 100 derniers messages max
  return filtered.slice(-100);
});

// const filteredMessages = computed(() => {
//   return socketStore.messages.filter(
//     (message) => message.label === props.label
//   );
// });

const filteredMessagesCount = computed(() => {
  return filteredMessages.value.length;
});

// SUPPRIMÉ : Le watch et updateAllPinnedVariables ne sont plus nécessaires
// car les variables pinnées sont mises à jour automatiquement dans le store

watch(
  () => filteredMessagesCount.value,
  async () => {
    await nextTick();

    // Pour v-virtual-scroll, utiliser la méthode scrollToIndex si disponible
    if (scrollContainer.value && filteredMessagesCount.value > 0) {
      // DEBOUNCING : Annuler le scroll précédent s'il existe
      if (scrollTimeoutRef.value) {
        clearTimeout(scrollTimeoutRef.value);
        scrollTimeoutRef.value = null;
      }

      // Créer un nouveau timeout
      scrollTimeoutRef.value = setTimeout(() => {
        if (scrollContainer.value) {
          scrollContainer.value.scrollToIndex(filteredMessagesCount.value);
        }
        scrollTimeoutRef.value = null; // Reset de la référence
      }, SCROLL_DELAY);
    }
  }
);

// Variable pour mémoriser le dernier timestamp
const lastMessageTimestamp = ref(0);

// SUPPRIMÉ : updateAllPinnedVariables n'est plus nécessaire
// Les variables sont mises à jour automatiquement dans le store lors de la réception des messages

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

// État réactif pour le message survolé
const hoveredMessage = ref(null);

// État pour le modal d'affichage du JSON
const modalJsonOpen = ref(false);
const modalJsonModel = ref(null);

// État pour le menu contextuel des variables
const contextMenus = ref({});
const contextMenuVariable = ref(null);

// Fermer le menu contextuel d'une variable
const closeContextMenu = (varName) => {
  contextMenus.value[varName] = false;
};

// Fonction pour ouvrir le modal avec les données JSON
const openJsonModal = (jsonData) => {
  modalJsonModel.value = jsonData;
  modalJsonOpen.value = true;
};

// Nettoyage lors de la destruction du composant
onUnmounted(() => {
  if (scrollTimeoutRef.value) {
    clearTimeout(scrollTimeoutRef.value);
    scrollTimeoutRef.value = null;
  }
});
</script>

<style scoped>
.log-content-area {
  max-height: 435px;
  width: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.log-view {
  border: 1px solid rgba(0, 0, 0, 0.12);
  height: auto;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.message-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  margin-bottom: 2px;
  font-family: "Lucida Console", monospace;
}

.message-content {
  padding: 0px;
  margin: 0px;
  font-size: 0.875rem !important;
  color: black;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
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

.variable-message {
  padding: 4px 0;
}

.variable-link {
  cursor: pointer;
}
.variable-badge {
  background: #ede7f6;
  color: #6a1b9a;
  padding: 2px 6px;
  border-radius: 2px;
  margin-right: 4px;
  font-size: 0.8em;
  display: inline-block;
  transition: transform 0.2s;
}
.variable-link:hover {
  transform: translateY(-2px);
}
.variable-link:active {
  transform: translateY(0);
}
.variable-badge-pinned {
  background: #d1c4e9;
  color: #4a148c;
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
  margin: 4px 0;
  border-left: 3px solid rgba(33, 150, 243, 0.3);
}

.variables-container {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
}

.content-filter {
  min-width: 100px;
  max-width: 200px;
  font-size: 0.875rem;
}

.type-filters {
  flex-wrap: wrap;
  justify-content: center;
}

.type-label {
  padding: 2px 6px;
  border-radius: 2px;
  margin-left: 8px;
  font-weight: bold;
  font-size: 0.8em;
}
.type-label.error {
  background: rgba(244, 67, 54, 0.15);
  color: #b71c1c;
}
.type-label.warning {
  background: rgba(255, 152, 0, 0.15);
  color: #ff9800;
}
.type-label.info {
  background: rgba(33, 150, 243, 0.15);
  color: #1976d2;
}
.type-label.log {
  background: rgba(76, 175, 80, 0.15);
  color: #388e3c;
}

.type-label.sublabel {
  background: #0b6275;
  color: #b6e7f3;
}

.label-label {
  background: #eee;
  color: #333;
  padding: 2px 6px;
  border-radius: 2px;
  margin-left: 8px;
  font-size: 0.8em;
}
</style>
