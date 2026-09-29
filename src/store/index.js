import Vue from 'vue'
import Vuex from 'vuex'
import { login } from '@/api/user'
import { getToken, setToken, removeToken } from '@/utils/auth'

Vue.use(Vuex)

const user = {
  namespaced: true,
  state: {
    token: getToken(),
    userInfo: JSON.parse(localStorage.getItem('userInfo') || '{"username":"admin"}')
  },
  mutations: {
    SET_TOKEN(state, token) {
      state.token = token
    },
    SET_USER_INFO(state, userInfo) {
      state.userInfo = userInfo
    }
  },
  actions: {
    // 登录：约定接口返回 data: { token, userInfo }
    login({ commit }, loginForm) {
      return login(loginForm).then(res => {
        const { token, userInfo } = res.data
        commit('SET_TOKEN', token)
        commit('SET_USER_INFO', userInfo)
        setToken(token)
        localStorage.setItem('userInfo', JSON.stringify(userInfo))
      })
    },
    logout({ commit }) {
      commit('SET_TOKEN', '')
      commit('SET_USER_INFO', {})
      removeToken()
      localStorage.removeItem('userInfo')
    }
  }
}

export default new Vuex.Store({
  modules: {
    user
  }
})
