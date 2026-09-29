module.exports = {
  lintOnSave: false,
  css: {
    loaderOptions: {
      postcss: {
        plugins: [
          // 大屏 rem 适配：设计稿 1920 宽，amfe-flexible 把 1rem 设为屏宽/10，
          // 即设计稿上 192px = 1rem；Px/PX 写法不转换
          require('postcss-pxtorem')({
            rootValue: 192,
            unitPrecision: 5,
            propList: ['*'],
            minPixelValue: 2, // 1px 边框等不转换，防止细线消失
            exclude: file => !/src[\\/]views[\\/]screen/.test(file) // 只转大屏模块
          })
        ]
      }
    }
  },
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
