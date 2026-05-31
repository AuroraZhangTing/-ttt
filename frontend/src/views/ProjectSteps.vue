<template>
  <div class="steps-page">
    <header class="header">
      <el-button text @click="$router.push('/')">← 返回</el-button>
      <h1>{{ project?.name }}</h1>
      <div style="width:80px"></div>
    </header>
    <main class="main">
      <div class="steps-row">
        <div
          v-for="(s, i) in steps"
          :key="i"
          class="step-card"
          :class="s.status"
          @click="goStep(i)"
        >
          <div class="step-icon">
            <el-icon v-if="s.status === 'completed'" style="color:#67c23a"><Check /></el-icon>
            <span v-else>{{ i + 1 }}</span>
          </div>
          <div class="step-name">{{ stepNames[i] }}</div>
          <div class="step-status-tag">
            <el-tag :type="statusType(s.status)" size="small">{{ statusText(s.status) }}</el-tag>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getProjectSteps, deleteProject } from '../api'
import { STEP_NAMES } from '../types'
import type { Project, Step } from '../types'
import { Check } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const projectId = parseInt(route.params.id as string)
const project = ref<Project | null>(null)
const steps = ref<Step[]>([])
const stepNames = STEP_NAMES

async function load() {
  const res = await getProjectSteps(projectId)
  project.value = res.project
  steps.value = res.steps.map((s: any) => ({
    ...s,
    data: typeof s.data === 'string' ? JSON.parse(s.data) : s.data
  }))
}

function goStep(index: number) {
  router.push(`/project/${projectId}/step/${index}`)
}

function statusType(status: string) {
  if (status === 'completed') return 'success'
  if (status === 'in_progress') return 'primary'
  return 'info'
}

function statusText(status: string) {
  if (status === 'completed') return '已完成'
  if (status === 'in_progress') return '进行中'
  return '未开始'
}

onMounted(load)
</script>

<style scoped>
.steps-page {
  min-height: 100vh;
  background: #f5f7fa;
}
.header {
  background: white;
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}
.header h1 {
  margin: 0;
  font-size: 18px;
  color: #333;
}
.main {
  max-width: 960px;
  margin: 40px auto;
  padding: 0 16px;
}
.steps-row {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  justify-content: center;
}
.step-card {
  width: 200px;
  padding: 24px 16px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}
.step-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
}
.step-card.completed {
  border-color: #67c23a;
  background: #f0f9eb;
}
.step-card.in_progress {
  border-color: #409eff;
  background: #ecf5ff;
}
.step-card.pending {
  border-color: #dcdfe6;
  background: #fafafa;
}
.step-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;
  font-size: 20px;
  font-weight: 700;
  color: white;
  background: #dcdfe6;
}
.completed .step-icon { background: #67c23a; }
.in_progress .step-icon { background: #409eff; }
.step-name {
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 8px;
  color: #333;
}
</style>
