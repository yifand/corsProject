/**
 * 大文件分段上传真实接口约定（当前未接线，页面默认走 @/mock/upload.js）。
 * 后端就绪后：把 src/utils/chunkUpload.js 顶部的 defaultApi 改成本文件导出的三个函数即可。
 *
 * 后端约定：
 * - 以文件 MD5（hash）作为上传标识；
 * - init 返回已上传分片序号（断点续传）与 finished（秒传）；
 * - chunk 接口接收 FormData：hash、index、chunk（Blob）；
 * - merge 在全部分片上传完成后调用，服务端合并并落盘。
 */
import request from './request'

// 初始化上传。返回 data: { uploaded: number[], finished: boolean }
export function initUpload({ hash, fileName, size, chunkSize, totalChunks }) {
  return request({
    url: '/file/upload/init',
    method: 'post',
    data: { hash, fileName, size, chunkSize, totalChunks }
  })
}

// 上传单个分片。大分片传输耗时不可控，单独放宽超时时间
export function uploadChunk({ hash, index, chunk }) {
  const formData = new FormData()
  formData.append('hash', hash)
  formData.append('index', index)
  formData.append('chunk', chunk)
  return request({
    url: '/file/upload/chunk',
    method: 'post',
    data: formData,
    timeout: 0
  })
}

// 全部分片上传完成后通知服务端合并
export function mergeUpload({ hash, fileName, totalChunks }) {
  return request({
    url: '/file/upload/merge',
    method: 'post',
    data: { hash, fileName, totalChunks }
  })
}
