import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue')
  },
  {
    path: '/screen',
    name: 'Screen',
    component: () => import('@/views/screen/index.vue')
  },
  {
    path: '/',
    component: () => import('@/layout/index.vue'),
    redirect: '/station/list',
    children: [
      {
        path: 'station/map',
        name: 'StationMap',
        components: {
          default: () => import('@/views/station/map.vue'),
          filters: () => import('@/views/station/components/MapFilter.vue')
        },
        meta: { title: '站点管理>站点分布', menu: '站点分布' }
      },
      {
        path: 'station/list',
        name: 'StationList',
        components: {
          default: () => import('@/views/station/list.vue'),
          filters: () => import('@/views/station/components/ListFilter.vue')
        },
        meta: { title: '站点管理>基准站列表', menu: '基准站列表' }
      },
      {
        path: 'station/quality',
        name: 'StationQuality',
        component: () => import('@/views/station/quality.vue'),
        meta: { title: '站点管理>基准站质检统计', menu: '基准站质检统计' }
      },
      {
        path: 'satellite/track',
        name: 'SatelliteTrack',
        component: () => import('@/views/satellite/track.vue'),
        meta: { title: '卫星管理>卫星实时轨迹', menu: '卫星实时轨迹' }
      },
      {
        path: 'satellite/if',
        name: 'SatelliteIf',
        component: () => import('@/views/satellite/if.vue'),
        meta: { title: '卫星管理>IF时序图', menu: 'IF时序图' }
      },
      {
        path: 'file/upload',
        name: 'FileUpload',
        component: () => import('@/views/file/upload.vue'),
        meta: { title: '文件管理>文件上传', menu: '文件上传' }
      },
      {
        path: 'order',
        name: 'Order',
        component: () => import('@/views/common/Placeholder.vue'),
        meta: { title: '订单管理', menu: '订单管理' }
      },
      {
        path: 'account',
        name: 'Account',
        component: () => import('@/views/common/Placeholder.vue'),
        meta: { title: '账号管理', menu: '账号管理' }
      },
      {
        path: 'system',
        name: 'System',
        component: () => import('@/views/common/Placeholder.vue'),
        meta: { title: '系统管理', menu: '系统管理' }
      },
      {
        path: 'subnet',
        name: 'Subnet',
        component: () => import('@/views/common/Placeholder.vue'),
        meta: { title: '子网管理', menu: '子网管理' }
      },
      {
        path: 'region',
        name: 'Region',
        component: () => import('@/views/common/Placeholder.vue'),
        meta: { title: '分区管理', menu: '分区管理' }
      },
      {
        path: 'source-node',
        name: 'SourceNode',
        component: () => import('@/views/common/Placeholder.vue'),
        meta: { title: '源节点管理', menu: '源节点管理' }
      },
      {
        path: 'alarm',
        name: 'Alarm',
        component: () => import('@/views/common/Placeholder.vue'),
        meta: { title: '告警管理', menu: '告警管理' }
      }
    ]
  },
  {
    path: '/404',
    name: 'NotFound',
    component: () => import('@/views/error/404.vue')
  },
  { path: '*', redirect: '/404' }
]

const router = new VueRouter({
  routes
})

// 跳过登录：所有路由直接放行
router.beforeEach((to, from, next) => {
  next()
})

export default router
