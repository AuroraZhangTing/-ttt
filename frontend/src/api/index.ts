import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '../router'

const api = axios.create({
  baseURL: '/',
  timeout: 30000
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('username')
      router.push('/login')
      ElMessage.error('登录已过期，请重新登录')
    }
    return Promise.reject(error)
  }
)

export default api

export async function login(username: string, password: string) {
  const res = await api.post('/api/login', { username, password })
  return res.data
}

export async function getProjects() {
  const res = await api.get('/api/projects')
  return res.data
}

export async function createProject(name: string, total_amount?: number) {
  const res = await api.post('/api/projects', { name, total_amount })
  return res.data
}

export async function deleteProject(id: number) {
  const res = await api.delete(`/api/projects/${id}`)
  return res.data
}

export async function getProjectSteps(projectId: number) {
  const res = await api.get(`/api/projects/${projectId}/steps`)
  return res.data
}

export async function getStep(projectId: number, stepIndex: number) {
  const res = await api.get(`/api/projects/${projectId}/steps/${stepIndex}`)
  return res.data
}

export async function updateStep(projectId: number, stepIndex: number, data: { status?: string, data?: any }) {
  const res = await api.put(`/api/projects/${projectId}/steps/${stepIndex}`, data)
  return res.data
}

export async function uploadFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await api.post('/api/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return res.data
}
