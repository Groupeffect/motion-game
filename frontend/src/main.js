import { createApp } from 'vue'
import App from './App.vue'
import './registerServiceWorker'
import router from './router'
import { createPinia } from 'pinia'
import { definePiniaOrmPlugin } from 'pinia-orm'

const pinia = createPinia()
pinia.use(definePiniaOrmPlugin())

createApp(App).use(pinia).use(router).mount('#app')
