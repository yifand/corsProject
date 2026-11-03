<template>
  <!-- 站点分布筛选栏（通栏，渲染于布局命名视图 filters） -->
  <div class="filter-bar">
    <div class="filter-item">
      <span class="filter-label">分组:</span>
      <el-select v-model="filters.group" size="small" class="w-160" @change="emitFilter">
        <el-option v-for="g in groupOptions" :key="g" :label="g" :value="g" />
      </el-select>
    </div>
    <div class="filter-item">
      <span class="filter-label">区域:</span>
      <el-select v-model="filters.region" size="small" class="w-160" @change="emitFilter">
        <el-option v-for="r in regionOptions" :key="r" :label="r" :value="r" />
      </el-select>
    </div>
  </div>
</template>

<script>
import { MAP_GROUPS, MAP_REGIONS } from '@/mock/station'

export default {
  name: 'MapFilter',
  data() {
    return {
      filters: { group: '所有分组', region: '全部' },
      groupOptions: MAP_GROUPS,
      regionOptions: ['全部', ...MAP_REGIONS]
    }
  },
  methods: {
    emitFilter() {
      this.$bus.$emit('station-map-filter', { ...this.filters })
    }
  }
}
</script>

<style scoped>
.filter-bar {
  display: flex;
  align-items: center;
  gap: 18px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 12px 16px;
}
.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.filter-label {
  font-size: 13px;
  color: #333;
}
.w-160 {
  width: 160px;
}
</style>
