import request from './request'

// 大屏接口（登录与大屏接口文档.md 第 3 章）。
// 全部由大屏页面轮询调用，统一 loading: false，不弹全屏加载框。

// 3.1 基准站数量 → result: { online, offline, abnormal }
export function getStationNbr() {
  return request({ url: '/station/nbr', method: 'get', loading: false })
}

// 3.2 站点分布 → result: [{ areaName, stationNbr, onlineNbr, abnormalNbr }]
export function getDistribution(data = { type: 2, groupName: '' }) {
  return request({ url: '/station/getDistribution', method: 'post', data, loading: false })
}

// 3.3 服务端口 → result: [{ frame, port, coordSystem }]
export function getServerInfo() {
  return request({ url: '/server/info', method: 'get', loading: false })
}

// 3.4 定位服务调用总次数 → result: number
export function getCallTotalNbr() {
  return request({ url: '/statistics/callTotalNbr', method: 'get', loading: false })
}

// 3.5 分布图统计，params: { start, end, adcode? }，时间格式 yyyy-MM-dd HH:mm:ss
// → result: { totalNbr, cqList: [{ 'yyyy-MM-dd': nbr }], areaList: [{ area, nbr }] }
export function getCallAreaNbr(params) {
  return request({ url: '/statistics/callAreaNbr', method: 'get', params, loading: false })
}

// 3.6 激活账号数（累计）→ result: number
export function getTotalActiveNbr() {
  return request({ url: '/statistics/totalActiveNbr', method: 'get', loading: false })
}

// 3.6 激活账号数（某日新增），dateStr: yyyy-MM-dd → result: number
export function getNewActiveNbr(dateStr) {
  return request({ url: '/statistics/newActiveNbr', method: 'get', params: { dateStr }, loading: false })
}

// 3.6 活跃账号数（昨日）→ result: number
export function getActiveNbr() {
  return request({ url: '/statistics/activeNbr', method: 'get', loading: false })
}

// 3.6 并发数 → result: number
export function getConcurrentNbr() {
  return request({ url: '/statistics/concurrentNbr', method: 'get', loading: false })
}

// 3.6 当前用户数 → result: number
export function getCurrentNbr() {
  return request({ url: '/statistics/currentNbr', method: 'get', loading: false })
}

// 3.7 异常行为 5 类数量 → result: { blacklist, nonBlackLock, nonBlackName, expired, inactive }
export function getAbnormalBehavior(days = 30) {
  return request({ url: '/statistics/abnormalBehavior', method: 'get', params: { days }, loading: false })
}

// 3.8.1 资源监控 → result: [{ module, cpu, memory, ioIn, ioOut, io, time }]
export function getResource(latest = 10) {
  return request({ url: '/monitor/resource', method: 'get', params: { latest }, loading: false })
}

// 3.8.2 应用告警 → result: [{ module, alarmType, count, time, restart, cpuOver, ioOver }]
export function getAlarm(latest = 10) {
  return request({ url: '/monitor/alarm', method: 'get', params: { latest }, loading: false })
}

// 3.8.3 异常日志 → result: [{ module, log, count, time }]
export function getAbnormalLog(latest = 10) {
  return request({ url: '/monitor/abnormalLog', method: 'get', params: { latest }, loading: false })
}

// 3.8.4 连通性监控 → result: [{ module, type, status, time }]
export function getConnectivity() {
  return request({ url: '/monitor/connectivity', method: 'get', loading: false })
}
