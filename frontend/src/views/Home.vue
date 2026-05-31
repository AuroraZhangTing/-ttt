<template>
  <div class="home">
    <header class="header">
      <h1>产学研项目管理系统</h1>
      <div class="header-right">
        <span>{{ username }}</span>
        <el-button text @click="showAdd = true">+ 新建项目</el-button>
        <el-button text @click="logout">退出</el-button>
      </div>
    </header>
    <main class="main">
      <div class="project-list">
        <div v-for="p in projects" :key="p.id" class="project-row" @click="goProject(p.id)">
          <span class="project-name">{{ p.name }}</span>
          <span class="project-right">
            <el-progress :percentage="p.progress" :color="progressColor(p.progress)" :width="180" />
            <el-button type="danger" size="small" text @click.stop="handleDelete(p.id, p.name)" :icon="Delete" />
          </span>
        </div>
        <el-empty v-if="projects.length === 0" description="暂无项目，请新建" />
      </div>
    </main>

    <el-dialog v-model="showAdd" title="新建项目" width="400px">
      <el-form>
        <el-form-item label="项目名称">
          <el-input v-model="newName" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="项目总金额">
          <el-input-number v-model="newAmount" :min="0" :precision="2" style="width:100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAdd = false">取消</el-button>
        <el-button type="primary" @click="handleAdd" :disabled="!newName.trim()">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getProjects, createProject, deleteProject } from '../api'
import type { Project } from '../types'
import { Delete } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'

const router = useRouter()
const username = ref(localStorage.getItem('username') || '')
const projects = ref<Project[]>([])
const showAdd = ref(false)
const newName = ref('')
const newAmount = ref(0)

async function loadProjects() {
  projects.value = await getProjects()
}

function progressColor(p: number) {
  if (p < 30) return '#909399'
  if (p < 70) return '#e6a23c'
  return '#67c23a'
}

function goProject(id: number) {
  router.push(`/project/${id}`)
}

async function handleDelete(id: number, name: string) {
  try {
    await ElMessageBox.confirm(`确定要删除项目「${name}」吗？此操作不可恢复。`, '删除确认', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' })
    await deleteProject(id)
    loadProjects()
  } catch { }
}

async function handleAdd() {
  if (!newName.value.trim()) return
  await createProject(newName.value.trim(), newAmount.value)
  showAdd.value = false
  newName.value = ''
  newAmount.value = 0
  loadProjects()
}

function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('username')
  router.push('/login')
}

onMounted(loadProjects)
</script>

<style scoped>
.home {
  min-height: 100vh;
  background: #f5f7fa;
}
.header {
  background: white;
  padding: 16px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}
.header h1 {
  margin: 0;
  font-size: 20px;
  color: #1a73e8;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.main {
  max-width: 1000px;
  margin: 24px auto;
  padding: 0 16px;
}
.project-list {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.project-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  transition: background 0.2s;
}
.project-row:hover {
  background: #f0f5ff;
}
.project-row:last-child {
  border-bottom: none;
}
.project-name {
  font-size: 16px;
  color: #1a73e8;
  font-weight: 500;
}
.project-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
