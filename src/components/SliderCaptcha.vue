<template>
  <div class="slider-captcha">
    <!-- 背景图 300×80（含缺口），滑块 60×80，按容器宽等比缩放 -->
    <div ref="stage" class="captcha-stage">
      <template v-if="!loadFailed">
        <img v-if="background" class="bg" :src="background" alt="" draggable="false" />
        <img
          v-if="slider"
          class="piece"
          :src="slider"
          :style="{ left: offsetX + 'px' }"
          alt=""
          draggable="false"
        />
        <i class="el-icon-refresh refresh-btn" title="刷新验证码" @click="refresh"></i>
      </template>
      <div v-else class="load-failed" @click="refresh">验证码加载失败，点击重试</div>
    </div>
    <div ref="track" class="captcha-track">
      <span class="track-tip">按住滑块拖动完成验证</span>
      <div class="track-handle" :style="{ left: handleX + 'px' }" @mousedown="onDragStart">
        <i class="el-icon-d-arrow-right"></i>
      </div>
    </div>
  </div>
</template>

<script>
import { getVerify } from '@/api/user'

const BG_WIDTH = 300 // 背景图原始宽（文档 2.1）
const SLIDER_WIDTH = 60 // 滑块图原始宽
const HANDLE_WIDTH = 40

export default {
  name: 'SliderCaptcha',
  data() {
    return {
      background: '',
      slider: '',
      captchaToken: '',
      loadFailed: false, // 验证码拉取失败（如后端未启动）
      offsetX: 0, // 滑块左边缘的展示坐标（px）
      // 容器宽度测量值（$refs 非响应式，必须在 mounted 后量到 data 里，
      // 否则下面的 computed 恒为 0、滑块拖不动）
      stageW: 0,
      trackW: 0,
      dragging: false,
      startClientX: 0,
      startOffsetX: 0
    }
  },
  computed: {
    // 滑块图展示宽度（与背景同比例缩放）
    pieceWidth() {
      return (this.stageW * SLIDER_WIDTH) / BG_WIDTH
    },
    maxOffset() {
      return Math.max(0, this.stageW - this.pieceWidth)
    },
    // 滑块位移 → 拖动条手柄位移的换算比例
    handleRatio() {
      const maxHandle = Math.max(0, this.trackW - HANDLE_WIDTH)
      return this.maxOffset > 0 ? maxHandle / this.maxOffset : 0
    },
    handleX() {
      return this.offsetX * this.handleRatio
    }
  },
  created() {
    this.refresh()
  },
  mounted() {
    this.measure()
    window.addEventListener('resize', this.measure)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.measure)
    this.removeDragListeners()
  },
  methods: {
    measure() {
      this.stageW = this.$refs.stage ? this.$refs.stage.clientWidth : 0
      this.trackW = this.$refs.track ? this.$refs.track.clientWidth : 0
    },
    // 重新拉取验证码并复位（验证码一次性，登录失败后必须刷新）
    refresh() {
      this.offsetX = 0
      getVerify()
        .then(res => {
          const { background, slider, token } = res.result || {}
          this.background = background
          this.slider = slider
          this.captchaToken = token
          this.loadFailed = false
          this.$nextTick(this.measure)
        })
        .catch(() => {
          this.background = ''
          this.slider = ''
          this.captchaToken = ''
          this.loadFailed = true
        })
    },
    onDragStart(e) {
      if (!this.captchaToken || this.dragging) return
      this.dragging = true
      this.startClientX = e.clientX
      this.startOffsetX = this.offsetX
      document.addEventListener('mousemove', this.onDragMove)
      document.addEventListener('mouseup', this.onDragEnd)
    },
    onDragMove(e) {
      if (!this.dragging) return
      const dx = (e.clientX - this.startClientX) / (this.handleRatio || 1)
      this.offsetX = Math.min(this.maxOffset, Math.max(0, this.startOffsetX + dx))
    },
    onDragEnd() {
      if (!this.dragging) return
      this.dragging = false
      this.removeDragListeners()
      // sliderOffset 换算：拖拽距离 / 页面展示宽度 * 300（文档 2.2）
      const sliderOffset = this.stageW
        ? Math.round((this.offsetX / this.stageW) * BG_WIDTH)
        : 0
      this.$emit('change', { captchaToken: this.captchaToken, sliderOffset })
    },
    removeDragListeners() {
      document.removeEventListener('mousemove', this.onDragMove)
      document.removeEventListener('mouseup', this.onDragEnd)
    }
  }
}
</script>

<style scoped>
.slider-captcha {
  user-select: none;
}

.captcha-stage {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: 4px;
  background: #f5f7fa;
}

.captcha-stage .bg {
  display: block;
  width: 100%;
  height: auto;
}

.captcha-stage .piece {
  position: absolute;
  top: 0;
  left: 0;
  width: 20%; /* 60/300 */
  height: 100%;
}

.refresh-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  padding: 2px;
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  text-shadow: 0 0 3px rgba(0, 0, 0, 0.6);
}

.load-failed {
  /* 与背景图展示高度（296 宽 × 80/300 ≈ 79px）接近即可 */
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;
  color: #909399;
}

.captcha-track {
  position: relative;
  height: 34px;
  margin-top: 8px;
  background: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.track-tip {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #909399;
}

.track-handle {
  position: absolute;
  top: -1px;
  left: 0;
  width: 40px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: #409eff;
  border-radius: 4px;
  cursor: grab;
}
</style>
