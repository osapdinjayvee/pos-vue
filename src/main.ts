import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import { definePreset } from '@primeuix/themes'
import Lara from '@primeuix/themes/lara'

const MyPreset = definePreset(Lara, {
  semantic: {
    primary: {
      50: '#f0f7ff',
      100: '#e0effe',
      200: '#b8dafd',
      300: '#7abffd',
      400: '#18a0fd',
      500: '#188afd',
      600: '#1470d4',
      700: '#1059ab',
      800: '#0c4382',
      900: '#092f5c',
      950: '#061d3a'
    }
  }
})
import ConfirmationService from 'primevue/confirmationservice'
import ToastService from 'primevue/toastservice'
import Tooltip from 'primevue/tooltip'

import 'primeicons/primeicons.css'
import './assets/styles/main.css'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(PrimeVue, {
  theme: {
    preset: MyPreset,
    options: {
      darkModeSelector: '.app-dark'
    }
  },
})
app.use(ConfirmationService)
app.use(ToastService)
app.directive('tooltip', Tooltip)

// Set document title from env
document.title = import.meta.env.VITE_APP_NAME || 'Zoomin POS'

// Auto-select InputNumber value on focus (no need to backspace 0.00)
document.addEventListener('focusin', (e) => {
  const target = e.target as HTMLElement
  if (target.tagName === 'INPUT' && target.closest('.p-inputnumber')) {
    const input = target as HTMLInputElement
    requestAnimationFrame(() => input.select())
  }
})

app.mount('#app')
