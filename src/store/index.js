import Vue from 'vue'
import Vuex from 'vuex'
import { login } from '@/api/user'
import {
  getToken,
  removeToken,
  getUserInfo,
  setUserInfo,
  removeUserInfo
} from '@/utils/auth'

Vue.use(Vuex)

const user = {
  namespaced: true,
  state: {
    token: getToken(),
    userInfo: getUserInfo()
  },
  getters: {
    isLogin: state => !!state.token,
    username: state => state.userInfo.username || ''
  },
  mutations: {
    SET_TOKEN(state, token) {
      state.token = token
    },
    SET_USER_INFO(state, userInfo) {
      state.userInfo = userInfo
    },
    RESET_STATE(state) {
      state.token = ''
      state.userInfo = {}
    }
  },
  actions: {
    // 登录：接口返回 result: { accountName, role }；
    // token 在响应头 Authorization，已由 request.js 拦截器落盘
    login({ commit }, loginForm) {
      return login(loginForm).then(res => {
        const { accountName, role } = res.result || {}
        commit('SET_TOKEN', getToken())
        commit('SET_USER_INFO', { username: accountName, role })
        setUserInfo({ username: accountName, role })
      })
    },
    // 退出登录（用户主动操作）
    logout({ dispatch }) {
      dispatch('clearAuth')
    },
    // 清理登录态：store 与 localStorage 同步清空（401 时由 request.js 调用）
    clearAuth({ commit }) {
      commit('RESET_STATE')
      removeToken()
      removeUserInfo()
    }
  }
}

export default new Vuex.Store({
  modules: {
    user
  }
})
