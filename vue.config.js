module.exports = {
  lintOnSave: false,
  devServer: {
    port: 8080
    // 对接后端时打开下面的代理配置，把 target 改成你的后端地址，
    // 前端请求 /api/** 会被转发到该地址（可解决开发环境跨域问题）
    // proxy: {
    //   '/api': {
    //     target: 'http://localhost:3000',
    //     changeOrigin: true
    //   }
    // }
  }
}
