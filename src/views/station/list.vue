<template>
  <div class="station-list">
    <!-- 数据表格 -->
    <div class="table-card">
      <el-table :data="pagedList" stripe size="small">
        <el-table-column label="序号" width="70" align="center">
          <template slot-scope="{ row }">
            <span class="status-dot" :class="row.status === '正常' ? 'dot-green' : 'dot-gray'"></span>
            {{ row.id }}
          </template>
        </el-table-column>
        <el-table-column prop="name" label="站名" min-width="80" />
        <el-table-column prop="group" label="组名" min-width="80" />
        <el-table-column prop="mountPoint" label="挂载点" min-width="110" />
        <el-table-column prop="serviceType" label="服务类型" min-width="90" />
        <el-table-column label="站点状态" min-width="90">
          <template slot-scope="{ row }">
            <span :class="row.status === '正常' ? 'text-green' : 'text-gray'">{{ row.status }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="flow" label="基准站流量(kB)" min-width="120" align="right" />
        <el-table-column prop="totalFlow" label="基准站总流量(MB)" min-width="140" align="right" />
        <el-table-column prop="flowDelay" label="流量延迟(MS)" min-width="110" align="right" />
        <el-table-column prop="decodeDelay" label="解码延迟(MS)" min-width="110" align="right" />
        <el-table-column label="操作" width="100" align="center">
          <template slot-scope="{ row }">
            <span class="link-edit" @click="openDialog(row)">编辑</span>
            <span class="link-del" @click="handleDelete(row)">删除</span>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        class="pagination"
        background
        layout="total, prev, pager, next, sizes, jumper"
        :total="filteredList.length"
        :page-sizes="[10, 20, 50]"
        :page-size.sync="page.pageSize"
        :current-page.sync="page.page"
      />
    </div>

    <!-- 编辑弹窗 -->
    <el-dialog title="编辑基准站" :visible.sync="dialogVisible" width="520px">
      <el-form :model="editForm" label-width="130px" size="small">
        <el-form-item label="站名">
          <el-input v-model="editForm.name" />
        </el-form-item>
        <el-form-item label="组名">
          <el-input v-model="editForm.group" />
        </el-form-item>
        <el-form-item label="挂载点">
          <el-input v-model="editForm.mountPoint" />
        </el-form-item>
        <el-form-item label="服务类型">
          <el-select v-model="editForm.serviceType" style="width: 100%">
            <el-option label="基准站" value="基准站" />
            <el-option label="监测站" value="监测站" />
          </el-select>
        </el-form-item>
        <el-form-item label="站点状态">
          <el-select v-model="editForm.status" style="width: 100%">
            <el-option label="正常" value="正常" />
            <el-option label="离线" value="离线" />
          </el-select>
        </el-form-item>
        <el-form-item label="基准站流量(kB)">
          <el-input v-model="editForm.flow" />
        </el-form-item>
        <el-form-item label="基准站总流量(MB)">
          <el-input v-model="editForm.totalFlow" />
        </el-form-item>
        <el-form-item label="流量延迟(MS)">
          <el-input v-model="editForm.flowDelay" />
        </el-form-item>
        <el-form-item label="解码延迟(MS)">
          <el-input v-model="editForm.decodeDelay" />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button size="small" @click="dialogVisible = false">取 消</el-button>
        <el-button type="primary" size="small" @click="handleSave">确 定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
// 对接后端时：把 fetchMock 改为调用 @/api 下的接口（参照 @/api/user.js 的封装约定）
// 筛选栏在 components/ListFilter.vue，通过 $bus 事件 'station-list-filter' 传入筛选条件
import { mockStationList } from '@/mock/station'

const defaultFilters = () => ({
  searchType: 'name',
  keyword: '',
  serviceType: '全部',
  flowType: '所有'
})

export default {
  name: 'StationList',
  data() {
    return {
      catalog: 'own',
      allList: [],
      appliedFilters: defaultFilters(),
      page: { page: 1, pageSize: 10 },
      dialogVisible: false,
      editForm: {}
    }
  },
  computed: {
    filteredList() {
      const f = this.appliedFilters
      return this.allList.filter(row => {
        if (f.keyword) {
          const val = String(row[f.searchType] || '')
          if (!val.toLowerCase().includes(f.keyword.trim().toLowerCase())) return false
        }
        if (f.serviceType !== '全部' && row.serviceType !== f.serviceType) return false
        if (f.flowType !== '所有' && row.flowType !== f.flowType) return false
        return true
      })
    },
    pagedList() {
      const start = (this.page.page - 1) * this.page.pageSize
      return this.filteredList.slice(start, start + this.page.pageSize)
    }
  },
  created() {
    this.fetchMock(this.catalog)
    this.$bus.$on('catalog-change', this.onCatalogChange)
    this.$bus.$on('station-list-filter', this.onFilter)
  },
  beforeDestroy() {
    this.$bus.$off('catalog-change', this.onCatalogChange)
    this.$bus.$off('station-list-filter', this.onFilter)
  },
  methods: {
    fetchMock(catalog) {
      this.allList = mockStationList(catalog)
    },
    onCatalogChange(catalog) {
      this.catalog = catalog
      this.page.page = 1
      this.fetchMock(catalog)
    },
    onFilter(filters) {
      this.appliedFilters = { ...defaultFilters(), ...filters }
      this.page.page = 1
    },
    openDialog(row) {
      this.editForm = { ...row }
      this.dialogVisible = true
    },
    handleSave() {
      const idx = this.allList.findIndex(item => item.id === this.editForm.id)
      if (idx > -1) this.$set(this.allList, idx, { ...this.editForm })
      this.dialogVisible = false
      this.$message.success('更新成功')
    },
    handleDelete(row) {
      this.$confirm('确定删除基准站「' + row.name + '」吗？', '提示', { type: 'warning' })
        .then(() => {
          this.allList = this.allList.filter(item => item.id !== row.id)
          this.$message.success('删除成功')
        })
        .catch(() => {})
    }
  }
}
</script>

<style scoped>
.table-card {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 12px 16px;
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
  vertical-align: middle;
}
.dot-green {
  background: #52c41a;
}
.dot-gray {
  background: #bfbfbf;
}
.text-green {
  color: #52c41a;
}
.text-gray {
  color: #999;
}

.pagination {
  margin-top: 14px;
  text-align: center;
}
</style>
