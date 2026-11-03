import request from './request'

// 卫星历元数据，date 格式 yyyyMMdd
// 返回 data: { 历元('2026-11-01T06:20'): [{ prn, ifVal, lat, lon }] }，结构见项目根目录 sateqi.txt
export function getSateqiEpoch(date) {
  return request({
    url: '/gnss/sateqi/epoch',
    method: 'get',
    params: { date }
  })
}
