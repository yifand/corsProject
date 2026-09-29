<template>
  <div class="panel">
    <div class="panel-header">
      <BaseTitile :title="title" />
    </div>
    <div class="panel-body">
      <slot />
    </div>

  </div>
</template>

<script>
import BaseTitile from './BaseTitile.vue'

export default {
  name: 'ScreenPanel',
  components: { BaseTitile },
  props: {
    title: {
      type: String,
      default: ''
    }
  }
}
</script>

<style scoped>
.panel {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;

  box-sizing: border-box;
}

.panel-header {
  padding: 0 8px;
  flex-shrink: 0;
}



.panel-body {
  flex: 1;
  min-height: 0;
  padding: 10px 12px;
  background: url('~@/assets/images/框(3).png');
  background-size: 100% 100%;
  box-sizing: border-box;
  overflow: hidden;
}

.corner {
  position: absolute;
  width: 14px;
  height: 14px;
  pointer-events: none;
}

.corner-lt {
  top: -1px;
  left: -1px;
  border-top: 2px solid #00e4ff;
  border-left: 2px solid #00e4ff;
}

.corner-rb {
  bottom: -1px;
  right: -1px;
  border-bottom: 2px solid #00e4ff;
  border-right: 2px solid #00e4ff;
}
</style>
