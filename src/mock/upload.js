/**
 * 大文件分段上传 mock：模拟分段上传通用后端（内存实现）。
 * 对接真实后端时删除本文件，ChunkUploader 的 api 改为引用 @/api/upload.js 即可
 * （函数签名与返回结构完全一致，见 src/utils/chunkUpload.js 顶部注释）。
 *
 * 返回结构对齐 @/api/request.js 拦截器约定：{ code: 200, data: {...} }。
 *
 * 注意：数据保存在内存 Map 中，刷新页面后丢失（断点续传/秒传仅当前会话内有效）；
 * 真实后端应持久化到磁盘/数据库。
 */

// hash -> { fileName, size, chunkSize, totalChunks, uploaded: Set<number>, merged: boolean }
const store = new Map()

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function randomLatency(min = 200, max = 600) {
  return delay(min + Math.random() * (max - min))
}

/**
 * 初始化上传：登记文件信息，返回已上传分片序号（断点续传）与是否已完成（秒传）。
 * @returns Promise<{ code, data: { uploaded: number[], finished: boolean } }>
 */
export async function mockInit({ hash, fileName, size, chunkSize, totalChunks }) {
  await randomLatency(50, 150)
  let record = store.get(hash)
  if (!record) {
    record = { fileName, size, chunkSize, totalChunks, uploaded: new Set(), merged: false }
    store.set(hash, record)
  }
  return {
    code: 200,
    data: {
      uploaded: Array.from(record.uploaded),
      finished: record.merged
    }
  }
}

/**
 * 上传一个分片。模拟网络延迟，并有约 2% 随机失败（用于验证前端重试逻辑）。
 * @returns Promise<{ code, data: null }>
 */
export async function mockUploadChunk({ hash, index }) {
  await randomLatency()
  const record = store.get(hash)
  if (!record) {
    throw new Error('上传不存在，请先初始化')
  }
  if (Math.random() < 0.02) {
    throw new Error('模拟网络波动：分片上传失败')
  }
  record.uploaded.add(index)
  return { code: 200, data: null }
}

/**
 * 合并分片：校验齐全后标记完成。
 * @returns Promise<{ code, data: null }>
 */
export async function mockMerge({ hash, totalChunks }) {
  await delay(300)
  const record = store.get(hash)
  if (!record) {
    throw new Error('上传不存在，请先初始化')
  }
  if (record.uploaded.size < totalChunks) {
    throw new Error('分片不完整，无法合并')
  }
  record.merged = true
  return { code: 200, data: null }
}
