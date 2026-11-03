<template>
  <div ref="map" class="map3d"></div>
</template>

<script>
import * as echarts from 'echarts'
import 'echarts-gl'
import hangzhouGeo from '@/assets/geo/hangzhou.json'
import baseImg from '@/assets/images/底座.png'
import labelBgImg from '@/assets/images/框(4).png'
import mapBgImg from '@/assets/images/home_bg.png'

/* 各区县 mock 数值（取自设计稿） */
const DISTRICT_VALUES = {
  上城区: 5680,
  拱墅区: 4530,
  西湖区: 3920,
  滨江区: 6210,
  萧山区: 1782,
  余杭区: 3920,
  富阳区: 3002,
  临安区: 76282,
  钱塘区: 10839,
  临平区: 3920,
  桐庐县: 29372,
  淳安县: 12234567,
  建德市: 10730
}

/* 城区标签密集，抬高部分区县的悬浮高度避免互相遮挡（默认 4.5） */
const DISTRICT_ALTITUDES = {
  临平区: 8,
  拱墅区: 6.5,
  上城区: 9,
  西湖区: 5.5,
  滨江区: 7,
  萧山区: 5
}


export default {
  name: 'Map3D',
  data() {
    return {
      chart: null
    }
  },
  mounted() {
    /* 图片预加载完成后再初始化：GL 生成符号贴图时若图片未解码会渲染成空白；
       map_bg 预载后还要用于合成热力贴图 */
    const urls = [baseImg, labelBgImg, mapBgImg]
    Promise.all(urls.map(u => new Promise(resolve => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => resolve(null)
      img.src = u
    }))).then(([, , mapImg]) => {
      this.$nextTick(() => {
        this.initMap(mapImg)
        if (this.chart) this.chart.resize()
      })
    })
    window.addEventListener('resize', this.handleResize)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.handleResize)
    if (this.chart) {
      this.chart.dispose()
      this.chart = null
    }
  },
  methods: {
    handleResize() {
      if (this.chart) this.chart.resize()
    },
    /* 把各区县热力光斑画进表面贴图：geo3D 纹理坐标按地图包围盒归一化，
       光斑按同一包围盒换算即与底图对齐，且随 3D 旋转缩放不分离 */
    buildHeatTexture(mapImg) {
      const w = mapImg.naturalWidth
      const h = mapImg.naturalHeight
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(mapImg, 0, 0, w, h)

      /* 地图经纬度包围盒 */
      let minLng = Infinity
      let maxLng = -Infinity
      let minLat = Infinity
      let maxLat = -Infinity
      const walk = coords => {
        if (typeof coords[0] === 'number') {
          minLng = Math.min(minLng, coords[0])
          maxLng = Math.max(maxLng, coords[0])
          minLat = Math.min(minLat, coords[1])
          maxLat = Math.max(maxLat, coords[1])
          return
        }
        coords.forEach(walk)
      }
      hangzhouGeo.features.forEach(f => walk(f.geometry.coordinates))

      /* 数值跨千级到千万级，用 log10 压缩成 0~1 强度 */
      const logOf = name => Math.log10(DISTRICT_VALUES[name] || 1)
      const logs = hangzhouGeo.features.map(f => logOf(f.properties.name))
      const vMin = Math.min(...logs)
      const vMax = Math.max(...logs)

      /* 颜色沿用旧设计稿三档：绿(80,255,140) → 黄(255,220,60) → 红(255,60,40) */
      const GREEN = [80, 255, 140]
      const YELLOW = [255, 220, 60]
      const RED = [255, 60, 40]
      const lerp = (a, b, k) => Math.round(a + (b - a) * k)
      const heatColor = t => (t < 0.5
        ? GREEN.map((c, i) => lerp(c, YELLOW[i], t * 2))
        : YELLOW.map((c, i) => lerp(c, RED[i], (t - 0.5) * 2)))

      /* 确定性伪随机：以区县名为种子，子光斑位置每次渲染固定，不会闪烁 */
      const rngOf = name => {
        let s = 1
        for (const ch of name) s = (s * 31 + ch.charCodeAt(0)) >>> 0
        return () => {
          s = (s * 1664525 + 1013904223) >>> 0
          return s / 4294967296
        }
      }

      const drawBlob = (x, y, r, t) => {
        const [cr, cg, cb] = heatColor(t)
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
        grad.addColorStop(0, `rgba(${cr},${cg},${cb},0.95)`)
        grad.addColorStop(0.55, `rgba(${cr},${cg},${cb},0.5)`)
        grad.addColorStop(0.7, `rgba(${cr},${cg},${cb},0)`)
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalCompositeOperation = 'lighter'
      hangzhouGeo.features.forEach(f => {
        const name = f.properties.name
        const [lng, lat] = f.properties.center
        const t = (logOf(name) - vMin) / (vMax - vMin || 1)
        const x = (lng - minLng) / (maxLng - minLng) * w
        const y = (maxLat - lat) / (maxLat - minLat) * h
        const r = 34 + 52 * t
        drawBlob(x, y, r, t)
        /* 每区县再补 3 个子光斑，热力分布更自然 */
        const rand = rngOf(name)
        for (let i = 0; i < 3; i++) {
          const angle = rand() * Math.PI * 2
          const dist = 15 + rand() * 25
          drawBlob(
            x + Math.cos(angle) * dist,
            y + Math.sin(angle) * dist,
            r * (0.4 + rand() * 0.3),
            Math.min(1, t * (0.6 + rand() * 0.4))
          )
        }
      })

      return canvas.toDataURL()
    },
    initMap(mapImg) {
      echarts.registerMap('hangzhou', hangzhouGeo)

      /* 底图 + 热力光斑合成贴图；底图加载失败时退回纯底图 */
      const detailTexture = mapImg ? this.buildHeatTexture(mapImg) : mapBgImg

      /* 标签图钉：定位到每个区县的中心点，value[2] 为悬浮高度，value[3] 为展示数值 */
      const pins = hangzhouGeo.features.map(f => {
        const name = f.properties.name
        return {
          name,
          value: [...f.properties.center, DISTRICT_ALTITUDES[name] || 4.5, DISTRICT_VALUES[name] || 0]
        }
      })

      /* 底座标记：贴在地图表面（高度略高于 regionHeight 2.5），与悬浮标签分开 */
      const baseMarkers = hangzhouGeo.features.map(f => ({
        name: f.properties.name,
        value: [...f.properties.center, 2.6, 0]
      }))

      this.chart = echarts.init(this.$refs.map)
      try {
        this.chart.setOption({
          backgroundColor: 'transparent',
          /* 顶层 geo3D 组件：渲染挤压立体地图，同时作为 scatter3D 的坐标系。
             注意：不能用 series.map3D 代替，否则 scatter3D 会报 geo "0" not found */
          geo3D: {
            map: 'hangzhou',
            boxWidth: 110,
            boxHeight: 7,
            regionHeight: 2.5,
            shading: 'lambert',
            /* 表面贴图：geo3D 网格自带 texcoord0（按地图包围盒归一化），
               detailTexture 经 lambertMaterial 生效，颜色 = 区县色 × 纹理色 */
            lambertMaterial: {
              detailTexture,
              textureTiling: 1,
              textureOffset: 0
            },
            itemStyle: {
              color: '#9cc3f0',
              borderColor: '#1E7BD6',
              borderWidth: 1.5
            },
            label: { show: false },
            emphasis: {
              itemStyle: { color: '#1e90ff' },
              label: {
                show: true, formatter: p => `${p.name}`, color: '#ffffff', fontSize: 13
              }
            },
            light: {
              main: { intensity: 1.4, shadow: false, alpha: 50, beta: -20 },
              ambient: { intensity: 0.45 }
            },
            postEffect: {
              enable: true,
              bloom: { enable: true, bloomIntensity: 0.15 }
            },
            viewControl: {
              alpha: 40,
              beta: 0,
              distance: 90,
              minDistance: 60,
              maxDistance: 260,
              rotateSensitivity: 1,
              zoomSensitivity: 1,
              animation: false
            }
          },
          series: [
            {
              type: 'scatter3D',
              name: 'baseMarkers',
              coordinateSystem: 'geo3D',
              symbol: 'none',
              symbolSize: 0,
              label: {
                show: true,
                position: 'top',
                distance: 0,
                formatter: () => ' ',
                color: 'transparent',
                padding: [5, 16],
                backgroundColor: { image: baseImg }
              },
              data: baseMarkers
            },
            {
              type: 'scatter3D',
              name: 'districtValues',
              coordinateSystem: 'geo3D',
              symbol: 'none',
              symbolSize: 0,
              label: {
                show: true,
                position: 'top',
                distance: 18,
                formatter: p => `${p.value[3]}\n${p.name}`,
                color: '#fff',
                fontSize: 12,
                lineHeight: 14,
                padding: [5, 10],
                backgroundColor: { image: labelBgImg }
              },
              data: pins
            }
          ]
        })
      } catch (e) {
        console.error('[Map3D] setOption failed:', e)
      }
    }
  }
}
</script>

<style scoped>
.map3d {
  width: 100%;
  height: 100%;
}
</style>
