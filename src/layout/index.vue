<template>
  <div class="admin-theme layout">
    <!-- 顶部红色横幅 -->
    <header class="top-banner">
      <div class="brand">XXXX平台</div>
      <el-dropdown @command="handleCommand">
        <span class="user-info">
          {{ userInfo.username || '用户' }}
          <i class="el-icon-arrow-down el-icon--right"></i>
        </span>
        <el-dropdown-menu slot="dropdown">
          <el-dropdown-item command="logout">退出登录</el-dropdown-item>
        </el-dropdown-menu>
      </el-dropdown>
    </header>

    <!-- 面包屑 -->
    <div class="breadcrumb-bar">{{ $route.meta.title || '' }}</div>

    <!-- 页面级筛选栏（通栏命名视图，页面未注册时不渲染） -->
    <router-view name="filters" />

    <div class="body">
      <!-- 左栏：目录页签 + 菜单 -->
      <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
        <div class="catalog-bar">
          <div
            v-for="tab in catalogTabs"
            :key="tab.value"
            class="catalog-tab"
            :class="{ active: activeCatalog === tab.value }"
            @click="switchCatalog(tab.value)"
          >
            {{ tab.label }}
          </div>
          <div
            class="collapse-btn"
            :title="sidebarCollapsed ? '展开菜单' : '收起菜单'"
            @click="sidebarCollapsed = !sidebarCollapsed"
          >
            <i :class="sidebarCollapsed ? 'el-icon-d-arrow-right' : 'el-icon-d-arrow-left'"></i>
          </div>
        </div>

        <template v-if="!sidebarCollapsed">
          <div class="menu-search">
            <el-input
              v-model="menuKeyword"
              placeholder="请输入关键字搜索"
              suffix-icon="el-icon-search"
              size="small"
              clearable
            />
          </div>
          <nav class="menu">
            <template v-for="item in filteredMenus">
              <!-- 有子菜单的分组 -->
              <div v-if="item.children" :key="item.title" class="menu-group">
                <div
                  class="menu-item group-title"
                  :class="{ 'group-active': isGroupActive(item) }"
                  @click="item.open = !item.open"
                >
                  <i class="el-icon-folder menu-icon"></i>
                  <span class="menu-text">{{ item.title }}</span>
                  <i class="arrow" :class="item.open ? 'el-icon-arrow-up' : 'el-icon-arrow-down'"></i>
                </div>
                <div v-show="item.open" class="sub-menu">
                  <div
                    v-for="sub in item.children"
                    :key="sub.path"
                    class="menu-item sub-item"
                    :class="{ active: $route.path === sub.path }"
                    @click="go(sub.path)"
                  >
                    <i class="el-icon-document menu-icon"></i>
                    <span class="menu-text">{{ sub.title }}</span>
                  </div>
                </div>
              </div>
              <!-- 普通菜单项 -->
              <div
                v-else
                :key="item.path"
                class="menu-item"
                :class="{ active: $route.path === item.path }"
                @click="go(item.path)"
              >
                <i class="el-icon-folder menu-icon"></i>
                <span class="menu-text">{{ item.title }}</span>
              </div>
            </template>
            <div v-if="!filteredMenus.length" class="menu-empty">无匹配菜单</div>
          </nav>
        </template>
      </aside>

      <!-- 内容区 -->
      <main class="content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'

