<template>
  <div class="login-container">
    <el-form
      ref="loginForm"
      :model="form"
      :rules="rules"
      class="login-form"
      @submit.native.prevent
    >
      <h2 class="title">后台管理系统</h2>
      <el-form-item prop="username">
        <el-input
          v-model="form.username"
          placeholder="用户名"
          prefix-icon="el-icon-user"
        />
      </el-form-item>
      <el-form-item prop="password">
        <el-input
          v-model="form.password"
          type="password"
          placeholder="密码"
          prefix-icon="el-icon-lock"
          show-password
          @keyup.enter.native="handleLogin"
        />
      </el-form-item>
      <el-form-item>
        <slider-captcha ref="captcha" @change="onCaptchaChange" />
      </el-form-item>
      <el-button
        type="primary"
        class="login-btn"
        :loading="loading"
        @click="handleLogin"
      >
        登 录
      </el-button>
    </el-form>
  </div>
</template>

<script>
import SliderCaptcha from '@/components/SliderCaptcha.vue'

export default {
  name: 'LoginPage',
  components: { SliderCaptcha },
  data() {
    return {
      form: {
        username: '',
        password: ''
      },
      rules: {
        username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
        password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
      },
      // 滑块验证结果 { captchaToken, sliderOffset }，未拖动为 null
      captcha: null,
      loading: false
    }
  },
  methods: {
    onCaptchaChange(payload) {
      this.captcha = payload
    },
    handleLogin() {
      this.$refs.loginForm.validate(valid => {
        if (!valid) return
        if (!this.captcha) {
          this.$message.warning('请按住滑块拖动完成验证')
          return
        }
        this.loading = true
        this.$store
          .dispatch('user/login', { ...this.form, ...this.captcha })
          .then(() => {
            this.$router.push('/screen')
          })
          .catch(() => {
            // 错误提示由 request.js 响应拦截器统一处理；
            // 验证码一次性（含密码错误），失败后必须换新验证码
            this.captcha = null
            this.$refs.captcha.refresh()
          })
          .finally(() => {
            this.loading = false
          })
      })
    }
  }
}
</script>

<style scoped>
.login-container {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0b1b33 url('~@/assets/images/login-bg.png') no-repeat center center;
  background-size: cover;
}
.login-form {
  width: 360px;
  padding: 32px 32px 24px;
  background-color: #fff;
  border-radius: 6px;
}
.title {
  margin: 0 0 24px;
  text-align: center;
  color: #333;
}
.login-btn {
  width: 100%;
}
</style>
