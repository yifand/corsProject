const TOKEN_KEY = 'admin_token'
const USER_INFO_KEY = 'userInfo'

// 按接口文档 1.5 建议：token/userInfo 存 sessionStorage，
// 页内刷新保持登录，关闭浏览器/标签页后需重新登录。
export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY) || ''
}

export function setToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token || '')
}

export function removeToken() {
  sessionStorage.removeItem(TOKEN_KEY)
}

export function getUserInfo() {
  const str = sessionStorage.getItem(USER_INFO_KEY)
  try {
    return str ? JSON.parse(str) : {}
  } catch (e) {
    return {}
  }
}

export function setUserInfo(userInfo) {
  sessionStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo || {}))
}

export function removeUserInfo() {
  sessionStorage.removeItem(USER_INFO_KEY)
}
