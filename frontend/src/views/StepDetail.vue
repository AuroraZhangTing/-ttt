<template>
  <div class="step-detail">
    <header class="header">
      <el-button text @click="$router.push(`/project/${projectId}`)">← 返回流程</el-button>
      <h1>{{ stepNames[stepIndex] }}</h1>
      <div>
        <el-tag v-if="step" :type="statusType(step.status)" size="default">{{ statusText(step.status) }}</el-tag>
      </div>
    </header>
    <main class="main">
      <el-form v-if="step" label-width="140px" label-position="left">
        <template v-for="field in fields" :key="field.key">
          <!-- Text input -->
          <el-form-item :label="field.label" v-if="field.type === 'text'">
            <el-input v-model="formData[field.key]" :placeholder="field.placeholder || ''" style="max-width:400px" />
          </el-form-item>

          <!-- Datetime -->
          <el-form-item :label="field.label" v-else-if="field.type === 'datetime'">
            <el-date-picker v-model="formData[field.key]" type="datetime" placeholder="选择日期时间" format="YYYY-MM-DD HH:mm" value-format="YYYY-MM-DD HH:mm" style="width:100%;max-width:400px" />
          </el-form-item>

          <!-- Number -->
          <el-form-item :label="field.label" v-else-if="field.type === 'number'">
            <el-input-number v-model="formData[field.key]" :min="0" :precision="2" style="width:100%;max-width:400px" />
          </el-form-item>

          <!-- Integer -->
          <el-form-item :label="field.label" v-else-if="field.type === 'integer'">
            <el-input-number v-model="formData[field.key]" :min="0" :step="1" style="width:100%;max-width:400px" />
          </el-form-item>

          <!-- Switch / Boolean -->
          <el-form-item :label="field.label" v-else-if="field.type === 'switch'">
            <el-switch v-model="formData[field.key]" :active-value="'是'" :inactive-value="'否'" active-text="是" inactive-text="否" />
          </el-form-item>

          <!-- Select -->
          <el-form-item :label="field.label" v-else-if="field.type === 'select'">
            <el-select v-model="formData[field.key]" style="width:100%;max-width:400px">
              <el-option v-for="opt in field.options || []" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </el-form-item>

          <!-- Readonly display -->
          <el-form-item :label="field.label" v-else-if="field.type === 'display'">
            <span style="line-height:32px">{{ formData[field.key] }}</span>
          </el-form-item>

          <!-- File upload -->
          <el-form-item :label="field.label" v-else-if="field.type === 'file'">
            <div class="upload-area">
              <el-upload
                :show-file-list="false"
                :http-request="(opts) => handleUpload(field.key, opts.file)"
                :before-upload="beforeUpload"
              >
                <el-button type="primary" plain size="small">选择文件</el-button>
              </el-upload>
              <div v-if="formData[field.key]" class="file-info">
                <a :href="fileUrl(formData[field.key])" target="_blank" class="file-link">{{ fileName(formData[field.key]) }}</a>
                <el-button text type="danger" size="small" @click="formData[field.key] = ''">删除</el-button>
              </div>
            </div>
          </el-form-item>
        </template>

        <el-form-item>
          <div class="actions">
            <el-button type="success" :disabled="step.status === 'completed'" @click="saveStatus('completed')">保存并标记已完成</el-button>
            <el-button type="primary" plain @click="saveStatus('in_progress')">保存（进行中）</el-button>
            <el-button @click="saveStatus('pending')" v-if="step.status !== 'pending'">重置为未开始</el-button>
          </div>
        </el-form-item>
      </el-form>
      <el-empty v-else description="加载中..." />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getStep, updateStep, uploadFile } from '../api'
import { STEP_NAMES } from '../types'
import { ElMessage, ElMessageBox } from 'element-plus'

const route = useRoute()
const router = useRouter()
const projectId = parseInt(route.params.id as string)
const stepIndex = parseInt(route.params.stepIndex as string)
const stepNames = STEP_NAMES

const step = ref<any>(null)
const formData = reactive<Record<string, any>>({})
const uploading = ref(false)

