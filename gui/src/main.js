import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

// Icons
import '@mdi/font/css/materialdesignicons.css'
// Import du thème compact personnalisé
import './assets/compact-theme.css'

const vuetify = createVuetify({
    components,
    directives,
    defaults: {
        // Paramètres par défaut pour les composants Vuetify (en mode normal)
        VBtn: { }, // Pas de density ou size par défaut
        VTextField: { variant: 'outlined', hideDetails: true },
        VCard: { },
        VList: { },
        VSelect: { hideDetails: true },
        VMenu: { },
        VChip: { },
        VTable: { },
        VDialog: { maxWidth: '800px' },
        VAlert: { },
        VPagination: { },
        VDataTable: { },
        VTabs: { },
    },
    theme: {
        defaultTheme: 'light',
        themes: {
            light: {
                colors: {
                    primary: '#1976D2',
                    secondary: '#424242',
                    accent: '#82B1FF',
                    error: '#FF5252',
                    info: '#2196F3',
                    success: '#4CAF50',
                    warning: '#FFC107',
                },
            },
            dark: {
                colors: {
                    primary: '#2196F3',
                    secondary: '#424242',
                    accent: '#FF4081',
                    error: '#FF5252',
                    info: '#2196F3',
                    success: '#4CAF50',
                    warning: '#FB8C00',
                },
            },
        },
    },
})

const pinia = createPinia()

createApp(App)
    .use(pinia)
    .use(vuetify)
    .mount('#app')