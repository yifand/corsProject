import axios from 'axios'
import { Message, Loading } from 'element-ui'
import router from '@/router'
import store from '@/store'
import { getToken, setToken } from '@/utils/auth'
import configTy from '../../config'
// 后端统一响应结构（接口文档 v1.0）：{ code, message, result }，
// code === '1000_001' 表示成功，业务结果看 code，HTTP 均为 200。
//
// token 生命周期（文档 1.5）：
// - 登录成功后 token 在响应头 Authorization 返回
// - 剩余不足 2 小时时后端会在任意响应的 Authorization 头下发新 token，
//   因此每个响应都检查该头，有值就覆盖本地 token（滚动续期）
//
// 加载框：默认所有请求显示全屏加载框（并发请求共享一个实例，最后一个请求
// 结束时才关闭）。不需加载框的请求（如分片上传、轮询）在 config 传
// loading: false；自定义文案传 loadingText: 'xxx'。
const service = axios.create({
  baseURL: configTy.api_path, // 同源请求：开发环境由 vue.config.js 代理到后端，生产与前端同源部署
  timeout: 10000
})

let loadingInstance = null
let pendingCount = 0

function showLoading(config) {
  if (config.loading === false) return
  pendingCount++
  if (!loadingInstance) {
    loadingInstance = Loading.service({
      lock: true,
      text: config.loadingText || '加载中...',
      background: 'rgba(0, 0, 0, 0.3)'
    })
  }
}

function hideLoading(config) {
  if (config.loading === false) return
  pendingCount = Math.max(0, pendingCount - 1)
  if (pendingCount === 0 && loadingInstance) {
    loadingInstance.close()
    loadingInstance = null
  }
}

// HTTP 状态码 → 用户可读提示
const HTTP_ERROR_MAP = {
  400: '请求参数错误',
  401: '登录已过期，请重新登录',
  403: '没有权限访问该资源',
  404: '请求的资源不存在',
  408: '请求超时，请稍后重试',
  500: '服务器内部错误',
  502: '网关错误',
  503: '服务不可用，请稍后重试',
  504: '网关超时'
}

// 登录态失效的业务错误码（文档 1.3）：清本地登录态并回登录页
const AUTH_FAIL_CODES = ['LOGIN_NotLogin', 'LOGIN_InvalidToken', 'LOGIN_KickOff', '1000_012', '1000_013']

service.interceptors.request.use(
  config => {
    showLoading(config)
    const token = getToken()
    if (token) {
      config.headers.token = 'Bearer ' + token
    }
    return config
  },
  error => {
    hideLoading(error.config || {})
    return Promise.reject(error)
  }
)

service.interceptors.response.use(
  response => {
    hideLoading(response.config)
    // 滚动续期：响应头 Authorization 有值就覆盖本地 token（含登录成功时的首次下发）
    const renewed = response.headers['authorization'] || response.headers['Authorization']
    if (renewed) {
      setToken(renewed)
      store.commit('user/SET_TOKEN', renewed)
    }
    const res = response.data
    if (res.code === '1000_001') {
      return res
    }
    if (AUTH_FAIL_CODES.includes(res.code)) {
      Message.error(res.message || '登录状态失效，请重新登录')
      handleUnauthorized()
    } else {
      Message.error(res.message || '请求失败')
    }
    return Promise.reject(new Error(res.message || 'Error'))
  },
  error => {
    hideLoading(error.config || {})
    if (error.code === 'ECONNABORTED') {
      // axios 超时（timeout 10s）
      Message.error('请求超时，请稍后重试')
    } else if (error.response) {
      const status = error.response.status
      Message.error(HTTP_ERROR_MAP[status] || `请求失败(${status})`)
      if (status === 401) {
        handleUnauthorized()
      }
    } else {
      // 无响应：断网或跨域被拦截
      Message.error('网络连接异常，请检查网络')
    }
    return Promise.reject(error)
  }
)

function handleUnauthorized() {
  // 通过 store 统一清理登录态（state + sessionStorage 同步清空）
  store.dispatch('user/clearAuth')
  if (router.currentRoute.path !== '/login') {
    router.push('/login')
  }
}

export default service