// Define fields for each step index
const fieldsConfig: Record<number, any[]> = {
  0: [ // 合同确定
    { key: '负责人', label: '负责人', type: 'text', placeholder: '请输入负责人姓名' },
    { key: '合同确定时间', label: '合同确定时间', type: 'datetime' },
    { key: '合同定稿文件', label: '合同定稿文件', type: 'file' },
    { key: '备注', label: '备注', type: 'text', placeholder: '可选' },
  ],
  1: [ // 合同盖章
    { key: '负责人', label: '负责人', type: 'text', placeholder: '请输入负责人姓名' },
    { key: '盖章时间', label: '盖章时间', type: 'datetime' },
    { key: '合同份数', label: '合同份数', type: 'integer' },
    { key: '企业是否已盖章', label: '企业是否已盖章', type: 'switch' },
    { key: '学校是否已盖章', label: '学校是否已盖章', type: 'switch' },
    { key: '是否扫描', label: '是否扫描', type: 'switch' },
    { key: '是否上传至科研系统', label: '是否上传至科研系统', type: 'switch' },
    { key: '财务老师是否通过', label: '财务老师是否通过', type: 'switch' },
    { key: '盖章后合同扫描件', label: '盖章后合同扫描件', type: 'file' },
  ],
  2: [ // 合同寄出与签收
    { key: '负责人', label: '负责人（寄出人）', type: 'text', placeholder: '请输入寄出人姓名' },
    { key: '寄出时间', label: '寄出时间', type: 'datetime' },
    { key: '快递单号', label: '快递单号', type: 'text', placeholder: '顺丰快递单号' },
    { key: '寄出份数', label: '寄出份数', type: 'integer' },
    { key: '是否签收', label: '是否签收', type: 'switch' },
    { key: '客户是否确认收到', label: '客户是否确认收到', type: 'switch' },
    { key: '快递签收截图', label: '快递签收截图', type: 'file' },
    { key: '客户微信确认截图', label: '客户微信确认截图', type: 'file' },
  ],
  3: [ // 经费认领
    { key: '负责人', label: '负责人', type: 'text', placeholder: '请输入负责人姓名' },
    { key: '打款金额', label: '打款金额', type: 'number' },
    { key: '打款时间', label: '打款时间', type: 'datetime' },
    { key: '银行流水号', label: '银行流水号', type: 'text', placeholder: '请输入银行流水号' },
    { key: '认领办理时间', label: '认领办理时间', type: 'datetime' },
    { key: '经费是否到学校虚拟账户', label: '经费是否到学校虚拟账户', type: 'switch' },
    { key: '客户打款流水截图', label: '客户打款流水截图', type: 'file' },
    { key: '财务认领成功凭证', label: '财务认领成功凭证', type: 'file' },
  ],
  4: [ // 开票管理
    { key: '负责人', label: '负责人', type: 'text', placeholder: '请输入负责人姓名' },
    { key: '开票申请时间', label: '开票申请时间', type: 'datetime' },
    { key: '开票时间', label: '开票时间', type: 'datetime' },
    { key: '发票类型', label: '发票类型', type: 'select', options: ['普票', '增值税专票'] },
    { key: '发票号码', label: '发票号码', type: 'text', placeholder: '请输入发票号码' },
    { key: '发票金额', label: '发票金额', type: 'number' },
    { key: '客户是否确认票样', label: '客户是否确认票样', type: 'switch' },
    { key: '是否发送给客户', label: '是否发送给客户', type: 'switch' },
    { key: '发票预览截图', label: '发票预览截图', type: 'file' },
    { key: '电子发票文件', label: '电子发票文件', type: 'file' },
  ],
  5: [ // 经费报销
    { key: '负责人', label: '负责人', type: 'text', placeholder: '请输入负责人姓名' },
    { key: '报销时间', label: '报销时间', type: 'datetime' },
    { key: '本次报销金额', label: '本次报销金额', type: 'number' },
    { key: '报销类型', label: '报销类型', type: 'select', options: ['发票', '劳务费'] },
    { key: '收款账户姓名', label: '收款账户姓名', type: 'text', placeholder: '请输入收款人姓名' },
    { key: '收款账号', label: '收款账号', type: 'text', placeholder: '请输入收款账号' },
    { key: '是否到账', label: '是否到账', type: 'switch' },
    { key: '是否通知老师并确认', label: '是否通知老师并确认', type: 'switch' },
    { key: '项目总金额', label: '项目总金额', type: 'display' },
    { key: '已报销金额', label: '已报销金额', type: 'display' },
    { key: '剩余金额', label: '剩余金额', type: 'display' },
    { key: '报销申请单', label: '报销申请单', type: 'file' },
    { key: '发票', label: '发票', type: 'file' },
    { key: '银行到账截图', label: '银行到账截图', type: 'file' },
  ],
  6: [ // 项目结题
    { key: '负责人', label: '负责人', type: 'text', placeholder: '请输入负责人姓名' },
    { key: '结题提交时间', label: '结题提交时间', type: 'datetime' },
    { key: '结题完成时间', label: '结题完成时间', type: 'datetime' },
    { key: '是否结题', label: '是否结题', type: 'switch' },
    { key: '结题报告', label: '结题报告', type: 'file' },
    { key: '学校结题通过凭证', label: '学校结题通过凭证', type: 'file' },
  ],
}

