/**
 * 大文件 MD5 计算：在 Web Worker 中按切片增量计算，不阻塞主线程。
 *
 * 说明：项目使用 webpack 4（vue-cli 4），不支持 `new Worker(new URL(...))`，
 * 也未引入 worker-loader / spark-md5，因此这里把一份自包含的增量 MD5 实现
 * 作为字符串内嵌，通过 Blob URL 创建 Worker，零新增依赖。
 *
 * 用法：
 *   const { promise, cancel } = hashFile(file, percent => {})
 *   const hash = await promise   // 32 位小写 MD5
 *   cancel()                     // 可随时终止（promise 以 'cancelled' 拒绝）
 */

/* eslint-disable */
// —— 以下为 Worker 源码（运行在无依赖环境，必须是 ES5，不能使用 import/箭头函数）——
const WORKER_SOURCE = `
'use strict';

// ============ 增量 MD5（RFC 1321） ============
var K = [
  0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee,
  0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
  0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be,
  0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
  0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa,
  0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
  0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed,
  0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
  0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c,
  0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
  0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05,
  0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
  0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039,
  0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
  0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1,
  0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391
];
var S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
];

function MD5() {
  this.a = 0x67452301;
  this.b = 0xefcdab89;
  this.c = 0x98badcfe;
  this.d = 0x10325476;
  this.buffer = new Uint8Array(64);
  this.bufferLength = 0;
  this.totalBytes = 0;
}

MD5.prototype.process = function (block, offset) {
  var a = this.a, b = this.b, c = this.c, d = this.d;
  for (var i = 0; i < 64; i++) {
    var F, g;
    if (i < 16) { F = (b & c) | (~b & d); g = i; }
    else if (i < 32) { F = (d & b) | (~d & c); g = (5 * i + 1) % 16; }
    else if (i < 48) { F = b ^ c ^ d; g = (3 * i + 5) % 16; }
    else { F = c ^ (b | ~d); g = (7 * i) % 16; }
    var o = offset + (g << 2);
    var M = block[o] | (block[o + 1] << 8) | (block[o + 2] << 16) | (block[o + 3] << 24);
    F = (F + a + K[i] + M) | 0;
    a = d;
    d = c;
    c = b;
    b = (b + ((F << S[i]) | (F >>> (32 - S[i])))) | 0;
  }
  this.a = (this.a + a) | 0;
  this.b = (this.b + b) | 0;
  this.c = (this.c + c) | 0;
  this.d = (this.d + d) | 0;
};

MD5.prototype.update = function (data) {
  this.totalBytes += data.length;
  var pos = 0;
  if (this.bufferLength > 0) {
    var take = Math.min(64 - this.bufferLength, data.length);
    this.buffer.set(data.subarray(0, take), this.bufferLength);
    this.bufferLength += take;
    pos += take;
    if (this.bufferLength === 64) {
      this.process(this.buffer, 0);
      this.bufferLength = 0;
    }
  }
  while (pos + 64 <= data.length) {
    this.process(data, pos);
    pos += 64;
  }
  if (pos < data.length) {
    this.buffer.set(data.subarray(pos), 0);
    this.bufferLength = data.length - pos;
  }
};

MD5.prototype.hex = function () {
  var len = this.totalBytes;
  // 位长度按 64 位小端写入（拆成两个 32 位字，支持 >4GB 文件）
  var bitLenLo = (len * 8) % 4294967296;
  var bitLenHi = Math.floor((len * 8) / 4294967296);
  var padLen = this.bufferLength < 56 ? 56 - this.bufferLength : 120 - this.bufferLength;
  var pad = new Uint8Array(padLen + 8);
  pad[0] = 0x80;
  for (var i = 0; i < 4; i++) {
    pad[padLen + i] = (bitLenLo >>> (8 * i)) & 0xff;
    pad[padLen + 4 + i] = (bitLenHi >>> (8 * i)) & 0xff;
  }
  this.update(pad);
  var words = [this.a, this.b, this.c, this.d];
  var hex = '';
  for (var w = 0; w < 4; w++) {
    for (var b = 0; b < 4; b++) {
      var byte = (words[w] >>> (8 * b)) & 0xff;
      hex += (byte < 16 ? '0' : '') + byte.toString(16);
    }
  }
  return hex;
};

// ============ 按切片读取文件并增量哈希 ============
var CHUNK_SIZE = 8 * 1024 * 1024; // 8MB：内存占用恒定，几个 G 文件也没压力

self.onmessage = function (e) {
  var file = e.data.file;
  try {
    var md5 = new MD5();
    var reader = new FileReaderSync();
    var offset = 0;
    if (file.size === 0) {
      self.postMessage({ type: 'progress', percent: 100 });
    }
    while (offset < file.size) {
      var end = Math.min(offset + CHUNK_SIZE, file.size);
      var buf = reader.readAsArrayBuffer(file.slice(offset, end));
      md5.update(new Uint8Array(buf));
      offset = end;
      self.postMessage({ type: 'progress', percent: Math.round((offset / file.size) * 100) });
    }
    self.postMessage({ type: 'done', hash: md5.hex() });
  } catch (err) {
    self.postMessage({ type: 'error', message: err && err.message ? err.message : String(err) });
  }
};
`
/* eslint-enable */

/**
 * 计算文件 MD5（Web Worker 中执行，不卡页面）。
 * @param {File|Blob} file 文件
 * @param {(percent: number) => void} [onProgress] 进度回调 0~100
 * @returns {{ promise: Promise<string>, cancel: () => void }}
 */
export function hashFile(file, onProgress) {
  const url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' }))
  const worker = new Worker(url)

  const cleanup = () => {
    worker.terminate()
    URL.revokeObjectURL(url)
  }

  let rejectPromise
  const promise = new Promise((resolve, reject) => {
    rejectPromise = reject
    worker.onmessage = e => {
      const data = e.data
      if (data.type === 'progress') {
        if (onProgress) onProgress(data.percent)
      } else if (data.type === 'done') {
        cleanup()
        resolve(data.hash)
      } else {
        cleanup()
        reject(new Error(data.message || '哈希计算失败'))
      }
    }
    worker.onerror = err => {
      cleanup()
      reject(new Error(err.message || '哈希计算失败'))
    }
    worker.postMessage({ file })
  })

  return {
    promise,
    cancel() {
      cleanup()
      rejectPromise(new Error('cancelled'))
    }
  }
}
