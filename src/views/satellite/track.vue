<template>
  <div class="satellite-track">
    <!-- 地图区 -->
    <div class="map-wrap">
      <div ref="mapEl" class="map-el"></div>

      <!-- 左上角日期筛选 + 统计 + 播放控制 -->
      <div class="top-left">
        <el-date-picker v-model="selectedDate" class="date-picker" type="date" value-format="yyyyMMdd"
          :clearable="false" size="mini" @change="load" />
        <div class="map-chip">在轨卫星[{{ visibleCount }}/{{ sats.length }}]</div>
        <div class="map-chip">{{ epochs.length ? `历元 ${epochLabel}（${epochIdx + 1}/${epochs.length}）` : '无数据' }}</div>
        <div class="map-chip play-chip" @click="togglePlay">
          <i :class="playing ? 'el-icon-video-pause' : 'el-icon-video-play'"></i>
          {{ playing ? '暂停' : '播放' }}
        </div>
      </div>

      <!-- 左下角 ifVal 渐变图例 -->
      <div class="map-legend">
        <span>0</span>
        <div class="legend-bar"></div>
        <span>7</span>
      </div>

      <!-- 右上角控制面板 -->
      <div class="map-panel">
        <div class="panel-master">
          <el-checkbox v-model="showSats" @change="onMasterChange">卫星</el-checkbox>
          <el-checkbox v-model="showTracks" @change="onMasterChange">轨迹线</el-checkbox>
        </div>
        <div class="panel-body">
          <div v-for="sys in systems" :key="sys.key" class="sys-group">
            <div class="sys-title">
              <el-checkbox :value="isSysAll(sys.key)" :indeterminate="isSysIndeterminate(sys.key)"
                @change="val => toggleSystem(sys.key, val)">
                <span class="sat-label">
                  <span class="legend-badge" :style="{ background: sys.color }"></span>
                  {{ sys.label }}
                </span>
              </el-checkbox>
            </div>
            <div v-for="sat in groupOf(sys.key)" :key="sat.id" class="sat-item">
              <el-checkbox v-model="checked[sat.id]" @change="toggleSat(sat)">
                <span class="sat-label">
                  <span class="legend-badge" :style="{ background: sat.color }"></span>
                  {{ sat.name }}
                </span>
              </el-checkbox>
            </div>
          </div>
        </div>
      </div>

      <!-- 右下角缩放 -->
      <div class="map-zoom">
        <div class="zoom-btn" @click="zoom(1)">+</div>
        <div class="zoom-btn" @click="zoom(-1)">−</div>
      </div>
    </div>
  </div>
</template>

<script>
// 对接后端时：把 ./data 的静态样本换成 @/api/satellite 的 getSateqiEpoch(date)，返回结构一致
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import LineString from 'ol/geom/LineString'
import Style from 'ol/style/Style'
import Stroke from 'ol/style/Stroke'
import Fill from 'ol/style/Fill'
import CircleStyle from 'ol/style/Circle'
import Text from 'ol/style/Text'
import { transform } from 'ol/proj'
import { data as sateqiData } from './data'
import { mapInitialization } from '@/utils/mixin'

const PROJ_4326 = 'EPSG:4326'
const PROJ_3857 = 'EPSG:3857'
const TICK_MS = 200 // 历元步进间隔

/* 卫星系统：prn 前缀 -> 名称/配色 */
const SYSTEM_MAP = {
  G: { label: 'GPS', color: '#7cd322' },
  R: { label: 'GLONASS', color: '#e8541e' },
  E: { label: 'Galileo', color: '#12b5e5' },
  C: { label: 'BDS', color: '#c26bef' },
  J: { label: 'QZSS', color: '#e8c41e' }
}

/* ifVal 渐变配色：0=绿，7=红，中间按色相渐变 */
function ifValColor(v) {
  const n = Math.max(0, Math.min(7, Number(v) || 0))
  return `hsl(${Math.round(120 * (1 - n / 7))}, 90%, 45%)`
}

/* 轨迹线样式：按卫星所属系统配色（与右侧控制面板类别颜色一致），共享缓存 */
const trackStyleCache = {}
function trackStyle(color) {
  if (!trackStyleCache[color]) {
    trackStyleCache[color] = new Style({ stroke: new Stroke({ color, width: 2 }) })
  }
  return trackStyleCache[color]
}

