/**
 * 卫星模块 mock 数据。
 * 简化圆轨道星下点模拟（非真实 TLE 星历），满足轨迹演示需求；
 * 对接真实数据时替换 satPosition / satTrack 的数据源即可。
 */

/* 确定性伪随机：保证每次刷新数据稳定 */
function createRng(seed) {
  let s = seed >>> 0
  return function () {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* 卫星系统（配色仿地面轨迹图） */
export const SAT_SYSTEMS = [
  { key: 'G', label: 'GPS', color: '#7cd322', incl: 55, periodHours: 11.97, count: 8 },
  { key: 'R', label: 'GLONASS', color: '#e8541e', incl: 64.8, periodHours: 11.26, count: 8 },
  { key: 'E', label: 'Galileo', color: '#12b5e5', incl: 56, periodHours: 14.08, count: 8 }
]

const HOUR = 3600 * 1000
const EARTH_PERIOD = 24 * HOUR // 地球自转周期（近似）

/**
 * 生成卫星 mock 列表
 * @returns 卫星数组 { id, name, system, systemLabel, color, incl(rad), periodMs, phase, node0 }
 */
export function mockSatellites() {
  const rng = createRng(20240005)
  const list = []
  let id = 1
  SAT_SYSTEMS.forEach(sys => {
    for (let i = 0; i < sys.count; i++) {
      list.push({
        id: id++,
        name: sys.key + String(i * 3 + 3).padStart(2, '0'), // G03 G06 ... 仿截图编号风格
        system: sys.key,
        systemLabel: sys.label,
        color: sys.color,
        incl: (sys.incl * Math.PI) / 180,
        periodMs: sys.periodHours * HOUR,
        phase: rng() * Math.PI * 2,
        node0: rng() * 360 - 180
      })
    }
  })
  return list
}

function normLon(lon) {
  // 注意 JS 的 % 是取余（结果符号跟随被除数），lon 为大负数时 ((lon + 540) % 360) - 180
  // 会得到 [-540, -180) 的非法经度，坐标超出世界范围导致要素被裁剪。先归一化到 [0,360) 再平移。
  return ((((lon + 180) % 360) + 360) % 360) - 180
}

/**
 * 某模拟时刻的星下点坐标
 * @param sat 卫星对象
 * @param t 模拟时间（ms）
 * @returns [lon, lat]（度）
 */
export function satPosition(sat, t) {
  const u = (2 * Math.PI * t) / sat.periodMs + sat.phase
  const lat = (Math.asin(Math.sin(sat.incl) * Math.sin(u)) * 180) / Math.PI
  const lon =
    sat.node0 +
    (Math.atan2(Math.cos(sat.incl) * Math.sin(u), Math.cos(u)) * 180) / Math.PI -
    (360 * t) / EARTH_PERIOD
  return [normLon(lon), lat]
}

/**
 * 固定历元的静态地面轨迹（前后各两个轨道周期），按 ±180° 经度跳变切段。
 * 轨道角与地球自转线性耦合，该曲线不随时间漂移；卫星始终精确位于曲线上、沿曲线移动。
 * @param sat 卫星对象
 * @param epoch 固定历元（ms，通常取页面打开时刻）
 * @param samples 采样点数
 * @returns 线段数组，元素为 [[lon,lat], ...]（供 MultiLineString 使用）
 */
export function satTrack(sat, epoch, samples = 480) {
  const start = epoch - 2 * sat.periodMs
  const step = (4 * sat.periodMs) / samples
  const lines = []
  let seg = []
  let prev = null
  for (let i = 0; i <= samples; i++) {
    const p = satPosition(sat, start + i * step)
    if (prev && Math.abs(p[0] - prev[0]) > 180) {
      if (seg.length > 1) lines.push(seg)
      seg = []
    }
    seg.push(p)
    prev = p
  }
  if (seg.length > 1) lines.push(seg)
  return lines
}
