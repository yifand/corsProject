<template>
  <div class="placeholder-page">
    <i class="el-icon-folder-opened placeholder-icon"></i>
    <p class="placeholder-text">{{ menuName }} 页面建设中</p>
  </div>
</template>

<script>
export default {
  name: 'PlaceholderPage',
  computed: {
    menuName() {
      return (this.$route.meta && this.$route.meta.menu) || '当前'
    }
  }
}
</script>

<style scoped>
.placeholder-page {
  height: 100%;
  min-height: 360px;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.placeholder-icon {
  font-size: 48px;
  color: #c7000b;
  opacity: 0.4;
}
.placeholder-text {
  margin-top: 12px;
  font-size: 14px;
  color: #999;
}
</style>
