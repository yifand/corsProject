<template>
  <div class="screen">
    <!-- 顶部 -->
    <Header :now="now"></Header>

    <!-- 中部三列 -->
    <div class="screen-main">
      <!-- 左列 -->
      <div class="col col-left">
        <Panel title="基准站" class="panel-base">
          <div class="stat-row">
            <template v-for="(s, i) in baseStations">
              <div class="stat-item" :key="i">
                <div class="stat-num" :style="{ color: s.color }">
                  {{ s.value }}<span class="up">个</span>
                </div>
                <div class="stat-label">{{ s.label }}</div>
              </div>
              <img v-if="i < baseStations.length - 1" :key="'divider-' + i" class="stat-divider"
                src="~@/assets/images/分割线.png" alt="" />
            </template>
          </div>
        </Panel>

        <Panel title="服务端口" class="panel-port">
          <div class="port-row" v-for="(p, i) in ports" :key="i">
            <span>端口：{{ p.port }}</span>
            <span class="port-zbx">坐标系：{{ p.system }}</span>
          </div>
        </Panel>

        <Panel title="用户分布" class="panel-dist">
          <div ref="distChart" class="chart"></div>
        </Panel>
      </div>

      <!-- 中列 -->
      <div class="col col-center">
        <div class="locate-count">
          定位服务次数：<span class="count-num">2793</span><span class="count-unit">次</span>
        </div>
        <div class="map-wrap">
          <!-- <Map3D /> -->
        </div>
      </div>

      <!-- 右列 -->
      <div class="col col-right">
        <Panel title="帐号统计" class="panel-account">
          <div class="acc-top">
            <div class="acc-item">
              <div class="acc-num orange">98975</div>
              <div class="acc-label">激活帐号数（累计）</div>
              <div class="acc-icon icon-red"></div>
            </div>
            <div class="acc-item">
              <div class="acc-num yellow">732138</div>
              <div class="acc-label">激活帐号数（新增）</div>
              <div class="acc-icon icon-yellow"></div>
            </div>
          </div>
          <div class="acc-bottom">
            <div class="acc-item">
              <div class="acc-num active">738</div>
              <div class="acc-label">活跃帐号数</div>
              <div class="acc-icon icon-active"></div>
            </div>
            <div class="acc-item">
              <div class="acc-num concurrency">738</div>
              <div class="acc-label">并发数</div>
              <div class="acc-icon icon-concurrency"></div>
            </div>
            <div class="acc-item">
              <div class="acc-num account">738</div>
              <div class="acc-label">用户数</div>
              <div class="acc-icon icon-account"></div>
            </div>

          </div>
        </Panel>

        <Panel title="异常行为" class="panel-abnormal">
          <div ref="abnormalChart" class="chart"></div>
        </Panel>
      </div>
    </div>

    <!-- 底部四张表 -->
    <div class="screen-bottom">
      <Panel title="资源监控（含数据库+中间件）" class="bottom-table">
        <el-table :data="resourceRows" size="mini" highlight-current-row>
          <el-table-column prop="module" label="模块" min-width="70px" show-overflow-tooltip />
          <el-table-column prop="cpu" label="CPU" min-width="70px" show-overflow-tooltip />
          <el-table-column prop="memory" label="内存" min-width="70px" show-overflow-tooltip />
          <el-table-column prop="io" label="IO" min-width="70px" show-overflow-tooltip />
          <el-table-column prop="time" label="时间" min-width="100px" show-overflow-tooltip />
        </el-table>
      </Panel>
      <Panel title="应用告警" class="bottom-table">
        <el-table :data="alarmRows" size="mini" highlight-current-row>
          <el-table-column prop="module" label="模块" show-overflow-tooltip min-width="60px" />
          <el-table-column prop="type" label="类型" show-overflow-tooltip min-width="50px" />
          <el-table-column prop="count" label="次数" show-overflow-tooltip min-width="60px" />
          <el-table-column prop="time" label="时间" show-overflow-tooltip min-width="60px" />
          <el-table-column prop="restart" label="重启" show-overflow-tooltip min-width="50px" />
          <el-table-column prop="cpuOver" label="CPU超限" show-overflow-tooltip min-width="80px" />
          <el-table-column prop="ioOver" label="IO超限" show-overflow-tooltip min-width="80px" />
        </el-table>
      </Panel>
      <Panel title="异常日志" class="bottom-table">
        <el-table :data="logRows" size="mini" highlight-current-row>
          <el-table-column prop="module" label="模块" />
          <el-table-column prop="log" label="日志" show-overflow-tooltip />
          <el-table-column prop="count" label="次数" />
          <el-table-column prop="time" label="时间" min-width="80px" show-overflow-tooltip />
        </el-table>
      </Panel>
      <Panel title="连通性监控" class="bottom-table">
        <el-table :data="connRows" size="mini" highlight-current-row>
          <el-table-column prop="type" label="类型" />
          <el-table-column label="状态">
            <template slot-scope="{ row }">
              <span :class="row.status === '正常' ? 'ok' : 'bad'">{{ row.status }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="time" label="时间" show-overflow-tooltip min-width="60px" />
        </el-table>
      </Panel>
    </div>
  </div>
</template>

<script>
import * as echarts from 'echarts'
import Panel from './components/Panel.vue'
import Header from './components/Header.vue'
import Map3D from './components/Map3D.vue'

export default {
  name: 'ScreenPage',
  components: { Panel, Header, Map3D },
  data() {
    return {
      now: '',
      timer: null,
      charts: [],
      baseStations: [
        { value: 100, label: '虚拟基站数', color: '#ff5b6a' },
        { value: 100, label: '虚拟基站数', color: '#ffa940' },
        { value: 100, label: '虚拟基站数', color: '#00e4ff' }
      ],
      ports: [
        { port: 8101, system: 'CGCS2000-ITRF08' },
        { port: 8102, system: 'WGS84' },
        { port: 8103, system: 'ITRF08' }
      ],
      accountStats: ['活跃帐号数', '并发数', '当前用户数'],
      resourceRows: [1, 2, 3].map(() => ({
        module: '模块一',
        cpu: 'CPU名字',
        memory: '内存名字',
        io: 'IO名字',
        time: '07-27 16:32:28'
      })),
      alarmRows: [1, 2, 3].map(() => ({
        module: '模块001',
        type: 'XXX',
        count: 1234,
        time: '07-29',
        restart: '是',
        cpuOver: 'CPU名字',
        ioOver: 'IO名字'
      })),
      logRows: [1, 2, 3].map(() => ({
        module: '模块 003',
        log: '39908546',
        count: '81922',
        time: '07-29 16:33:33'
      })),
      connRows: [
        { type: '解算-播发', status: '正常', time: '2026-07-29' },
        { type: '解算-播发', status: '断连', time: '2026-07-29' },
        { type: '解算-播发', status: '正常', time: '2026-07-29' }
      ]
    }
  },
  mounted() {
    this.tick()
    this.timer = setInterval(this.tick, 1000)
    this.$nextTick(() => {
      this.initDistChart()
      this.initAbnormalChart()
    })
    window.addEventListener('resize', this.resizeCharts)
  },
  beforeDestroy() {
    clearInterval(this.timer)
    window.removeEventListener('resize', this.resizeCharts)
    this.charts.forEach(c => c.dispose())
  },
  methods: {
    tick() {
      const d = new Date()
      const p = n => String(n).padStart(2, '0')
      this.now = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
    },
    resizeCharts() {
      this.charts.forEach(c => c.resize())
    },
    initDistChart() {
      const chart = echarts.init(this.$refs.distChart)
      chart.setOption({
        textStyle: { fontFamily: 'PingFangSC' },
        grid: { left: 40, right: 10, top: 15, bottom: 25 },
        xAxis: {
          type: 'category',
          data: ['临安区', '富阳区', '钱塘区', '临平区', '滨江区'],
          axisLine: { lineStyle: { color: 'rgba(120,180,255,.4)' } },
          axisLabel: { color: '#9cc8ee', fontSize: 11 },
          axisTick: { show: false }
        },
        yAxis: {
          type: 'value',
          splitLine: { lineStyle: { color: 'rgba(120,180,255,.12)' } },
          axisLabel: { color: '#9cc8ee', fontSize: 11 }
        },
        series: [{
          type: 'line',
          smooth: true,
          symbol: 'none',
          data: [260, 780, 480, 820, 430],
          lineStyle: { color: '#35c4ff', width: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(53,196,255,.45)' },
              { offset: 1, color: 'rgba(53,196,255,.02)' }
            ])
          }
        }]
      })
      this.charts.push(chart)
    },
    initAbnormalChart() {
      const chart = echarts.init(this.$refs.abnormalChart)
      chart.setOption({
        textStyle: { fontFamily: 'PingFangSC' },
        grid: { left: 35, right: 10, top: 30, bottom: 25 },
        legend: {
          top: 0,
          icon: 'rect',
          itemWidth: 16,
          itemHeight: 3,
          textStyle: { color: '#9cc8ee', fontSize: 12, lineHeight: 12 },
          data: ['黑名单', '异常行为', '非黑名单', '异常登录', '未激活']
        },
        xAxis: {
          type: 'category',
          data: ['0720', '0722', '0724', '0726', '0727'],
          axisLine: { lineStyle: { color: 'rgba(120,180,255,.4)' } },
          axisLabel: { color: '#9cc8ee', fontSize: 11 },
          axisTick: { show: false }
        },
        yAxis: {
          type: 'value',
          splitLine: { lineStyle: { color: 'rgba(120,180,255,.12)' } },
          axisLabel: { color: '#9cc8ee', fontSize: 11 }
        },
        series: [
          { name: '黑名单', type: 'bar', barWidth: 10, data: [17, null, null, null, null], itemStyle: { color: '#4f8ff7' } },
          { name: '异常行为', type: 'bar', barWidth: 10, data: [null, 26, null, null, null], itemStyle: { color: '#2fd6ff' } },
          { name: '非黑名单', type: 'bar', barWidth: 10, data: [null, null, 21, null, null], itemStyle: { color: '#8f9ff7' } },
          { name: '异常登录', type: 'bar', barWidth: 10, data: [null, null, null, 14, null], itemStyle: { color: '#5ef0b0' } },
          { name: '未激活', type: 'bar', barWidth: 10, data: [null, null, null, null, 17], itemStyle: { color: '#f7e28f' } }
        ]
      })
      this.charts.push(chart)
    }
  }
}
</script>

