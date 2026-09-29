import axios from 'axios'
import { Message } from 'element-ui'
import router from '@/router'
import { getToken, removeToken } from '@/utils/auth'

// 约定后端返回结构：{ code, data, message }，code === 200 表示成功。
// 若你的后端结构不同，只需改本文件的响应拦截器。
const service = axios.create({
  baseURL: process.env.VUE_APP_BASE_API,
  timeout: 10000
})

service.interceptors.request.use(
  config => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = 'Bearer ' + token
    }
    return config
  },
  error => Promise.reject(error)
)

service.interceptors.response.use(
  response => {
    const res = response.data
    if (res.code !== 200) {
      Message.error(res.message || '请求失败')
      if (res.code === 401) {
        handleUnauthorized()
      }
      return Promise.reject(new Error(res.message || 'Error'))
    }
    return res
  },
  error => {
    if (error.response && error.response.status === 401) {
      handleUnauthorized()
      Message.error('登录已过期，请重新登录')
    } else {
      Message.error(error.message || '网络错误，请稍后重试')
    }
    return Promise.reject(error)
  }
)

function handleUnauthorized() {
  removeToken()
  localStorage.removeItem('userInfo')
  if (router.currentRoute.path !== '/login') {
    router.push('/login')
  }
}

export default service