export default {
  name: 'SatelliteTrack',
  mixins: [mapInitialization],
  data() {
    return {
      trackLayer: null,
      pointLayer: null,
      timer: null,
      playing: false,
      selectedDate: this.defaultDate(),
      epochs: [], // 排序后的历元 key（'2026-11-01T06:20'）
      epochData: {}, // 历元 -> [{ prn, ifVal, lat, lon }]
      epochIdx: 0,
      sats: [],
      satFeatures: {}, // prn -> { point }
      trackFeatures: {}, // prn -> [轨迹段 feature]
      epochIndex: {}, // 历元 -> { prn -> 点位 }
      checked: {}, // prn -> bool
      showSats: true,
      showTracks: true
    }
  },
  computed: {
    systems() {
      const keys = [...new Set(this.sats.map(s => s.system))]
      return keys.map(k => ({ key: k, label: SYSTEM_MAP[k].label, color: SYSTEM_MAP[k].color }))
    },
    visibleCount() {
      return this.sats.filter(s => this.checked[s.id]).length
    },
    epochLabel() {
      const e = this.epochs[Math.min(this.epochIdx, this.epochs.length - 1)]
      return e ? e.slice(11) : '--:--'
    }
  },
  mounted() {
    this.createLayers()
    // 通用地图初始化（mixin）：天地图底图 + 业务图层
    this.initMap(
      this.$refs.mapEl,
      {
        center: transform([30, 25], PROJ_4326, PROJ_3857),
        zoom: 0,
        minZoom: 0,
        maxZoom: 18,
        constrainOnlyCenter: true // 只约束视野中心，避免 extent 附加分辨率约束影响缩放
      },
      this.trackLayer,
      this.pointLayer
    )
    this.load(this.selectedDate)
    this.lockHorizontalPan()
  },
  beforeDestroy() {
    this.stopTimer()
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
    // 创建轨迹/卫星矢量图层（zIndex 高于 mixin 天地图注记层，避免被盖住）
    createLayers() {
      // style function：逐星隐藏时返回 null
      const featureStyle = f => (f.get('hidden') ? null : f.get('styleObj'))
      this.trackLayer = new VectorLayer({ source: new VectorSource(), style: featureStyle, zIndex: 10 })
      this.pointLayer = new VectorLayer({ source: new VectorSource(), style: featureStyle, zIndex: 11 })
    },
    // 锁定横向平移：中心经度固定，只允许上下拖动与缩放（左右拖动会看到 ±180° 重复世界，轨迹视觉错乱）
    lockHorizontalPan() {
      // const view = this.map.getView()
      // const fixedX = view.getCenter()[0]
      // view.on('change:center', () => {
      //   const c = view.getCenter()
      //   if (c[0] !== fixedX) view.setCenter([fixedX, c[1]])
      // })
    },
    // 按日期筛选历元（date 格式 yyyyMMdd）
    // 对接后端时：改为 getSateqiEpoch(date).then(res => ...)，返回结构一致
    load(date) {
      if (!date) return
      this.stopTimer()
      const prefix = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`
      const all = (sateqiData && sateqiData.data) || {}
      this.epochs = Object.keys(all).filter(k => k.startsWith(prefix)).sort()
      this.epochData = {}
      this.epochs.forEach(k => { this.epochData[k] = all[k] })
      // 每历元 prn 索引，buildTracks / indexByPrn 复用
      this.epochIndex = {}
      this.epochs.forEach(e => {
        const map = {}
          ; (this.epochData[e] || []).forEach(p => { map[p.prn] = p })
        this.epochIndex[e] = map
      })
      this.buildSats()
      this.buildTracks()
      this.resetPlay()
      this.togglePlay()
    },
    // 由历元数据聚合卫星列表（prn 前缀 -> 系统）
    buildSats() {
      const seen = {}
      this.epochs.forEach(e => (this.epochData[e] || []).forEach(p => { seen[p.prn] = true }))
      this.sats = Object.keys(seen).sort().map(prn => {
        const sys = SYSTEM_MAP[prn[0]] || { label: '其他', color: '#999999' }
        return { id: prn, name: prn, system: prn[0], systemLabel: sys.label, color: sys.color }
      })
      this.checked = {}
      this.sats.forEach(s => this.$set(this.checked, s.id, true))
    },
    // 同一卫星跨历元连线：按历元顺序逐段连接经纬度，颜色取所属系统配色；±180° 经度跳变处断开
    buildTracks() {
      this.trackLayer.getSource().clear()
      this.trackFeatures = {}
      this.sats.forEach(sat => {
        const segs = []
        let prev = null
        this.epochs.forEach(e => {
          const p = this.epochIndex[e][sat.id]
          if (!p) return
          if (prev && Math.abs(p.lon - prev.lon) <= 180) {
            segs.push(new Feature({
              geometry: new LineString([[prev.lon, prev.lat], [p.lon, p.lat]]).transform(PROJ_4326, PROJ_3857),
              styleObj: trackStyle(sat.color),
              hidden: !this.checked[sat.id]
            }))
          }
          prev = p
        })
        if (segs.length) this.trackLayer.getSource().addFeatures(segs)
        this.trackFeatures[sat.id] = segs
      })
    },
    // 重建卫星点、回到第 0 历元（全天轨迹由 buildTracks 一次性构建，此处不动）
    resetPlay() {
      this.pointLayer.getSource().clear()
      this.satFeatures = {}
      this.sats.forEach(sat => {
        const point = new Feature({
          geometry: new Point([0, 0]),
          hidden: false,
          styleObj: this.pointStyle(sat.name, 0)
        })
        this.pointLayer.getSource().addFeature(point)
        this.satFeatures[sat.id] = { point }
      })
      this.epochIdx = 0
      this.applyEpoch(0)
    },
    // 应用第 i 个历元：更新卫星点位置与颜色（ifVal 渐变）；轨迹为全天静态连线，不随历元重建
    applyEpoch(i) {
      const cur = this.indexByPrn(this.epochs[i])
      this.sats.forEach(sat => {
        const f = this.satFeatures[sat.id]
        const p = cur[sat.id]
        if (p) {
          f.point.getGeometry().setCoordinates(transform([p.lon, p.lat], PROJ_4326, PROJ_3857))
          f.point.set('styleObj', this.pointStyle(sat.name, p.ifVal))
          f.point.set('hidden', !this.checked[sat.id])
        } else {
          f.point.set('hidden', true) // 该历元缺星时隐藏点
        }
        f.point.changed()
      })
    },
    // 某历元的 prn -> 点位 索引（load 时已预建）
    indexByPrn(epoch) {
      return this.epochIndex[epoch] || {}
    },
    // 卫星点样式：填充色按 ifVal 绿(0)->红(7) 渐变，附名称标签
    pointStyle(name, ifVal) {
      return new Style({
        image: new CircleStyle({
          radius: 6,
          fill: new Fill({ color: ifValColor(ifVal) }),
          stroke: new Stroke({ color: '#fff', width: 1.5 })
        }),
        text: new Text({
          text: name,
          offsetY: -16,
          font: 'bold 12px sans-serif',
          fill: new Fill({ color: '#333' }),
          backgroundFill: new Fill({ color: 'rgba(255, 255, 255, 0.75)' }),
          padding: [1, 4, 1, 4]
        })
      })
    },
    // 按历元步进：每 tick 推进一个历元，播完自动停止
    tick() {
      if (this.epochIdx >= this.epochs.length - 1) {
        this.stopTimer()
        return
      }
      this.epochIdx++
      this.applyEpoch(this.epochIdx)
    },
    // 暂停/播放；播完后再次播放则从头重播
    togglePlay() {
      if (this.playing) {
        this.stopTimer()
        return
      }
      if (this.epochIdx >= this.epochs.length - 1) this.resetPlay()
      this.playing = true
      this.timer = setInterval(this.tick, TICK_MS)
    },
    stopTimer() {
      clearInterval(this.timer)
      this.timer = null
      this.playing = false
    },
    onMasterChange() {
      this.pointLayer.setVisible(this.showSats)
      this.trackLayer.setVisible(this.showTracks)
    },
    toggleSat(sat) {
      this.syncFeature(sat)
    },
    // 把单星点与轨迹段显隐同步到 checked 状态
    syncFeature(sat) {
      const f = this.satFeatures[sat.id]
      if (!f) return
      const hidden = !this.checked[sat.id]
      f.point.set('hidden', hidden)
      f.point.changed()
        ; (this.trackFeatures[sat.id] || []).forEach(seg => {
          seg.set('hidden', hidden)
          seg.changed()
        })
    },
    isSysAll(key) {
      return this.groupOf(key).every(s => this.checked[s.id])
    },
    isSysIndeterminate(key) {
      const sats = this.groupOf(key)
      const n = sats.filter(s => this.checked[s.id]).length
      return n > 0 && n < sats.length
    },
    // 系统级多选：一键勾选/取消该系统全部卫星
    toggleSystem(key, val) {
      this.groupOf(key).forEach(sat => {
        if (this.checked[sat.id] !== val) {
          this.$set(this.checked, sat.id, val)
          this.syncFeature(sat)
        }
      })
    },
    groupOf(key) {
      return this.sats.filter(s => s.system === key)
    }
  }
}
</script>

<style scoped>
.satellite-track {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.map-wrap {
  position: relative;
  flex: 1;
  min-height: 420px;
  border: 1px solid rgba(18, 46, 74, 0.6);
  border-radius: 6px;
  overflow: hidden;
}

.map-el {
  position: absolute;
  inset: 0;
}

/* 左上角日期筛选 + 统计 + 播放控制 */
.top-left {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 8px;
}

.date-picker {
  width: 130px;
}

.map-chip {
  background: rgba(9, 27, 46, 0.82);
  backdrop-filter: blur(6px);
  border: 1px solid rgba(64, 196, 255, 0.35);
  border-radius: 20px;
  padding: 6px 16px;
  font-size: 13px;
  color: #7fe3ff;
  font-weight: 600;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 12px rgba(0, 10, 20, 0.35), inset 0 0 8px rgba(64, 196, 255, 0.08);
}

.play-chip {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  user-select: none;
  transition: all 0.2s ease;
}

.play-chip:hover {
  background: rgba(24, 62, 96, 0.92);
  border-color: rgba(127, 227, 255, 0.8);
  color: #d9f6ff;
  box-shadow: 0 4px 14px rgba(0, 10, 20, 0.45), 0 0 10px rgba(64, 196, 255, 0.35);
}

.play-chip:active {
  transform: scale(0.96);
}

/* 左下角 ifVal 渐变图例 */
.map-legend {
  position: absolute;
  left: 12px;
  bottom: 16px;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(9, 27, 46, 0.82);
  backdrop-filter: blur(6px);
  border: 1px solid rgba(64, 196, 255, 0.35);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 12px;
  color: #bfe6f7;
  box-shadow: 0 4px 12px rgba(0, 10, 20, 0.35);
}

.legend-bar {
  width: 120px;
  height: 8px;
  border-radius: 4px;
  background: linear-gradient(to right, hsl(120, 90%, 45%), hsl(0, 90%, 45%));
}

/* 右上角控制面板 */
.map-panel {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 5;
  width: 180px;
  background: rgba(9, 27, 46, 0.85);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(64, 196, 255, 0.3);
  border-radius: 8px;
  box-shadow: 0 6px 20px rgba(0, 10, 20, 0.45);
  display: flex;
  flex-direction: column;
  max-height: calc(100% - 24px);
}

.panel-master {
  flex: none;
  display: flex;
  justify-content: space-around;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(64, 196, 255, 0.18);
  background: rgba(64, 196, 255, 0.06);
  border-radius: 8px 8px 0 0;
}

.panel-body {
  overflow-y: auto;
  padding: 10px 14px;
}

/* 面板细滚动条 */
.panel-body::-webkit-scrollbar {
  width: 5px;
}

.panel-body::-webkit-scrollbar-track {
  background: transparent;
}

.panel-body::-webkit-scrollbar-thumb {
  background: rgba(64, 196, 255, 0.25);
  border-radius: 3px;
}

.panel-body::-webkit-scrollbar-thumb:hover {
  background: rgba(64, 196, 255, 0.45);
}

.sys-group+.sys-group {
  margin-top: 8px;
}

.sys-title {
  display: flex;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: #d9f2ff;
  margin-bottom: 4px;
}

.sat-item {
  margin-bottom: 2px;
  padding: 1px 4px;
  border-radius: 4px;
  transition: background 0.2s ease;
}

.sat-item:hover {
  background: rgba(64, 196, 255, 0.1);
}

.sat-label {
  display: inline-flex;
  align-items: center;
  font-size: 13px;
  color: #bfe6f7;
}

.legend-badge {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 3px;
  margin-right: 6px;
  box-shadow: 0 0 4px rgba(255, 255, 255, 0.25);
}

/* Element 复选框深色面板适配 */
::v-deep .map-panel .el-checkbox__label {
  color: #bfe6f7;
}

::v-deep .map-panel .el-checkbox__inner {
  background: rgba(6, 18, 32, 0.6);
  border-color: rgba(64, 196, 255, 0.5);
}

::v-deep .map-panel .el-checkbox__input.is-checked .el-checkbox__inner,
::v-deep .map-panel .el-checkbox__input.is-indeterminate .el-checkbox__inner {
  background: #19b8e0;
  border-color: #19b8e0;
}

::v-deep .map-panel .el-checkbox__input.is-checked+.el-checkbox__label {
  color: #7fe3ff;
}

/* 缩放按钮 */
.map-zoom {
  position: absolute;
  right: 12px;
  bottom: 16px;
  z-index: 5;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.zoom-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(9, 27, 46, 0.82);
  backdrop-filter: blur(6px);
  border: 1px solid rgba(64, 196, 255, 0.4);
  border-radius: 8px;
  color: #7fe3ff;
  font-size: 18px;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 10, 20, 0.35);
}

.zoom-btn:hover {
  background: rgba(64, 196, 255, 0.2);
  border-color: #7fe3ff;
  color: #eafcff;
  box-shadow: 0 4px 14px rgba(0, 10, 20, 0.45), 0 0 10px rgba(64, 196, 255, 0.4);
}

.zoom-btn:active {
  transform: scale(0.92);
}
</style>
