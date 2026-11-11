import request from './request'

// 获取滑块验证码（文档 2.1）：返回 result: { background, slider, token }
export function getVerify() {
  return request({
    url: '/login/getVerify',
    method: 'get',
    loading: false
  })
}

// 登录（文档 2.2），data: { username, password, captchaToken, sliderOffset }
// 成功后 token 在响应头 Authorization 返回，由 request.js 拦截器统一落盘
// （loading: false —— 登录按钮自带 loading 态，不再叠加全屏遮罩）
export function login(data) {
  return request({
    url: '/login',
    method: 'post',
    data,
    loading: false
  })
}

// 用户分页列表，params: { page, pageSize, keyword }
export function getUserList(params) {
  return request({
    url: '/user/list',
    method: 'get',
    params
  })
}

// 新增用户
export function addUser(data) {
  return request({
    url: '/user/add',
    method: 'post',
    data
  })
}

// 更新用户
export function updateUser(data) {
  return request({
    url: '/user/update',
    method: 'post',
    data
  })
}

// 删除用户
export function deleteUser(id) {
  return request({
    url: '/user/delete',
    method: 'post',
    data: { id }
  })
}
