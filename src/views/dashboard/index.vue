<template>
  <div>
    <el-row :gutter="20">
      <el-col :span="6" v-for="card in cards" :key="card.title">
        <el-card shadow="hover">
          <div class="card-title">{{ card.title }}</div>
          <div class="card-value">{{ card.value }}</div>
        </el-card>
      </el-col>
    </el-row>
    <el-card class="welcome-card" shadow="never">
      <p>欢迎使用后台管理系统。</p>
      <p class="tip">左侧菜单可进入「用户管理」进行增删改查操作。</p>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'DashboardPage',
  data() {
    return {
      // 占位数据，接入后端后可替换为真实统计接口
      cards: [
        { title: '用户总数', value: '--' },
        { title: '今日访问', value: '--' },
        { title: '订单数', value: '--' },
        { title: '待办事项', value: '--' }
      ]
    }
  }
}
</script>

<style scoped>
.card-title {
  color: #909399;
  font-size: 14px;
}
.card-value {
  margin-top: 12px;
  font-size: 28px;
  font-weight: 600;
  color: #303133;
}
.welcome-card {
  margin-top: 20px;
}
.tip {
  color: #909399;
}
</style>
