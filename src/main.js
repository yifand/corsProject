import Vue from 'vue'
import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
import App from './App.vue'
import router from './router'
import store from './store'
import '@/permission'
import '@/assets/css/font.css'
import '@/assets/css/admin-theme.css'
import 'amfe-flexible'
Vue.use(ElementUI)

// 轻量事件总线：布局与页面间通信（如目录页签切换）
Vue.prototype.$bus = new Vue()
Vue.config.productionTip = false

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
