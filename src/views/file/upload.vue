<template>
  <div class="file-upload">
    <!-- 拖拽选择区 -->
    <div
      class="drop-zone"
      :class="{ dragging }"
      @click="$refs.fileInput.click()"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
    >
      <i class="el-icon-upload"></i>
      <p>点击选择或拖拽文件到此处，支持多文件、单文件数 GB 大文件</p>
      <p class="tip">分片并发上传，支持暂停 / 续传 / 秒传，上传过程不影响页面操作（当前为模拟上传，接口约定见 @/api/upload.js）</p>
      <input
        ref="fileInput"
        type="file"
        multiple
        class="file-input"
        @change="onFileChange"
      />
    </div>

    <!-- 任务列表 -->
    <div v-if="tasks.length" class="table-card">
      <el-table :data="tasks" stripe size="small">
        <el-table-column label="文件名" min-width="180">
          <template slot-scope="{ row }">
            <span class="file-name" :title="row.name">{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column label="大小" width="110" align="right">
          <template slot-scope="{ row }">{{ formatSize(row.size) }}</template>
        </el-table-column>
        <el-table-column label="文件哈希" width="110" align="center">
          <template slot-scope="{ row }">
            <span :title="row.hash">{{ row.hash ? row.hash.slice(0, 8) : '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110" align="center">
          <template slot-scope="{ row }">
            <el-tag :type="statusType(row.status)" size="mini">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="进度" min-width="200">
          <template slot-scope="{ row }">
            <el-progress
              :percentage="displayPercent(row)"
              :status="progressStatus(row.status)"
              :stroke-width="14"
              :text-inside="true"
            />
            <div v-if="row.status === 'uploading'" class="sub-info">
              {{ formatSize(row.speed) }}/s　{{ row.uploadedChunks }}/{{ row.totalChunks }} 分片
            </div>
            <div v-else-if="row.status === 'error'" class="sub-info error-text">{{ row.errorMsg }}</div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" align="center">
          <template slot-scope="{ row, $index }">
            <span v-if="row.status === 'uploading'" class="link" @click="pauseTask(row)">暂停</span>
            <span v-if="row.status === 'paused'" class="link" @click="resumeTask(row)">继续</span>
            <span v-if="row.status === 'error'" class="link" @click="retryTask(row)">重试</span>
            <span
              v-if="!['success', 'instant'].includes(row.status)"
              class="link link-del"
              @click="cancelTask(row, $index)"
            >取消</span>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script>
// 大文件分段上传：哈希在 Web Worker 中计算（见 @/utils/fileHash.js），
// 分片并发控制 / 断点续传 / 秒传逻辑见 @/utils/chunkUpload.js，两端都不阻塞页面。
import { hashFile } from '@/utils/fileHash'
import { ChunkUploader } from '@/utils/chunkUpload'

const STATUS_TEXT = {
  hashing: '计算哈希中',
  uploading: '上传中',
  paused: '已暂停',
  merging: '合并中',
  success: '已完成',
  instant: '秒传成功',
  error: '失败'
}

const STATUS_TAG = {
  hashing: 'warning',
  uploading: '',
  paused: 'info',
  merging: 'warning',
  success: 'success',
  instant: 'success',
  error: 'danger'
}

let taskId = 0

export default {
  name: 'FileUpload',
  data() {
    return {
      dragging: false,
      tasks: []
    }
  },
  beforeDestroy() {
    // 离开页面：终止所有进行中的任务与哈希 Worker，避免泄漏
    this.tasks.forEach(task => this.disposeTask(task))
  },
  methods: {
    onFileChange(e) {
      this.addFiles(e.target.files)
      e.target.value = '' // 允许重复选择同一文件
    },
    onDrop(e) {
      this.dragging = false
      this.addFiles(e.dataTransfer.files)
    },
    addFiles(fileList) {
      Array.from(fileList || []).forEach(file => {
        const dup = this.tasks.some(
          t => t.name === file.name && t.size === file.size && !['success', 'instant'].includes(t.status)
        )
        if (dup) {
          this.$message.warning(`文件「${file.name}」已在上传列表中`)
          return
        }
        const task = {
          id: ++taskId,
          file,
          name: file.name,
          size: file.size,
          hash: '',
          hashPercent: 0,
          status: 'hashing',
          percent: 0,
          speed: 0,
          uploadedChunks: 0,
          totalChunks: 0,
          errorMsg: '',
          uploader: null,
          cancelHash: null,
          _lastBytes: 0,
          _lastTime: 0
        }
        this.tasks.push(task)
        this.runTask(task)
      })
    },
    async runTask(task) {
      // 1) Worker 中计算 MD5，不阻塞页面
      const { promise, cancel } = hashFile(task.file, percent => {
        task.hashPercent = percent
      })
      task.cancelHash = cancel
      try {
        task.hash = await promise
      } catch (err) {
        if (err.message !== 'cancelled') {
          task.status = 'error'
          task.errorMsg = '哈希计算失败：' + err.message
        }
        return
      }
      task.cancelHash = null

      // 2) 分片并发上传（断点续传 / 秒传由 uploader 内部处理）
      const uploader = new ChunkUploader({
        file: task.file,
        hash: task.hash,
        onProgress: info => {
          task.uploadedChunks = info.uploadedChunks
          task.totalChunks = info.totalChunks
          task.percent = Math.floor((info.uploadedBytes / info.totalBytes) * 100)
          this.updateSpeed(task, info.uploadedBytes)
        },
        onStatus: status => {
          task.status = status
          if (status === 'error') {
            task.errorMsg = (uploader.error && uploader.error.message) || '上传失败'
            task.speed = 0
          }
          if (status === 'success' || status === 'instant') {
            task.percent = 100
            task.speed = 0
            this.$message.success(
              status === 'instant' ? `「${task.name}」秒传成功` : `「${task.name}」上传完成`
            )
          }
        }
      })
      task.uploader = uploader
      uploader.start()
    },
    updateSpeed(task, uploadedBytes) {
      const now = Date.now()
      if (!task._lastTime) {
        task._lastTime = now
        task._lastBytes = uploadedBytes
        return
      }
      const dt = (now - task._lastTime) / 1000
      if (dt >= 0.5) {
        task.speed = Math.max(0, Math.round((uploadedBytes - task._lastBytes) / dt))
        task._lastTime = now
        task._lastBytes = uploadedBytes
      }
    },
    pauseTask(task) {
      if (task.uploader) task.uploader.pause()
      task.speed = 0
      task._lastTime = 0
    },
    resumeTask(task) {
      if (task.uploader) task.uploader.resume()
    },
    retryTask(task) {
      if (!task.uploader) {
        // 哈希阶段失败：从头再来
        task.status = 'hashing'
        task.hashPercent = 0
        this.runTask(task)
        return
      }
      task.errorMsg = ''
      task.uploader.retry()
    },
    cancelTask(task, index) {
      this.$confirm(`确定取消上传「${task.name}」吗？`, '提示', { type: 'warning' })
        .then(() => {
          this.disposeTask(task)
          this.tasks.splice(index, 1)
        })
        .catch(() => {})
    },
    disposeTask(task) {
      if (task.cancelHash) task.cancelHash()
      if (task.uploader) task.uploader.cancel()
    },
    displayPercent(row) {
      return row.status === 'hashing' ? row.hashPercent : row.percent
    },
    statusText(status) {
      return STATUS_TEXT[status] || status
    },
    statusType(status) {
      return STATUS_TAG[status] || 'info'
    },
    progressStatus(status) {
      if (status === 'success' || status === 'instant') return 'success'
      if (status === 'error') return 'exception'
      return null
    },
    formatSize(bytes) {
      if (!bytes) return '0 B'
      const units = ['B', 'KB', 'MB', 'GB', 'TB']
      const i = Math.min(units.length - 1, Math.floor(Math.log2(bytes) / 10))
      return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + ' ' + units[i]
    }
  }
}
</script>

<style scoped>
.file-upload {
  min-height: 200px;
}

/* 拖拽选择区 */
.drop-zone {
  background: #fff;
  border: 2px dashed #dcdfe6;
  border-radius: 6px;
  padding: 40px 20px;
  text-align: center;
  color: #606266;
  cursor: pointer;
  transition: border-color 0.2s;
}
.drop-zone:hover,
.drop-zone.dragging {
  border-color: #c7000b;
}
.drop-zone .el-icon-upload {
  font-size: 48px;
  color: #c7000b;
  margin-bottom: 10px;
}
.drop-zone p {
  margin: 6px 0;
  font-size: 14px;
}
.drop-zone .tip {
  font-size: 12px;
  color: #909399;
}
.file-input {
  display: none;
}

/* 任务列表 */
.table-card {
  margin-top: 12px;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 12px 16px;
}
.file-name {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}
.sub-info {
  margin-top: 2px;
  font-size: 12px;
  color: #909399;
}
.error-text {
  color: #f56c6c;
}
.link {
  color: #c7000b;
  cursor: pointer;
  margin-right: 10px;
}
.link-del {
  color: #f56c6c;
}
</style>
