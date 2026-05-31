import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'chanxueyan-key-2026';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: '未登录' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: '登录已过期' });
  }
}

// ===== Auth =====
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const { data: users } = await supabase
    .from('users')
    .select('id, username')
    .eq('username', username)
    .eq('password', password);
  if (!users || users.length === 0) return res.status(400).json({ error: '账号或密码错误' });
  const user = users[0];
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, username: user.username });
});

// ===== Projects =====
app.get('/api/projects', auth, async (req, res) => {
  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });

  const result = await Promise.all(projects.map(async (p) => {
    const { data: steps } = await supabase
      .from('project_steps')
      .select('step_index, status')
      .eq('project_id', p.id)
      .order('step_index');
    const totalSteps = steps?.length || 0;
    const completedSteps = steps?.filter(s => s.status === 'completed').length || 0;
    const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
    return { ...p, steps: steps || [], progress };
  }));
  res.json(result);
});

app.post('/api/projects', auth, async (req, res) => {
  const { name, total_amount } = req.body;
  if (!name) return res.status(400).json({ error: '项目名称不能为空' });

  const { data: project, error } = await supabase
    .from('projects')
    .insert({ name, total_amount: total_amount || 0 })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });

  const stepsData = Array.from({ length: 7 }, (_, i) => ({
    project_id: project.id,
    step_index: i,
    status: 'pending',
    data: '{}'
  }));
  await supabase.from('project_steps').insert(stepsData);

  res.json({ id: project.id, name });
});

app.delete('/api/projects/:id', auth, async (req, res) => {
  await supabase.from('project_steps').delete().eq('project_id', parseInt(req.params.id));
  await supabase.from('projects').delete().eq('id', parseInt(req.params.id));
  res.json({ success: true });
});

// ===== Steps =====
app.get('/api/projects/:id/steps', auth, async (req, res) => {
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', parseInt(req.params.id))
    .single();
  if (!project) return res.status(404).json({ error: '项目不存在' });

  const { data: steps } = await supabase
    .from('project_steps')
    .select('*')
    .eq('project_id', parseInt(req.params.id))
    .order('step_index');
  const parsed = steps?.map(s => ({ ...s, data: typeof s.data === 'string' ? JSON.parse(s.data) : s.data })) || [];
  res.json({ project, steps: parsed });
});

app.put('/api/projects/:id/steps/:stepIndex', auth, async (req, res) => {
  const { status, data } = req.body;

  const { data: existing } = await supabase
    .from('project_steps')
    .select('data')
    .eq('project_id', parseInt(req.params.id))
    .eq('step_index', parseInt(req.params.stepIndex))
    .single();
  if (!existing) return res.status(404).json({ error: '步骤不存在' });

  const existingData = typeof existing.data === 'string' ? JSON.parse(existing.data) : existing.data;
  if (data) Object.assign(existingData, data);
  const newData = JSON.stringify(existingData);

  const updateObj = { data: newData, updated_at: new Date().toLocaleString('zh-CN', { hour12: false }) };
  if (status) updateObj.status = status;

  await supabase
    .from('project_steps')
    .update(updateObj)
    .eq('project_id', parseInt(req.params.id))
    .eq('step_index', parseInt(req.params.stepIndex));

  await supabase
    .from('projects')
    .update({ updated_at: new Date().toLocaleString('zh-CN', { hour12: false }) })
    .eq('id', parseInt(req.params.id));

  const { data: updated } = await supabase
    .from('project_steps')
    .select('*')
    .eq('project_id', parseInt(req.params.id))
    .eq('step_index', parseInt(req.params.stepIndex))
    .single();
  if (updated) updated.data = JSON.parse(updated.data);
  res.json(updated);
});

app.get('/api/projects/:id/steps/:stepIndex', auth, async (req, res) => {
  const { data: step } = await supabase
    .from('project_steps')
    .select('*')
    .eq('project_id', parseInt(req.params.id))
    .eq('step_index', parseInt(req.params.stepIndex))
    .single();
  if (!step) return res.status(404).json({ error: '步骤不存在' });
  step.data = typeof step.data === 'string' ? JSON.parse(step.data) : step.data;
  res.json(step);
});

// ===== File Upload =====
app.post('/api/upload', auth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请选择文件' });
  const ext = req.file.originalname.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { data, error } = await supabase.storage
    .from('uploads')
    .upload(fileName, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false
    });
  if (error) return res.status(500).json({ error: error.message });

  const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(fileName);
  res.json({ filename: fileName, originalname: req.file.originalname, url: urlData.publicUrl });
});

export default app;
