import './assets/main.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import format from './utils/format'

const app = createApp(App)
app.config.globalProperties.$format = format

app.use(createPinia())
app.use(router)
app.mount('#app')