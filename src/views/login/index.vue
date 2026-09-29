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
export default {
  name: 'LoginPage',
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
      loading: false
    }
  },
  methods: {
    handleLogin() {
      this.$refs.loginForm.validate(valid => {
        if (!valid) return
        this.loading = true
       // this.$store
       //   .dispatch('user/login', this.form)
      //    .then(() => {
            this.$router.push(this.$route.query.redirect || '/')
        //  })
       //   .finally(() => {
       //     this.loading = false
      //    })
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
  background-color: #2d3a4b;
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
