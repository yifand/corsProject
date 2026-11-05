/**
 * 地图通用 mixin：天地图底图 + initMap 初始化 + 缩放 + 销毁清理。
 * 地图页通过 mixins: [mapInitialization] 接入，调用 this.initMap(target, viewOptions, ...layers)。
 */
import 'ol/ol.css'
import OlMap from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import XYZ from 'ol/source/XYZ'
import Style from 'ol/style/Style'
import CircleStyle from 'ol/style/Circle'
import Stroke from 'ol/style/Stroke'
import Fill from 'ol/style/Fill'
import Text from 'ol/style/Text'
import MousePosition from 'ol/control/MousePosition'
import { createStringXY } from 'ol/coordinate'
import { transform } from 'ol/proj'

export const mapInitialization = {
  data() {
    return {
      map: null,
      mapLayer: [
        new TileLayer({
          title: '天地图路网',
          source: new XYZ({
            url: 'http://t{0-7}.tianditu.gov.cn/DataServer?T=vec_w&x={x}&y={y}&l={z}&tk=ab402926f4c7eea1f44864cf5a2077ab'
          }),
          zIndex: 0
        }),
        new TileLayer({
          title: '天地图文字标注',
          source: new XYZ({
            url: 'http://t{0-7}.tianditu.gov.cn/DataServer?T=cva_w&x={x}&y={y}&l={z}&tk=ab402926f4c7eea1f44864cf5a2077ab'
          }),
          zIndex: 1
        })
      ],
      clusterSource: null,
      clusters: new VectorLayer({
        // source: this.clusterSource,
        zIndex: 10,
        style: feature => {
          const features = feature.get('features')
          const size = features.length
          if (size === 1) {
            return this.createStyle(features[0])
          } else {
            return new Style({
              image: new CircleStyle({
                radius: 10,
                stroke: new Stroke({
                  color: '#fff'
                }),
                fill: new Fill({
                  color: '#3399CC'
                })
              }),
              text: new Text({
                text: size.toString(),
                textAlign: 'center',
                offsetY: 2,
                fill: new Fill({
                  color: '#fff'
                })
              })
            })
          }
        }
      }),
      stationOptions: [],
      station: '所有基准站'
    }
  },
  beforeDestroy() {
    if (this.map) {
      this.map.setTarget(null)
      this.map = null
    }
  },
  methods: {
    /**
     * 通用地图初始化
     * @param {string|HTMLElement} target 地图容器（或其 id）
     * @param {object} viewOptions 覆盖默认 View 配置（center/zoom/minZoom/maxZoom 等）
     * @param {...ol/layer/Layer} layers 追加在底图之上的业务图层
     */
    initMap(target, viewOptions = {}, ...layers) {
      this.map = new OlMap({
        target: target,
        layers: [this.mapLayer[0], this.mapLayer[1], ...layers],
        view: new View(
          Object.assign(
            {
              center: transform([108, 35], 'EPSG:4326', 'EPSG:3857'),
              zoom: 4,
              minZoom: 1,
              maxZoom: 18
            },
            viewOptions
          )
        ),
        controls: [],
        loadTilesWhileAnimating: true
      })
      return this.map
    },
    zoom(delta) {
      const view = this.map.getView()
      view.animate({ zoom: view.getZoom() + delta, duration: 200 })
    },
    copy2cut(content) {
      const input = document.createElement('input')
      input.setAttribute('id', 'xCopy')
      input.setAttribute('value', content)
      document.getElementsByTagName('body')[0].appendChild(input)
      document.getElementById('xCopy').select()
      document.execCommand('copy')
      document.getElementById('xCopy').remove()
      this.$message.success('鼠标位置已复制到剪切板！')
    },
    copyPosition(event) {
      const e = event || window.event
      if (e && e.keyCode === 67) {
        const $_MP = document.getElementsByClassName('ol-mouse-position-custom')
        if ($_MP.length > 0) {
          this.copy2cut($_MP[0].innerText)
        }
      }
    },
    setMousePosition() {
      this.map.addControl(
        new MousePosition({
          className: 'ol-mouse-position-custom',
          coordinateFormat: createStringXY(6),
          projection: 'EPSG:4326'
        })
      )
    },
    reInitialize() {
      this.map.getView().setCenter(transform([108, 35], 'EPSG:4326', 'EPSG:3857'))
      this.map.getView().setZoom(4)
    },
    mapLoading() {
      this.loading = this.$loading({
        target: document.querySelector('.map-content'),
        lock: true,
        text: '地图初始化...',
        spinner: 'el-icon-loading',
        background: 'rgba(255, 255, 255, 0.1)',
        customClass: 'map-loading'
      })
    }
  }
}
