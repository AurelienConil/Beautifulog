<template>
  <div class="json-code-view pl-2">
    <template v-for="(value, key, index) in data" :key="key">
      <!-- Si c'est un objet ou un tableau -->
      <div
        v-if="isExpandable(value)"
        @click="toggle(key)"
        class="json-line cursor-pointer"
      >
        <v-icon size="x-small" class="mr-1">
          {{ expanded[key] ? "mdi-chevron-down" : "mdi-chevron-right" }}
        </v-icon>
        <span class="key-name">{{ key }}</span
        ><span class="punctuation">:</span>
        <span class="type-info"
          >{{ typeOf(value) }}{{ getObjectPreview(value) }}</span
        >
        <span v-if="index < Object.keys(data).length - 1" class="punctuation"
          >,</span
        >
      </div>

      <div v-if="expanded[key]" class="pl-3 json-nested">
        <JsonViewer :data="value" />
      </div>

      <!-- Si c'est une valeur simple -->
      <div v-if="!isExpandable(value)" class="json-line">
        <span class="key-name">{{ key }}</span
        ><span class="punctuation">: </span>
        <span :class="valueClass(value)">{{ formatValue(value) }}</span>
        <span v-if="index < Object.keys(data).length - 1" class="punctuation"
          >,</span
        >
      </div>
    </template>
  </div>
</template>

<script setup>
import { reactive } from "vue";
import { VIcon } from "vuetify/components";

const props = defineProps({
  data: { type: [Object, Array], required: true },
});

const expanded = reactive({});

const isExpandable = (val) => val && typeof val === "object";
const typeOf = (val) => (Array.isArray(val) ? "Array" : "Object");

const toggle = (key) => {
  expanded[key] = !expanded[key];
};

const getObjectPreview = (val) => {
  if (Array.isArray(val)) {
    return val.length > 0 ? ` [${val.length}]` : " []";
  } else {
    const keys = Object.keys(val);
    return keys.length > 0 ? ` {${keys.length}}` : " {}";
  }
};

const formatValue = (val) => {
  if (typeof val === "string") return `"${val}"`;
  if (val === null) return "null";
  if (val === undefined) return "undefined";
  return String(val);
};

const valueClass = (val) => {
  if (typeof val === "string") return "text-green";
  if (typeof val === "number") return "text-blue";
  if (typeof val === "boolean") return "text-deep-purple";
  if (val === null) return "text-red";
  return "text-grey";
};
</script>

<style scoped>
.json-code-view {
  font-family: "JetBrains Mono", "Fira Code", "Roboto Mono", monospace;
  font-size: 12px;
  line-height: 1.2;
  background-color: rgba(0, 0, 0, 0.02);
  border-radius: 4px;
  padding: 4px 0;
}

.json-line {
  padding: 1px 0;
  white-space: nowrap;
}

.json-line:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.json-nested {
  border-left: 1px dotted rgba(0, 0, 0, 0.1);
}

.cursor-pointer {
  cursor: pointer;
}

.key-name {
  color: #8250df; /* Purple for keys */
  font-weight: 500;
}

.punctuation {
  color: #24292f; /* Dark gray for punctuation */
}

.type-info {
  color: #57606a; /* Lighter gray for type info */
  font-style: italic;
}

.text-green {
  color: #0a3622; /* Dark green for strings */
}

.text-blue {
  color: #0550ae; /* Bright blue for numbers */
}

.text-deep-purple {
  color: #8250df; /* Purple for booleans */
}

.text-grey {
  color: #57606a; /* Gray for misc */
}

.text-red {
  color: #cf222e; /* Red for null */
}
</style>