import axios from 'axios'
import { Message, Loading } from 'element-ui'
import router from '@/router'
import store from '@/store'
import { getToken } from '@/utils/auth'

// 约定后端返回结构：{ code, data, message }，code === 200 表示成功。
// 若你的后端结构不同，只需改本文件的响应拦截器。
//
// 加载框：默认所有请求显示全屏加载框（并发请求共享一个实例，最后一个请求
// 结束时才关闭）。不需加载框的请求（如分片上传、轮询）在 config 传
// loading: false；自定义文案传 loadingText: 'xxx'。
const service = axios.create({
  baseURL: process.env.VUE_APP_BASE_API,
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

service.interceptors.request.use(
  config => {
    showLoading(config)
    const token = getToken()
    if (token) {
      config.headers.Authorization = 'Bearer ' + token
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
    const res = response.data
    if (res.code === 200) {
      return res
    }
    if (res.code === 401) {
      Message.error('登录已过期，请重新登录')
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
  // 通过 store 统一清理登录态（state + cookie/localStorage 同步清空）
  store.dispatch('user/clearAuth')
  if (router.currentRoute.path !== '/login') {
    router.push('/login')
  }
}

export default service
