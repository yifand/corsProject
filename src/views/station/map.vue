<template>
  <div class="station-map">
    <!-- 地图区 -->
    <div class="map-wrap">
      <div ref="mapEl" class="map-el"></div>

      <!-- 左上角站点统计 -->
      <div class="map-chip">站点列表[{{ visibleCount }}/{{ stations.length }}]</div>

      <!-- 右上角图例 -->
      <div class="map-legend">
        <div v-for="s in statusList" :key="s.key" class="legend-item">
          <el-checkbox v-model="legend[s.key]" @change="renderMarkers">
            <span class="legend-label">
              <span class="legend-badge" :style="{ background: s.color }"></span>
              {{ s.label }}
            </span>
          </el-checkbox>
        </div>
      </div>

      <!-- 右下角缩放 -->
      <div class="map-zoom">
        <div class="zoom-btn" @click="zoom(1)">+</div>
        <div class="zoom-btn" @click="zoom(-1)">−</div>
      </div>

      <!-- 站点气泡 -->
      <div v-show="popup.visible" ref="popupEl" class="map-popup">
        <div class="popup-row">站点：{{ popup.name }}</div>
        <div class="popup-row">状态：{{ popup.statusText }}</div>
      </div>
    </div>
  </div>
</template>

<script>
// 对接后端时：把 fetchMock 改为调用 @/api 下的接口（参照 @/api/user.js 的封装约定）
// 筛选栏在 components/MapFilter.vue，通过 $bus 事件 'station-map-filter' 传入筛选条件
import Overlay from 'ol/Overlay'
import { transform } from 'ol/proj'
import { mockMapStations, STATION_STATUS } from '@/mock/station'
import { mapInitialization } from '@/utils/mixin'

const STATUS_TEXT = {
  normal: '在线',
  single: '单站播发',
  monitor: '监测中',
  search: '搜星异常',
  jam: '干扰/欺骗',
  offline: '离线'
}

export default {
  name: 'StationMap',
  mixins: [mapInitialization],
  data() {
    return {
      catalog: 'own',
      markers: [], // { station, overlay }
      stations: [],
      popupOverlay: null,
      popup: { visible: false, name: '', statusText: '' },
      filters: { group: '所有分组', region: '全部' },
      statusList: STATION_STATUS,
      legend: {
        normal: true,
        single: true,
        monitor: true,
        search: true,
        jam: true,
        offline: true
      }
    }
  },
  computed: {
    visibleCount() {
      return this.markers.length
    }
  },
  created() {
    this.$bus.$on('catalog-change', this.onCatalogChange)
    this.$bus.$on('station-map-filter', this.onFilter)
  },
  mounted() {
    // 通用地图初始化（mixin）：天地图底图
    this.initMap(this.$refs.mapEl, {
      center: transform([120.15, 30.28], 'EPSG:4326', 'EPSG:3857'),
      zoom: 11,
      minZoom: 4,
      maxZoom: 18
    })
    this.initPopup()
    this.fetchMock(this.catalog)
  },
  beforeDestroy() {
    this.$bus.$off('catalog-change', this.onCatalogChange)
    this.$bus.$off('station-map-filter', this.onFilter)
  },
  methods: {
    // 站点气泡
    initPopup() {
      this.popupOverlay = new Overlay({
        element: this.$refs.popupEl,
        positioning: 'bottom-center',
        offset: [0, -28],
        stopEvent: false
      })
      this.map.addOverlay(this.popupOverlay)
      this.map.on('singleclick', () => {
        this.popup.visible = false
      })
    },
    fetchMock(catalog) {
      this.stations = mockMapStations(catalog)
      this.renderMarkers()
    },
    onCatalogChange(catalog) {
      this.catalog = catalog
      this.fetchMock(catalog)
    },
    onFilter(filters) {
      this.filters = { group: '所有分组', region: '全部', ...filters }
      this.renderMarkers()
    },
    clearMarkers() {
      this.markers.forEach(m => this.map.removeOverlay(m.overlay))
      this.markers = []
    },
    renderMarkers() {
      if (!this.map) return
      this.clearMarkers()
      this.popup.visible = false
      const { group, region } = this.filters
      this.stations.forEach(station => {
        if (group !== '所有分组' && station.group !== group) return
        if (region !== '全部' && station.name !== region) return
        if (!this.legend[station.status]) return
        this.addMarker(station)
      })
    },
    addMarker(station) {
      const status = STATION_STATUS.find(s => s.key === station.status)
      const el = document.createElement('div')
      el.className = 'station-marker'
      el.style.background = status.color
      el.title = station.name
      const inner = document.createElement('span')
      inner.className = 'station-marker-text'
      inner.innerText = 'W'
      el.appendChild(inner)
      const overlay = new Overlay({
        element: el,
        position: transform([station.lon, station.lat], 'EPSG:4326', 'EPSG:3857'),
        positioning: 'bottom-center',
        offset: [0, 0],
        stopEvent: true
      })
      el.addEventListener('click', e => {
        e.stopPropagation()
        this.popup = {
          visible: true,
          name: station.name,
          statusText: STATUS_TEXT[station.status] || station.status
        }
        this.popupOverlay.setPosition(transform([station.lon, station.lat], 'EPSG:4326', 'EPSG:3857'))
      })
      this.map.addOverlay(overlay)
      this.markers.push({ station, overlay })
    },
  }
}
</script>

<style scoped>
.station-map {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.map-wrap {
  position: relative;
  flex: 1;
  min-height: 420px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
}
.map-el {
  position: absolute;
  inset: 0;
}

/* 左上角统计标签 */
.map-chip {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 5;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 6px 14px;
  font-size: 13px;
  color: #c7000b;
  font-weight: 600;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
}

/* 图例 */
.map-legend {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 5;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 10px 14px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
}
.legend-item {
  margin-bottom: 6px;
}
.legend-item:last-child {
  margin-bottom: 0;
}
.legend-label {
  display: inline-flex;
  align-items: center;
  font-size: 13px;
  color: #333;
}
.legend-badge {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 2px;
  margin-right: 6px;
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
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 1px solid #c7000b;
  border-radius: 4px;
  color: #c7000b;
  font-size: 18px;
  cursor: pointer;
  user-select: none;
}
.zoom-btn:hover {
  background: #fdeeee;
}

/* 站点气泡 */
.map-popup {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 13px;
  color: #333;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
  white-space: nowrap;
}
.popup-row + .popup-row {
  margin-top: 4px;
}
</style>

<style>
/* OpenLayers Overlay 内的标记点（非 scoped，ol 会把元素移出组件 DOM） */
.station-marker {
  width: 22px;
  height: 22px;
  border-radius: 5px 5px 5px 0;
  transform: rotate(-45deg);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.85);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
  cursor: pointer;
}
.station-marker-text {
  transform: rotate(45deg);
}
</style>
