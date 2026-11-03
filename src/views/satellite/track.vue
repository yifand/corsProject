<template>
  <div class="satellite-track">
    <!-- 地图区 -->
    <div class="map-wrap">
      <div ref="mapEl" class="map-el"></div>

      <!-- 左上角统计 + 播放控制 -->
      <div class="top-left">
        <div class="map-chip">在轨卫星[{{ visibleCount }}/{{ sats.length }}]</div>
        <div class="map-chip play-chip" @click="togglePlay">
          <i :class="playing ? 'el-icon-video-pause' : 'el-icon-video-play'"></i>
          {{ playing ? '暂停' : '播放' }}
        </div>
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
// 对接后端时：把 @/mock/satellite 的 mockSatellites / satPosition / satTrack 替换为真实星历数据源
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import MultiLineString from 'ol/geom/MultiLineString'
import Style from 'ol/style/Style'
import Stroke from 'ol/style/Stroke'
import Fill from 'ol/style/Fill'
import CircleStyle from 'ol/style/Circle'
import Text from 'ol/style/Text'
import { transform, get as getProjection } from 'ol/proj'
import { SAT_SYSTEMS, mockSatellites, satPosition, satTrack } from '@/mock/satellite'
import { mapInitialization } from '@/utils/mixin'

const PROJ_4326 = 'EPSG:4326'
const PROJ_3857 = 'EPSG:3857'

const SIM_SPEED = 60 // 模拟加速比：1 真实秒 = 60 模拟秒
const TICK_MS = 200 // 刷新间隔

export default {
  name: 'SatelliteTrack',
  mixins: [mapInitialization],
  data() {
    return {
      trackLayer: null,
      pointLayer: null,
      timer: null,
      playing: true,
      simTime: Date.now(),
      epoch: Date.now(), // 固定历元：静态轨迹线的计算基准
      systems: SAT_SYSTEMS,
      sats: [],
      satFeatures: {}, // id -> { point, track }
      checked: {}, // id -> bool
      showSats: true,
      showTracks: true
    }
  },
  computed: {
    visibleCount() {
      return this.sats.filter(s => this.checked[s.id]).length
    }
  },
  mounted() {
    this.sats = mockSatellites()
    this.sats.forEach(s => this.$set(this.checked, s.id, true))
    this.createLayers()
    // 通用地图初始化（mixin）：天地图底图 + 业务图层
    this.initMap(
      this.$refs.mapEl,
      {
        center: transform([30, 25], PROJ_4326, PROJ_3857),
        zoom: 2,
        minZoom: 1,
        maxZoom: 5,
        // extent: getProjection(PROJ_3857).getExtent(), // 视野中心限制在单个世界内，禁止左右拖出重复地图
        constrainOnlyCenter: true // 只约束视野中心，避免 extent 附加分辨率约束影响缩放
      },
      this.trackLayer,
      this.pointLayer
    )
    this.buildFeatures()
    this.timer = setInterval(this.tick, TICK_MS)
  },
  beforeDestroy() {
    clearInterval(this.timer)
  },
  methods: {
    // 创建轨迹/卫星矢量图层（zIndex 高于 mixin 天地图注记层，避免被盖住）
    createLayers() {
      // style function：逐星隐藏时返回 null
      const featureStyle = f => (f.get('hidden') ? null : f.get('styleObj'))
      this.trackLayer = new VectorLayer({ source: new VectorSource(), style: featureStyle, zIndex: 10 })
      this.pointLayer = new VectorLayer({ source: new VectorSource(), style: featureStyle, zIndex: 11 })
    },
    buildFeatures() {
      console.log(this.sats, '333');

      this.sats.forEach(sat => {
        const point = new Feature({
          geometry: new Point([0, 0]),
          hidden: false,
          styleObj: this.pointStyle(sat)
        })
        // 静态轨迹线：固定历元计算一次，卫星始终沿该曲线移动；几何整体转到 3857
        const track = new Feature({
          geometry: new MultiLineString(satTrack(sat, this.epoch)).transform(PROJ_4326, PROJ_3857),
          hidden: false,
          styleObj: this.trackStyle(sat)
        })
        this.pointLayer.getSource().addFeature(point)
        this.trackLayer.getSource().addFeature(track)
        this.satFeatures[sat.id] = { point, track }
      })
      this.tick()
    },
    // 卫星点样式：颜色即轨迹线颜色，附名称标签
    pointStyle(sat) {
      return new Style({
        image: new CircleStyle({
          radius: 6,
          fill: new Fill({ color: sat.color }),
          stroke: new Stroke({ color: '#fff', width: 1.5 })
        }),
        text: new Text({
          text: sat.name,
          offsetY: -16,
          font: 'bold 12px sans-serif',
          fill: new Fill({ color: '#333' }),
          backgroundFill: new Fill({ color: 'rgba(255, 255, 255, 0.75)' }),
          padding: [1, 4, 1, 4]
        })
      })
    },
    trackStyle(sat) {
      return new Style({
        stroke: new Stroke({ color: sat.color, width: 1.5 })
      })
    },
    tick() {
      this.simTime += TICK_MS * SIM_SPEED
      // 轨迹线为静态曲线，只需更新卫星点位置（经纬度转 3857）
      this.sats.forEach(sat => {
        const f = this.satFeatures[sat.id]
        f.point.getGeometry().setCoordinates(transform(satPosition(sat, this.simTime), PROJ_4326, PROJ_3857))
      })
    },
    // 暂停/播放动画
    togglePlay() {
      if (this.playing) {
        clearInterval(this.timer)
        this.timer = null
        this.playing = false
      } else {
        this.playing = true
        this.timer = setInterval(this.tick, TICK_MS)
      }
    },
    onMasterChange() {
      this.pointLayer.setVisible(this.showSats)
      this.trackLayer.setVisible(this.showTracks)
    },
    toggleSat(sat) {
      this.syncFeature(sat)
    },
    // 把单星的点/轨迹 feature 显隐同步到 checked 状态
    syncFeature(sat) {
      const visible = this.checked[sat.id]
      const f = this.satFeatures[sat.id]
      f.point.set('hidden', !visible)
      f.track.set('hidden', !visible)
      f.point.changed()
      f.track.changed()
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

/* 左上角统计 + 播放控制 */
.top-left {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 5;
  display: flex;
  gap: 8px;
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
