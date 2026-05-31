import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import fs from 'fs';
import { initDb, getDb, saveDb } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'chanxueyan-key-2026';

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

// In production, serve frontend static files
const publicDir = join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('*', (req, res, next) => {
    if (!req.path.startsWith('/api/') && !req.path.startsWith('/uploads/')) {
      res.sendFile(join(publicDir, 'index.html'));
    } else {
      next();
    }
  });
  console.log('Serving frontend from', publicDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

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

function query(sql, params = []) {
  const db = getDb();
  const stmt = db.prepare(sql);
  if (sql.trim().toUpperCase().startsWith('SELECT') || sql.trim().toUpperCase().startsWith('WITH')) {
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  } else {
    stmt.run(params);
    stmt.free();
    saveDb();
    return { changes: db.getRowsModified(), lastInsertRowid: null };
  }
}

function run(sql, params = []) {
  const db = getDb();
  const stmt = db.prepare(sql);
  stmt.run(params);
  stmt.free();
  saveDb();
  return { changes: db.getRowsModified() };
}

function get(sql, params = []) {
  const rows = query(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// ===== Auth =====
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = get('SELECT id, username FROM users WHERE username = ? AND password = ?', [username, password]);
  if (!user) return res.status(400).json({ error: '账号或密码错误' });
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, username: user.username });
});

// ===== Projects =====
app.get('/api/projects', auth, (req, res) => {
  const projects = query('SELECT * FROM projects ORDER BY updated_at DESC');
  const result = projects.map(p => {
    const steps = query('SELECT step_index, status FROM project_steps WHERE project_id = ? ORDER BY step_index', [p.id]);
    const totalSteps = steps.length;
    const completedSteps = steps.filter(s => s.status === 'completed').length;
    const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
    return { ...p, steps, progress };
  });
  res.json(result);
});

app.post('/api/projects', auth, (req, res) => {
  const { name, total_amount } = req.body;
  if (!name) return res.status(400).json({ error: '项目名称不能为空' });
  run('INSERT INTO projects (name, total_amount) VALUES (?, ?)', [name, total_amount || 0]);

  const project = get('SELECT id FROM projects ORDER BY id DESC LIMIT 1');
  const projectId = project.id;

  const insertStep = getDb().prepare('INSERT INTO project_steps (project_id, step_index, status) VALUES (?, ?, ?)');
  for (let i = 0; i < 7; i++) {
    insertStep.run([projectId, i, 'pending']);
  }
  insertStep.free();
  saveDb();

  res.json({ id: projectId, name });
});

app.delete('/api/projects/:id', auth, (req, res) => {
  run('DELETE FROM project_steps WHERE project_id = ?', [parseInt(req.params.id)]);
  run('DELETE FROM projects WHERE id = ?', [parseInt(req.params.id)]);
  res.json({ success: true });
});

// ===== Steps =====
app.get('/api/projects/:id/steps', auth, (req, res) => {
  const project = get('SELECT * FROM projects WHERE id = ?', [parseInt(req.params.id)]);
  if (!project) return res.status(404).json({ error: '项目不存在' });
  const steps = query('SELECT * FROM project_steps WHERE project_id = ? ORDER BY step_index', [parseInt(req.params.id)]);
  res.json({ project, steps });
});

app.put('/api/projects/:id/steps/:stepIndex', auth, (req, res) => {
  const { status, data } = req.body;
  const step = get('SELECT * FROM project_steps WHERE project_id = ? AND step_index = ?', [parseInt(req.params.id), parseInt(req.params.stepIndex)]);
  if (!step) return res.status(404).json({ error: '步骤不存在' });

  const existing = JSON.parse(step.data || '{}');
  if (data) Object.assign(existing, data);
  const newData = JSON.stringify(existing);

  if (status) {
    run('UPDATE project_steps SET status = ?, data = ?, updated_at = datetime(\'now\',\'localtime\') WHERE project_id = ? AND step_index = ?',
      [status, newData, parseInt(req.params.id), parseInt(req.params.stepIndex)]);
  } else {
    run('UPDATE project_steps SET data = ?, updated_at = datetime(\'now\',\'localtime\') WHERE project_id = ? AND step_index = ?',
      [newData, parseInt(req.params.id), parseInt(req.params.stepIndex)]);
  }

  run('UPDATE projects SET updated_at = datetime(\'now\',\'localtime\') WHERE id = ?', [parseInt(req.params.id)]);

  const updated = get('SELECT * FROM project_steps WHERE project_id = ? AND step_index = ?', [parseInt(req.params.id), parseInt(req.params.stepIndex)]);
  if (updated) updated.data = JSON.parse(updated.data || '{}');
  res.json(updated);
});

app.get('/api/projects/:id/steps/:stepIndex', auth, (req, res) => {
  const step = get('SELECT * FROM project_steps WHERE project_id = ? AND step_index = ?', [parseInt(req.params.id), parseInt(req.params.stepIndex)]);
  if (!step) return res.status(404).json({ error: '步骤不存在' });
  step.data = JSON.parse(step.data || '{}');
  res.json(step);
});

// ===== File Upload =====
app.post('/api/upload', auth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请选择文件' });
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ filename: req.file.filename, originalname: req.file.originalname, url: fileUrl });
});

// Start server
async function start() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
  });
}

start();
