/**
 * 站点模块 mock 数据。
 * 对接后端时删除本文件，改为调用 @/api 下的接口即可（页面中已预留替换位置）。
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

const STATION_CODES = ['TJMP', 'SDHI', 'HZXC', 'NBTJ', 'WUXI', 'SUZH', 'JAXN', 'HUZH']
const GROUP_NAMES = ['天津', '杭州', '宁波', '无锡', '苏州', '嘉兴', '湖州']
const SERVICE_TYPES = ['基准站', '监测站']
const FLOW_TYPES = ['RTK', 'RTD', '静态']

/* 地图站点状态（与图例一致） */
export const STATION_STATUS = [
  { key: 'normal', label: '正常', color: '#52c41a' },
  { key: 'single', label: '单站播发', color: '#13c2c2' },
  { key: 'monitor', label: '监测站', color: '#1890ff' },
  { key: 'search', label: '搜星异常', color: '#a0d911' },
  { key: 'jam', label: '干扰/欺骗', color: '#f5222d' },
  { key: 'offline', label: '禁用/离线', color: '#999999' }
]

/**
 * 生成基准站列表 mock 数据
 * @param {'own'|'public'} catalog 目录类型
 */
export function mockStationList(catalog = 'own') {
  const rng = createRng(catalog === 'own' ? 20240001 : 20240002)
  const total = catalog === 'own' ? 104 : 86
  const list = []
  for (let i = 0; i < total; i++) {
    const code = STATION_CODES[Math.floor(rng() * STATION_CODES.length)]
    const online = rng() > 0.08
    list.push({
      id: i + 1,
      name: code,
      group: GROUP_NAMES[Math.floor(rng() * GROUP_NAMES.length)],
      mountPoint: 'RB' + code + '01',
      serviceType: SERVICE_TYPES[Math.floor(rng() * SERVICE_TYPES.length)],
      flowType: FLOW_TYPES[Math.floor(rng() * FLOW_TYPES.length)],
      status: online ? '正常' : '离线',
      flow: (4 + rng() * 1.5).toFixed(3),
      totalFlow: (700 + rng() * 80).toFixed(3),
      flowDelay: Math.round(4 + rng() * 6),
      decodeDelay: Math.round(24 + rng() * 12)
    })
  }
  return list
}

/**
 * 生成站点分布 mock 点（杭州范围）
 * @param {'own'|'public'} catalog 目录类型
 */
export function mockMapStations(catalog = 'own') {
  const rng = createRng(catalog === 'own' ? 20240003 : 20240004)
  const count = 30
  // 各状态权重：正常居多
  const pool = ['normal', 'normal', 'normal', 'normal', 'normal', 'single', 'single', 'monitor', 'monitor', 'search', 'jam', 'offline']
  const list = []
  for (let i = 0; i < count; i++) {
    list.push({
      id: i + 1,
      name: STATION_CODES[Math.floor(rng() * STATION_CODES.length)],
      group: '分组' + ['一', '二', '三'][Math.floor(rng() * 3)],
      lon: 119.95 + rng() * 0.55,
      lat: 30.1 + rng() * 0.32,
      status: pool[Math.floor(rng() * pool.length)]
    })
  }
  return list
}

/* 分布页筛选项 mock */
export const MAP_GROUPS = ['所有分组', '分组一', '分组二', '分组三']
export const MAP_REGIONS = ['SDHI', 'TJMP', 'HZXC', 'NBTJ']

/* 列表页筛选项 mock */
export const SEARCH_TYPES = [
  { label: '站名', value: 'name' },
  { label: '组名', value: 'group' },
  { label: '挂载点', value: 'mountPoint' }
]
export const SERVICE_TYPE_OPTIONS = ['全部', ...SERVICE_TYPES]
export const FLOW_TYPE_OPTIONS = ['所有', ...FLOW_TYPES]
