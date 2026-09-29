import request from './request'

// 登录
export function login(data) {
  return request({
    url: '/user/login',
    method: 'post',
    data
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
