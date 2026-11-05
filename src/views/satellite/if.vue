<template>
  <div class="if-page">
    <!-- 工具条：日期筛选 + 系统筛选 -->
    <div class="toolbar">
      <el-date-picker v-model="selectedDate" type="date" value-format="yyyyMMdd" :clearable="false" size="mini"
        @change="load" />
      <el-checkbox-group v-model="checkedSystems" size="mini" @change="renderChart">
        <el-checkbox v-for="sys in systems" :key="sys.key" :label="sys.key">{{ sys.label }}</el-checkbox>
      </el-checkbox-group>
      <span class="stat">{{ epochs.length ? `共 ${epochs.length} 个历元 / ${visibleSats.length} 颗卫星` : '无数据' }}</span>
    </div>

    <!-- 折线图 -->
    <div class="chart-card">
      <div ref="chart" class="chart-body"></div>
    </div>
  </div>
</template>

<script>
// 对接后端时：把 ./data 的静态样本换成 @/api/satellite 的 getSateqiEpoch(date)，返回结构一致
import * as echarts from 'echarts'
import { data as sateqiData } from './data'

/* 卫星系统：prn 前缀 -> 名称（与 track.vue 约定一致） */
const SYSTEM_MAP = {
  G: { label: 'GPS' },
  R: { label: 'GLONASS' },
  E: { label: 'Galileo' },
  C: { label: 'BDS' },
  J: { label: 'QZSS' }
}

export default {
  name: 'SatelliteIf',
  data() {
    return {
      chart: null,
      selectedDate: this.defaultDate(),
      epochs: [], // 排序后的历元 key（'2026-11-01T06:20'）
      epochIndex: {}, // 历元 -> { prn -> 点位 }
      prns: [], // 当日全部卫星 prn（排序后）
      checkedSystems: Object.keys(SYSTEM_MAP)
    }
  },
  computed: {
    systems() {
      return Object.keys(SYSTEM_MAP).map(k => ({ key: k, label: SYSTEM_MAP[k].label }))
    },
    visibleSats() {
      return this.prns.filter(prn => this.checkedSystems.includes(prn[0]))
    }
  },
  mounted() {
    this.chart = echarts.init(this.$refs.chart)
    this.load(this.selectedDate)
    window.addEventListener('resize', this.handleResize)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.handleResize)
    if (this.chart) this.chart.dispose()
  },
  methods: {
    fmtDate(d) {
      const p = n => String(n).padStart(2, '0')
      return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`
    },
    // 默认选中数据里首个历元的日期（yyyyMMdd）
    defaultDate() {
      const first = Object.keys((sateqiData && sateqiData.data) || {}).sort()[0]
      return first ? first.slice(0, 10).replace(/-/g, '') : this.fmtDate(new Date())
    },
    // 按日期筛选历元（date 格式 yyyyMMdd）
    // 对接后端时：改为 getSateqiEpoch(date).then(res => ...)，返回结构一致
    load(date) {
      if (!date) return
      const prefix = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`
      const all = (sateqiData && sateqiData.data) || {}
      this.epochs = Object.keys(all).filter(k => k.startsWith(prefix)).sort()
      // 每历元 prn 索引，buildSeries 复用
      this.epochIndex = {}
      const seen = {}
      this.epochs.forEach(e => {
        const map = {}
          ; (all[e] || []).forEach(p => {
            map[p.prn] = p
            seen[p.prn] = true
          })
        this.epochIndex[e] = map
      })
      this.prns = Object.keys(seen).sort()
      this.renderChart()
    },
    // 每颗卫星一条线：X 轴为历元（HH:mm），Y 轴为 ifVal，缺失历元补 null
    buildSeries() {
      return this.visibleSats.map(prn => ({
        name: prn,
        type: 'line',
        showSymbol: false,
        data: this.epochs.map(e => {
          const p = this.epochIndex[e][prn]
          return p ? p.ifVal : null
        })
      }))
    },
    renderChart() {
      if (!this.chart) return
      // 图例四列：单个 legend 不支持多列，拆成 4 个纵向 legend 并排
      const cols = 4
      this.chart.setOption({
        tooltip: { trigger: 'axis' },
        legend: { type: 'scroll', top: 0 },
        grid: { top: 40, left: 50, right: 30, bottom: 60 },
        xAxis: { type: 'category', data: this.epochs.map(e => e.slice(11)) },
        yAxis: { type: 'value', name: 'IF', min: 0, max: 8 },
        dataZoom: [
          { type: 'inside' },
          { type: 'slider', bottom: 10 }
        ],
        series: this.buildSeries()
      }, true)
    },
    handleResize() {
      if (this.chart) this.chart.resize()
    }
  }
}
</script>

<style scoped>
.if-page {
  padding: 16px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.stat {
  font-size: 13px;
  color: #909399;
}

.chart-card {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 16px;
}

.chart-body {
  height: 520px;
}
</style>
