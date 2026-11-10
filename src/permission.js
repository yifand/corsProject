import router from '@/router'
import { getToken } from '@/utils/auth'

const whiteList = ['/login', '/404']

router.beforeEach((to, from, next) => {
  const hasToken = getToken()
  if (hasToken) {
    // 已登录访问登录页 → 回首页
    if (to.path === '/login') next({ path: '/' })
    else next()
  } else if (whiteList.includes(to.path)) {
    next()
  } else {
    // 未登录 → 跳登录页，带上 redirect 以便登录后原路返回
    next({ path: '/login', query: { redirect: to.fullPath } })
  }
})

// 浏览器标签页标题：优先取路由 meta.title
router.afterEach(to => {
  const base = '后台管理系统'
  document.title = to.meta && to.meta.title ? `${to.meta.title} - ${base}` : base
})
