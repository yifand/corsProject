<template>
  <div class="quality-page">
    <div class="chart-card">
      <div class="chart-title">QI 质量指标</div>
      <div ref="qiChart" class="chart-body"></div>
    </div>
    <div class="chart-card">
      <div class="chart-title">NSTA 卫星数</div>
      <div ref="nstaChart" class="chart-body"></div>
    </div>
  </div>
</template>

<script>
import * as echarts from 'echarts'
import qualityData from '@/mock/quality.json'

export default {
  name: 'StationQuality',
  data() {
    return {
      qiChart: null,
      nstaChart: null
    }
  },
  computed: {
    times() {
      return qualityData.map(item => Object.keys(item)[0])
    },
    // 按首次出现顺序收集全部 prn
    prnList() {
      const list = []
      const seen = new Set()
      qualityData.forEach(item => {
        const records = item[Object.keys(item)[0]] || []
        records.forEach(({ prn }) => {
          if (!seen.has(prn)) {
            seen.add(prn)
            list.push(prn)
          }
        })
      })
      return list
    }
  },
  mounted() {
    this.qiChart = echarts.init(this.$refs.qiChart)
    this.nstaChart = echarts.init(this.$refs.nstaChart)
    this.qiChart.setOption(this.buildOption('QI', 'qi'))
    this.nstaChart.setOption(this.buildOption('NSTA', 'nsta'))
    window.addEventListener('resize', this.handleResize)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.handleResize)
    if (this.qiChart) this.qiChart.dispose()
    if (this.nstaChart) this.nstaChart.dispose()
  },
  methods: {
    buildSeries(field) {
      const times = this.times
      return this.prnList.map(prn => ({
        name: prn,
        type: 'line',
        showSymbol: false,
        data: qualityData.map((item, index) => {
          const records = item[times[index]] || []
          const found = records.find(r => r.prn === prn)
          return found ? found[field] : null
        })
      }))
    },
    buildOption(name, field) {
      return {
        tooltip: { trigger: 'axis' },
        legend: { type: 'scroll', top: 0 },
        grid: { top: 40, left: 50, right: 30, bottom: 60 },
        xAxis: { type: 'category', data: this.times },
        yAxis: { type: 'value', name, scale: true },
        dataZoom: [
          { type: 'inside' },
          { type: 'slider', bottom: 10 }
        ],
        series: this.buildSeries(field)
      }
    },
    handleResize() {
      if (this.qiChart) this.qiChart.resize()
      if (this.nstaChart) this.nstaChart.resize()
    }
  }
}
</script>

<style scoped>
.quality-page {
  padding: 16px;
}
.chart-card {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 16px;
  margin-bottom: 16px;
}
.chart-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}
.chart-body {
  height: 400px;
}
</style>
