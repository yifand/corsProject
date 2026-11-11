const config = require('./config')

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
    port: 8080,
      proxy: {
      '/cors': {
        target: `http://${config.__PROJECT}.dev.internal.virtueit.net:81/v1/corsdashboard`, // 接口域名
        secure: false, // 如果是https接口，需要配置这个参数
        changeOrigin: true, // 是否跨域
        pathRewrite: {
          '^/cors': '/'
        }
      }
    }
  }
}
