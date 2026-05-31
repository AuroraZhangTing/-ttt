export interface Project {
  id: number
  name: string
  total_amount: number
  reimbursed_amount: number
  created_at: string
  updated_at: string
  steps: Step[]
  progress: number
}

export interface Step {
  id: number
  project_id: number
  step_index: number
  status: 'pending' | 'in_progress' | 'completed'
  data: any
  created_at: string
  updated_at: string
}

export const STEP_NAMES = [
  '合同确定',
  '合同盖章',
  '合同寄出与签收',
  '经费认领',
  '开票管理',
  '经费报销',
  '项目结题'
]
