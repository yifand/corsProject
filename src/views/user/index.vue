<template>
  <div>
    <div class="toolbar">
      <el-input
        v-model="query.keyword"
        placeholder="用户名 / 邮箱"
        clearable
        style="width: 240px"
        @clear="handleSearch"
        @keyup.enter.native="handleSearch"
      />
      <el-button type="primary" icon="el-icon-search" @click="handleSearch">搜索</el-button>
      <el-button
        type="primary"
        icon="el-icon-plus"
        class="add-btn"
        @click="openDialog()"
      >
        新增用户
      </el-button>
    </div>

    <el-table v-loading="loading" :data="list" border>
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="username" label="用户名" />
      <el-table-column prop="email" label="邮箱" />
      <el-table-column prop="role" label="角色" width="120">
        <template slot-scope="{ row }">
          {{ row.role === 'admin' ? '管理员' : '普通用户' }}
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100">
        <template slot-scope="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'info'">
            {{ row.status === 1 ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160">
        <template slot-scope="{ row }">
          <el-button size="mini" @click="openDialog(row)">编辑</el-button>
          <el-button size="mini" type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      class="pagination"
      background
      layout="total, prev, pager, next"
      :total="total"
      :page-size="query.pageSize"
      :current-page.sync="query.page"
      @current-change="fetchList"
    />

    <el-dialog
      :title="dialogForm.id ? '编辑用户' : '新增用户'"
      :visible.sync="dialogVisible"
      width="480px"
    >
      <el-form
        ref="dialogForm"
        :model="dialogForm"
        :rules="dialogRules"
        label-width="80px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="dialogForm.username" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="dialogForm.email" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="dialogForm.role" style="width: 100%">
            <el-option label="管理员" value="admin" />
            <el-option label="普通用户" value="user" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-switch v-model="dialogForm.status" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="dialogVisible = false">取 消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">确 定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { getUserList, addUser, updateUser, deleteUser } from '@/api/user'

const defaultForm = {
  id: null,
  username: '',
  email: '',
  role: 'user',
  status: 1
}

export default {
  name: 'UserPage',
  data() {
    return {
      query: {
        page: 1,
        pageSize: 10,
        keyword: ''
      },
      list: [],
      total: 0,
      loading: false,
      dialogVisible: false,
      saving: false,
      dialogForm: { ...defaultForm },
      dialogRules: {
        username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
        email: [
          { required: true, message: '请输入邮箱', trigger: 'blur' },
          { type: 'email', message: '邮箱格式不正确', trigger: 'blur' }
        ],
        role: [{ required: true, message: '请选择角色', trigger: 'change' }]
      }
    }
  },
  created() {
    this.fetchList()
  },
  methods: {
    // 约定列表接口返回 data: { list, total }
    fetchList() {
      this.loading = true
      getUserList(this.query)
        .then(res => {
          this.list = res.data.list
          this.total = res.data.total
        })
        .finally(() => {
          this.loading = false
        })
    },
    handleSearch() {
      this.query.page = 1
      this.fetchList()
    },
    openDialog(row) {
      this.dialogForm = row ? { ...row } : { ...defaultForm }
      this.dialogVisible = true
      this.$nextTick(() => {
        this.$refs.dialogForm && this.$refs.dialogForm.clearValidate()
      })
    },
    handleSave() {
      this.$refs.dialogForm.validate(valid => {
        if (!valid) return
        this.saving = true
        const action = this.dialogForm.id ? updateUser : addUser
        action(this.dialogForm)
          .then(() => {
            this.$message.success(this.dialogForm.id ? '更新成功' : '新增成功')
            this.dialogVisible = false
            this.fetchList()
          })
          .finally(() => {
            this.saving = false
          })
      })
    },
    handleDelete(row) {
      this.$confirm('确定删除用户「' + row.username + '」吗？', '提示', {
        type: 'warning'
      }).then(() => {
        deleteUser(row.id).then(() => {
          this.$message.success('删除成功')
          this.fetchList()
        })
      }).catch(() => {})
    }
  }
}
</script>

<style scoped>
.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}
.add-btn {
  margin-left: auto;
}
.pagination {
  margin-top: 16px;
  text-align: right;
}
</style>