<style scoped lang="less">
.screen {
  width: 100vw;
  height: 100vh;
  min-width: 1280Px;
  min-height: 700Px;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #041b3a 0%, #02102a 100%);
  color: #cfe8ff;
  font-family: PingFangSC, "PingFang SC", "Microsoft YaHei", sans-serif;
  overflow: auto;
  box-sizing: border-box;
  padding: 0 0 16px;

  /* 深色科技风滚动条 */
  &::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 60, 120, 0.15);
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 3px;
    background: linear-gradient(180deg, rgba(0, 200, 255, 0.5), rgba(0, 120, 255, 0.5));

    &:hover {
      background: linear-gradient(180deg, rgba(0, 200, 255, 0.8), rgba(0, 120, 255, 0.8));
    }
  }

  /* el-table 内部横向滚动条同样处理 */
  ::v-deep .el-table__body-wrapper {
    &::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }

    &::-webkit-scrollbar-track {
      background: rgba(0, 60, 120, 0.15);
    }

    &::-webkit-scrollbar-thumb {
      border-radius: 3px;
      background: linear-gradient(180deg, rgba(0, 200, 255, 0.5), rgba(0, 120, 255, 0.5));

      &:hover {
        background: linear-gradient(180deg, rgba(0, 200, 255, 0.8), rgba(0, 120, 255, 0.8));
      }
    }
  }
}

