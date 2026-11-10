const TOKEN_KEY = 'admin_token'
const USER_INFO_KEY = 'userInfo'

// token 用 cookie 暂存：会话级（浏览器关闭即失效），刷新页面仍保持登录。
// 如需长期有效，调用 setToken(token, expiresDays) 传入有效天数。
export function getToken() {
  const match = document.cookie.match(new RegExp('(?:^|; )' + TOKEN_KEY + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : ''
}

export function setToken(token, expiresDays) {
  let str = TOKEN_KEY + '=' + encodeURIComponent(token) + '; path=/; SameSite=Lax'
  if (expiresDays) {
    const date = new Date()
    date.setTime(date.getTime() + expiresDays * 24 * 60 * 60 * 1000)
    str += '; expires=' + date.toUTCString()
  }
  document.cookie = str
}

export function removeToken() {
  document.cookie = TOKEN_KEY + '=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
}

// userInfo 仍存 localStorage
export function getUserInfo() {
  const str = localStorage.getItem(USER_INFO_KEY)
  try {
    return str ? JSON.parse(str) : {}
  } catch (e) {
    return {}
  }
}

export function setUserInfo(userInfo) {
  localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo || {}))
}

export function removeUserInfo() {
  localStorage.removeItem(USER_INFO_KEY)
}