const fields = computed(() => fieldsConfig[stepIndex] || [])

async function load() {
  const res = await getStep(projectId, stepIndex)
  step.value = res
  const data = res.data || {}
  // Initialize formData with defaults
  for (const f of fieldsConfig[stepIndex] || []) {
    if (f.type === 'switch') {
      formData[f.key] = data[f.key] ?? '否'
    } else if (f.type === 'integer') {
      if (f.key === '合同份数') formData[f.key] = data[f.key] ?? 4
      else if (f.key === '寄出份数') formData[f.key] = data[f.key] ?? 2
      else formData[f.key] = data[f.key] ?? 0
    } else if (f.type === 'number') {
      formData[f.key] = data[f.key] ?? 0
    } else {
      formData[f.key] = data[f.key] ?? ''
    }
  }

  // Load display fields for reimbursement step
  if (stepIndex === 5) {
    const { getProjectSteps } = await import('../api')
    const projRes = await getProjectSteps(projectId)
    formData['项目总金额'] = projRes.project.total_amount || 0
    formData['已报销金额'] = projRes.project.reimbursed_amount || 0
    const remaining = (formData['项目总金额'] || 0) - (formData['已报销金额'] || 0)
    formData['剩余金额'] = Math.max(0, remaining)
  }
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

function beforeUpload(file: File) {
  const isLt50M = file.size / 1024 / 1024 < 50
  if (!isLt50M) {
    ElMessage.error('文件大小不能超过 50MB')
    return false
  }
  return true
}

async function handleUpload(key: string, file: File) {
  try {
    const res = await uploadFile(file)
    formData[key] = res.url
    ElMessage.success('上传成功')
  } catch {
    ElMessage.error('上传失败')
  }
}

function fileUrl(val: string) {
  if (!val) return ''
  if (val.startsWith('http')) return val
  return `http://localhost:3000${val}`
}

function fileName(val: string) {
  if (!val) return ''
  const parts = val.split('/')
  return parts[parts.length - 1]
}

async function saveStatus(status: string) {
  if (status === 'pending') {
    await ElMessageBox.confirm('确定要重置为未开始吗？', '提示')
  }
  await updateStep(projectId, stepIndex, { status, data: { ...formData } })
  step.value.status = status
  ElMessage.success('保存成功')
}

onMounted(load)
</script>

<style scoped>
.step-detail {
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
  max-width: 800px;
  margin: 24px auto;
  padding: 24px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.upload-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.file-info {
  display: flex;
  align-items: center;
  gap: 8px;
}
.file-link {
  color: #409eff;
  text-decoration: none;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.actions {
  display: flex;
  gap: 12px;
}
</style>