/* 顶部 */
.screen-header {
  position: relative;
  height: 84px;
  flex-shrink: 0;
}

.header-title {
  margin: 0;
  padding-top: 18px;
  text-align: center;
  font-size: 34px;
  letter-spacing: 6px;
  color: #eaf6ff;
  text-shadow: 0 0 18px rgba(0, 200, 255, 0.9), 0 0 40px rgba(0, 140, 255, 0.5);
}

.header-tabs {
  position: absolute;
  left: 120px;
  top: 38px;
  display: flex;
  gap: 12px;
}

.tab {
  padding: 4px 22px;
  font-size: 14px;
  color: #bfe4ff;
  background: rgba(0, 100, 200, 0.25);
  border: 1px solid rgba(0, 180, 255, 0.4);
  border-radius: 12px 2px 12px 2px;
  cursor: pointer;
}

.tab.active {
  background: linear-gradient(90deg, #0b6fd4, #0a4d9e);
  box-shadow: 0 0 10px rgba(0, 160, 255, 0.6);
}

.header-time {
  position: absolute;
  right: 120px;
  top: 42px;
  font-size: 16px;
  color: #bfe4ff;
  letter-spacing: 1px;
}

.header-line {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 8px;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(0, 200, 255, 0.7) 30%, #7fe9ff 50%, rgba(0, 200, 255, 0.7) 70%, transparent);
  box-shadow: 0 0 12px rgba(0, 200, 255, 0.6);
}

/* 中部 */
.screen-main {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 14px;
  padding: 0 16px;
}

.col {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
}

.col-left,
.col-right {
  width: 25%;
  flex-shrink: 0;
}

.col-center {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.panel-base {
  height: 22%;

  /deep/.panel-body {
    padding: 18px;
    background: url('~@/assets/images/框(2).png');
    background-size: 100% 100%;
  }
}

.panel-port {
  height: 190px;

  /deep/.panel-body {
    padding: 18px;
    background: url('~@/assets/images/框(2).png');
    background-size: 100% 100%;
  }
}

.panel-dist {
  flex: 1;
}

.panel-account {
  height: 52%;
}

.panel-abnormal {
  flex: 1;
}

/* 基准站 */
.stat-row {
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}

.stat-divider {
  width: 1px;
  height: 60px;
  flex-shrink: 0;
}

.stat-item {
  text-align: center;
}

.stat-num {
  font-size: 28px;
  font-style: oblique;
  letter-spacing: 4px;
  font-family: PingFangHei;
}

.stat-num .up {
  font-size: 16px;
  margin-left: 2px;
}

.stat-label {
  margin-top: 6px;
  font-size: 12px;
  color: #FFFFFF;
  line-height: 20px;
  font-style: normal;
  font-family: PingFangSC;
}

/* 服务端口 */
.port-row {
  display: flex;
  align-items: center;
  height: 34px;
  margin-bottom: 8px;
  padding: 0px 12px;
  font-family: PingFangSC, PingFang SC;
  font-weight: 600;
  font-size: 14px;
  color: #FFFFFF;
  line-height: 22px;
  background: url('~@/assets/images/框(8).png');
  background-size: 100% 100%;


  .port-zbx {
    margin-left: 30px;
    font-weight: 400;
    font-size: 14px;
    color: #D8F0FF;
    line-height: 22px;
  }
}

.port-row:last-child {
  margin-bottom: 0;
}

/* 图表 */
.chart {
  width: 100%;
  height: 100%;
}

/* 中列 */
.locate-count {
  text-align: center;
  padding: 10px 0 4px;
  font-size: 20px;
  color: #d8ecff;
  letter-spacing: 2px;
  font-style: oblique;
}

.count-num {
  font-size: 44px;
  font-family: PingFangHei;
  font-weight: normal;
  font-size: 48px;
  color: #00FDFF;
  line-height: 72px;
  letter-spacing: 6px;
  margin: 0 8px;
  text-shadow: 0 0 16px rgba(0, 220, 255, 0.9);
}

.count-unit {
  font-size: 16px;
  color: #fff;
}

.map-wrap {
  position: relative;
  flex: 1;
  min-height: 0;
}

.map-svg {
  width: 100%;
  height: 100%;
}

.map-shape {
  filter: drop-shadow(0 0 14px rgba(0, 180, 255, 0.55));
}

.heat {
  position: absolute;
  width: 110px;
  height: 80px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  pointer-events: none;
}

.heat-red {
  background: radial-gradient(ellipse at center, rgba(255, 60, 40, 0.85), rgba(255, 120, 0, 0.35) 55%, transparent 70%);
}

.heat-yellow {
  background: radial-gradient(ellipse at center, rgba(255, 220, 60, 0.8), rgba(255, 160, 0, 0.3) 55%, transparent 70%);
}

.heat-green {
  background: radial-gradient(ellipse at center, rgba(80, 255, 140, 0.7), rgba(0, 200, 120, 0.25) 55%, transparent 70%);
}

.region-tag {
  position: absolute;
  transform: translate(-50%, -100%);
  text-align: center;
  z-index: 2;
}

.region-box {
  display: inline-block;
  padding: 3px 8px;
  background: rgba(4, 40, 90, 0.75);
  border: 1px solid rgba(0, 190, 255, 0.5);
  border-radius: 3px;
}

.region-num {
  font-size: 13px;
  font-weight: 600;
  color: #aef0ff;
}

.region-name {
  font-size: 12px;
  color: #7fd8ff;
}

.region-arrow {
  width: 0;
  height: 0;
  margin: 0 auto;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 9px solid rgba(0, 190, 255, 0.8);
}

/* 帐号统计 */
.acc-top,
.acc-bottom {
  display: flex;
  justify-content: space-around;
}

.acc-top {
  margin-bottom: 12px;
}

.acc-item {
  text-align: center;
}

.acc-num {
  font-size: 24px;
  font-weight: 600;
  font-style: oblique;
  font-family: JiangChengXieHei, JiangChengXieHei;
}

.acc-num.orange {
  color: transparent;
  background: linear-gradient(90deg, #FFE055 0%, #FFAA40 50%, #F74B72 100%);
  -webkit-background-clip: text;
  background-clip: text;
}

.acc-num.yellow {
  color: transparent;
  background: linear-gradient(90deg, #E0A912 0%, #FDE053 100%);
  -webkit-background-clip: text;
  background-clip: text;
}

.acc-num.active {
  color: transparent;
  background: linear-gradient(180deg, #3DE6FF 0%, #c5f9fc 100%);
  -webkit-background-clip: text;
  background-clip: text;
}

.acc-num.concurrency {
  color: transparent;
  background: linear-gradient(180deg, #0AAD92 0%, #0ADB8B 100%);
  -webkit-background-clip: text;
  background-clip: text;
}

.acc-num.account {
  color: transparent;
  background: linear-gradient(180deg, #0387EC 0%, #38B8E4 100%);
  -webkit-background-clip: text;
  background-clip: text;
}

.acc-label {
  margin: 4px 0 8px;
  font-size: 12px;
  color: #9cc8ee;
}

.acc-icon {
  width: 64px;
  height: 44px;
  margin: 0 auto;
  border-radius: 50%;
  // border: 2px solid currentColor;

  // box-shadow: 0 0 10px currentColor, inset 0 0 10px rgba(0, 200, 255, 0.4);
  position: relative;
}

.icon-red {
  background: url('~@/assets/images/icon.png');
  background-size: 100% 100%;
}

.icon-yellow {
  background: url('~@/assets/images/icon(1).png');
  background-size: 100% 100%;
}

.icon-active {
  background: url('~@/assets/images/icon(2).png');
  background-size: 100% 100%;
}

.icon-concurrency {
  background: url('~@/assets/images/icon(4).png');
  background-size: 100% 100%;
}

.icon-account {
  background: url('~@/assets/images/icon(3).png');
  background-size: 100% 100%;
}

/* 底部 */
.screen-bottom {
  height: 26%;
  flex-shrink: 0;
  display: flex;
  box-sizing: border-box;
  padding: 0 16px;
  // gap: 14px;
  margin-top: 14px;

  .bottom-table {
    /deep/.panel-body {
      padding: 22px;
    }
  }
}

.screen-bottom .panel {
  flex: 1;
  min-width: 0;
}

/* 表格：el-table 深色主题覆盖 */
::v-deep .el-table {
  background: transparent;
  color: #cfe8ff;
  font-size: 14px;

  thead {
    background: url('~@/assets/images/矩形备份 7.png');
    background-size: 100% 100%;
  }

  th.el-table__cell {
    background: transparent;
    color: #D8F0FF;
    font-weight: 600;
    border-bottom: none;
    text-align: center;
  }


  td.el-table__cell {
    color: #fff;
    font-size: 12px;
    background: transparent;
    border-bottom: none;
    text-align: center;
  }

  tr {
    background: transparent;
  }

  .el-table__body tr.current-row {
    background: url('~@/assets/images/框(1).png');
    background-size: 100% 100%;
  }

  .el-table__body tr.current-row>td.el-table__cell {
    background: transparent;
  }

  &::before {
    background: transparent;
  }

  &.el-table--enable-row-hover .el-table__body tr:hover>td.el-table__cell {
    background: rgba(0, 140, 255, 0.12);
  }
}

.ok {
  color: #5ef0b0;
}

.bad {
  color: #ff5b6a;
}
</style>