export default {
  name: 'LayoutIndex',
  data() {
    return {
      sidebarCollapsed: false,
      menuKeyword: '',
      activeCatalog: 'own',
      catalogTabs: [
        { label: '本单位目录', value: 'own' },
        { label: '公共资源目录', value: 'public' }
      ],
      menus: [
        { title: '订单管理', path: '/order' },
        { title: '账号管理', path: '/account' },
        { title: '系统管理', path: '/system' },
        {
          title: '站点管理',
          open: true,
          children: [
            { title: '站点分布', path: '/station/map' },
            { title: '基准站列表', path: '/station/list' },
            { title: '基准站质检统计', path: '/station/quality' }
          ]
        },
        { title: '卫星实时轨迹', path: '/satellite/track' },
        { title: '子网管理', path: '/subnet' },
        { title: '分区管理', path: '/region' },
        { title: '源节点管理', path: '/source-node' },
        { title: '告警管理', path: '/alarm' }
      ]
    }
  },
  computed: {
    ...mapState({
      userInfo: state => state.user.userInfo
    }),
    filteredMenus() {
      const kw = this.menuKeyword.trim()
      if (!kw) return this.menus
      const result = []
      this.menus.forEach(item => {
        if (item.children) {
          const children = item.children.filter(sub => sub.title.includes(kw))
          if (children.length || item.title.includes(kw)) {
            // 过滤结果中的分组保持展开，便于直接点击
            result.push({ ...item, open: true, children: children.length ? children : item.children })
          }
        } else if (item.title.includes(kw)) {
          result.push(item)
        }
      })
      return result
    }
  },
  created() {
    // 页面刷新后同步一次目录状态，保证页面内 mock 数据一致
    this.$bus.$emit('catalog-change', this.activeCatalog)
  },
  methods: {
    go(path) {
      if (this.$route.path !== path) this.$router.push(path)
    },
    isGroupActive(item) {
      return item.children.some(sub => sub.path === this.$route.path)
    },
    switchCatalog(value) {
      if (this.activeCatalog === value) return
      this.activeCatalog = value
      this.$bus.$emit('catalog-change', value)
    },
    handleCommand(command) {
      if (command === 'logout') {
        this.$store.dispatch('user/logout')
        this.$router.push('/login')
      }
    }
  }
}
</script>

<style scoped>
.layout {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f0f2f5;
}

/* 顶部红色横幅 */
.top-banner {
  height: 50px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: linear-gradient(90deg, #a30009 0%, #c7000b 45%, #e60012 100%);
  color: #fff;
}
.brand {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 2px;
}
.user-info {
  cursor: pointer;
  color: #fff;
  font-size: 14px;
}

/* 面包屑 */
.breadcrumb-bar {
  flex: none;
  padding: 10px 16px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  font-size: 13px;
  color: #333;
  font-weight: 600;
}

/* 主体 */
.body {
  flex: 1;
  display: flex;
  min-height: 0;
}

/* 左栏 */
.sidebar {
  width: 240px;
  flex: none;
  background: #fff;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
.sidebar.collapsed {
  width: auto;
}

/* 目录页签（左栏顶部） */
.catalog-bar {
  flex: none;
  display: flex;
  align-items: center;
  padding: 10px;
  background: #f0f2f5;
  border-bottom: 1px solid #e4e7ed;
}
.catalog-tab {
  padding: 7px 10px;
  border: 1px solid #c7000b;
  color: #c7000b;
  background: #fff;
  font-size: 13px;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
}
.catalog-tab:first-child {
  border-radius: 4px 0 0 4px;
}
.catalog-tab + .catalog-tab {
  border-left: none;
  border-radius: 0 4px 4px 0;
}
.catalog-tab.active {
  background: #c7000b;
  color: #fff;
}
.collapse-btn {
  margin-left: 6px;
  width: 30px;
  height: 30px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #c7000b;
  border-radius: 4px;
  color: #c7000b;
  background: #fff;
  cursor: pointer;
}
.collapse-btn:hover {
  background: #fdeeee;
}

/* 菜单搜索 */
.menu-search {
  flex: none;
  padding: 10px;
  border-bottom: 1px solid #f0f0f0;
}

/* 菜单树 */
.menu {
  padding: 8px;
  flex: 1;
}
.menu-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  margin-bottom: 6px;
  border-radius: 4px;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  user-select: none;
  border-left: 3px solid transparent;
}
.menu-item:hover {
  background: #fdeeee;
  color: #c7000b;
}
.menu-item.active {
  background: #fdeeee;
  color: #c7000b;
  border-left-color: #c7000b;
  font-weight: 600;
}
.menu-item.group-active {
  color: #c7000b;
}
.menu-icon {
  margin-right: 8px;
  font-size: 15px;
}
.menu-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.arrow {
  font-size: 12px;
  color: #999;
}
.sub-menu {
  padding-left: 14px;
}
.sub-item {
  padding: 8px 12px;
}
.menu-empty {
  padding: 20px 0;
  text-align: center;
  color: #999;
  font-size: 13px;
}

/* 内容区 */
.content {
  flex: 1;
  min-width: 0;
  overflow: auto;
  padding: 10px 16px 16px;
}
</style>
