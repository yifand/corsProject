<template>
  <!-- 基准站列表筛选栏（通栏，渲染于布局命名视图 filters） -->
  <div class="filter-bar">
    <div class="filter-item">
      <span class="filter-label">搜索类型:</span>
      <el-select v-model="filters.searchType" size="small" class="w-110">
        <el-option v-for="t in searchTypes" :key="t.value" :label="t.label" :value="t.value" />
      </el-select>
      <el-input
        v-model="filters.keyword"
        size="small"
        class="w-220"
        placeholder="请输入站名/组名/站点描述"
        clearable
        @keyup.enter.native="handleSearch"
      />
    </div>
    <div class="filter-item">
      <span class="filter-label">服务类型:</span>
      <el-select v-model="filters.serviceType" size="small" class="w-160">
        <el-option v-for="t in serviceTypeOptions" :key="t" :label="t" :value="t" />
      </el-select>
    </div>
    <div class="filter-item">
      <span class="filter-label">流量类型:</span>
      <el-select v-model="filters.flowType" size="small" class="w-160">
        <el-option v-for="t in flowTypeOptions" :key="t" :label="t" :value="t" />
      </el-select>
    </div>
    <div class="filter-actions">
      <el-button type="primary" size="small" @click="handleSearch">查 询</el-button>
      <el-button size="small" class="btn-plain-red" @click="handleReset">重 置</el-button>
    </div>
  </div>
</template>

<script>
import { SEARCH_TYPES, SERVICE_TYPE_OPTIONS, FLOW_TYPE_OPTIONS } from '@/mock/station'

const defaultFilters = () => ({
  searchType: 'name',
  keyword: '',
  serviceType: '全部',
  flowType: '所有'
})

export default {
  name: 'ListFilter',
  data() {
    return {
      filters: defaultFilters(),
      searchTypes: SEARCH_TYPES,
      serviceTypeOptions: SERVICE_TYPE_OPTIONS,
      flowTypeOptions: FLOW_TYPE_OPTIONS
    }
  },
  methods: {
    handleSearch() {
      this.$bus.$emit('station-list-filter', { ...this.filters })
    },
    handleReset() {
      this.filters = defaultFilters()
      this.handleSearch()
    }
  }
}
</script>

<style scoped>
.filter-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
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
  white-space: nowrap;
}
.filter-actions {
  margin-left: auto;
  display: flex;
  gap: 10px;
}
.w-110 {
  width: 110px;
}
.w-160 {
  width: 160px;
}
.w-220 {
  width: 220px;
}
</style>
