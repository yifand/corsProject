<template>
  <div ref="map" class="map3d"></div>
</template>

<script>
import * as echarts from 'echarts'
import 'echarts-gl'
import hangzhouGeo from '@/assets/geo/hangzhou.json'
import baseImg from '@/assets/images/底座.png'
import labelBgImg from '@/assets/images/框(4).png'
import mapBgImg from '@/assets/images/map_bg.png'

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
    /* 图片预加载完成后再初始化：GL 生成符号贴图时若图片未解码会渲染成空白 */
    const urls = [baseImg, labelBgImg]
    Promise.all(urls.map(u => new Promise(resolve => {
      const img = new Image()
      img.onload = resolve
      img.onerror = resolve
      img.src = u
    }))).then(() => {
      this.$nextTick(() => {
        this.initMap()
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
    initMap() {
      echarts.registerMap('hangzhou', hangzhouGeo)

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
              detailTexture: mapBgImg,
              textureTiling: 1,
              textureOffset: 0
            },
            itemStyle: {
              color: '#9cc3f0',
              borderColor: '#4fd8ff',
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
                color: '#aef0ff',
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
