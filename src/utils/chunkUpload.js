/**
 * 大文件分片上传管理器：与 UI 解耦，页面只需提供回调。
 *
 * 流程：init（断点续传/秒传）-> 并发池上传剩余分片（单片失败自动重试）-> merge。
 * 分片用 file.slice() 惰性引用，不整读文件，几个 G 的文件内存占用恒定。
 *
 * 对接真实后端：把下面 defaultApi 的三个引用从 '@/mock/upload' 换成 '@/api/upload' 即可
 * （两边函数签名与返回结构一致）。
 */
import { mockInit, mockUploadChunk, mockMerge } from '@/mock/upload'

const defaultApi = {
  init: mockInit,
  uploadChunk: mockUploadChunk,
  merge: mockMerge
}

// 状态机：idle -> uploading -> paused / merging -> success / instant / error
// instant 表示秒传（服务端已有完整文件）
export class ChunkUploader {
  /**
   * @param {Object} options
   * @param {File} options.file 待上传文件
   * @param {string} options.hash 文件 MD5
   * @param {number} [options.chunkSize] 分片大小，默认 20MB
   * @param {number} [options.concurrency] 并发数，默认 3
   * @param {number} [options.retries] 单片失败重试次数，默认 2
   * @param {Object} [options.api] { init, uploadChunk, merge }，默认走 mock
   * @param {(info: { uploadedBytes, totalBytes, uploadedChunks, totalChunks }) => void} [options.onProgress]
   * @param {(status: string) => void} [options.onStatus]
   */
  constructor(options) {
    this.file = options.file
    this.hash = options.hash
    this.chunkSize = options.chunkSize || 20 * 1024 * 1024
    this.concurrency = options.concurrency || 3
    this.retries = options.retries != null ? options.retries : 2
    this.api = options.api || defaultApi
    this.onProgress = options.onProgress || function () {}
    this.onStatus = options.onStatus || function () {}

    this.totalChunks = Math.max(1, Math.ceil(this.file.size / this.chunkSize))
    this.uploaded = new Set()
    this.inFlight = new Set()
    this.status = 'idle'
    this.error = null
    this.paused = false
    this.cancelled = false
    this.failed = false
  }

  setStatus(status) {
    this.status = status
    this.onStatus(status)
  }

  chunkLen(index) {
    const start = index * this.chunkSize
    return Math.max(0, Math.min(this.chunkSize, this.file.size - start))
  }

  emitProgress() {
    let bytes = 0
    this.uploaded.forEach(index => {
      bytes += this.chunkLen(index)
    })
    this.onProgress({
      uploadedBytes: Math.min(bytes, this.file.size),
      totalBytes: this.file.size,
      uploadedChunks: this.uploaded.size,
      totalChunks: this.totalChunks
    })
  }

  /** 开始上传：init -> 跳过已传分片 -> 并发上传 -> merge */
  async start() {
    this.setStatus('uploading')
    try {
      const res = await this.api.init({
        hash: this.hash,
        fileName: this.file.name,
        size: this.file.size,
        chunkSize: this.chunkSize,
        totalChunks: this.totalChunks
      })
      const data = res.data || {}
      if (data.finished) {
        // 秒传：服务端已有完整文件
        for (let i = 0; i < this.totalChunks; i++) this.uploaded.add(i)
        this.emitProgress()
        this.setStatus('instant')
        return
      }
      // 断点续传：跳过已上传分片
      ;(data.uploaded || []).forEach(index => this.uploaded.add(index))
      this.emitProgress()
      await this.runPool()
    } catch (err) {
      if (this.status !== 'error') {
        this.error = err
        this.setStatus('error')
      }
    }
  }

  /** 暂停：进行中的分片自然结束，不再派发新分片 */
  pause() {
    if (this.status !== 'uploading') return
    this.paused = true
    this.setStatus('paused')
  }

  /** 继续上传 */
  resume() {
    if (this.status !== 'paused') return
    this.paused = false
    this.setStatus('uploading')
    this.runPool()
  }

  /** 失败后重试：从失败点继续（已传分片不会重传） */
  retry() {
    if (this.status !== 'error') return
    this.failed = false
    this.error = null
    this.setStatus('uploading')
    this.runPool()
  }

  /** 取消：终止派发，状态置为 cancelled（页面一般随之移除该任务） */
  cancel() {
    this.cancelled = true
    this.setStatus('cancelled')
  }

  /** 原子领取一个待上传分片序号，无则返回 -1 */
  claim() {
    for (let i = 0; i < this.totalChunks; i++) {
      if (!this.uploaded.has(i) && !this.inFlight.has(i)) {
        this.inFlight.add(i)
        return i
      }
    }
    return -1
  }

  async runPool() {
    const workers = []
    for (let i = 0; i < this.concurrency; i++) {
      workers.push(this.worker())
    }
    await Promise.all(workers)
    if (this.cancelled || this.failed || this.paused) return
    if (this.uploaded.size !== this.totalChunks) return
    this.setStatus('merging')
    try {
      await this.api.merge({
        hash: this.hash,
        fileName: this.file.name,
        totalChunks: this.totalChunks
      })
      this.setStatus('success')
    } catch (err) {
      this.failed = true
      this.error = err
      this.setStatus('error')
    }
  }

  async worker() {
    while (!this.cancelled && !this.paused && !this.failed) {
      const index = this.claim()
      if (index === -1) return
      try {
        await this.uploadWithRetry(index)
        this.inFlight.delete(index)
        this.uploaded.add(index)
        this.emitProgress()
      } catch (err) {
        this.inFlight.delete(index)
        this.failed = true
        this.error = err
        this.setStatus('error')
        return
      }
    }
  }

  async uploadWithRetry(index) {
    const start = index * this.chunkSize
    const chunk = this.file.slice(start, start + this.chunkLen(index))
    let lastErr = null
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        await this.api.uploadChunk({ hash: this.hash, index, chunk })
        return
      } catch (err) {
        lastErr = err
      }
    }
    throw lastErr
  }
}
