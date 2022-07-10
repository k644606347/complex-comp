import Vue from 'vue'
import VueRouter from 'vue-router'
import router from './router'
import store from './store'
import App from './App.vue'
import './registerServiceWorker'

Vue.use(VueRouter)

Vue.config.productionTip = false
Vue.config.performance = true;
Vue.config.devtools = true;


new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
