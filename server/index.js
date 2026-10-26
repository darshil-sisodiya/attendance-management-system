import express from 'express';
import jwt from 'jsonwebtoken';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { db, hashPassword, verifyPassword } from './db.js';
import { TARGET, percent, classesNeeded, classesCanSkip } from './attendance.js';

const SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';
const PORT = process.env.PORT || 5000;
const app = express();
app.use(express.json());

const auth = (role) => (req, res, next) => {
  try {
    req.user = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), SECRET);
  } catch {
    return res.status(401).json({ error: 'Please log in' });
  }
  if (role && req.user.role !== role) return res.status(403).json({ error: 'Not allowed' });
  next();
};
const faculty = auth('faculty');

// Per (student, subject) attendance counts, the base for every report.
const statsQuery = db.prepare(`
  SELECT u.id AS studentId, u.name, u.usn, s.id AS subjectId, s.code, s.name AS subject,
         COUNT(a.id) AS held, COALESCE(SUM(a.status = 'P'), 0) AS attended
  FROM users u CROSS JOIN subjects s
  LEFT JOIN attendance a ON a.student_id = u.id AND a.subject_id = s.id
  WHERE u.role = 'student' AND (? IS NULL OR u.id = ?)
  GROUP BY u.id, s.id ORDER BY u.usn, s.code`);

const withMetrics = (r) => ({
  ...r,
  percent: percent(r.attended, r.held),
  needed: classesNeeded(r.attended, r.held),
  canSkip: classesCanSkip(r.attended, r.held),
});

app.post('/api/login', (req, res) => {
  const { username = '', password = '' } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim().toLowerCase());
  if (!user || !verifyPassword(password, user.password_hash))
    return res.status(401).json({ error: 'Invalid username or password' });
  const profile = { id: user.id, name: user.name, role: user.role, usn: user.usn };
  res.json({ token: jwt.sign(profile, SECRET, { expiresIn: '8h' }), user: profile });
});

app.get('/api/subjects', auth(), (req, res) => {
  res.json(db.prepare('SELECT * FROM subjects ORDER BY code').all());
});

app.post('/api/subjects', faculty, (req, res) => {
  const { code, name } = req.body;
  if (!code?.trim() || !name?.trim()) return res.status(400).json({ error: 'Code and name are required' });
  try {
    const { lastInsertRowid } = db.prepare('INSERT INTO subjects (code, name) VALUES (?, ?)').run(code.trim().toUpperCase(), name.trim());
    res.status(201).json({ id: Number(lastInsertRowid) });
  } catch {
    res.status(409).json({ error: 'Subject code already exists' });
  }
});

app.get('/api/students', faculty, (req, res) => {
  const rows = statsQuery.all(null, null);
  const byStudent = new Map();
  for (const r of rows) {
    const s = byStudent.get(r.studentId) || { id: r.studentId, name: r.name, usn: r.usn, held: 0, attended: 0, shortage: 0 };
    s.held += r.held;
    s.attended += r.attended;
    if (r.held && percent(r.attended, r.held) < TARGET) s.shortage++;
    byStudent.set(r.studentId, s);
  }
  res.json([...byStudent.values()].map((s) => ({ ...s, percent: percent(s.attended, s.held) })));
});

app.post('/api/students', faculty, (req, res) => {
  const { name, usn } = req.body;
  if (!name?.trim() || !/^[0-9A-Z]{10}$/i.test(usn || '')) return res.status(400).json({ error: 'Name and a 10-character USN are required' });
  const id = usn.toUpperCase();
  try {
    // Default password is the USN in lowercase; the student logs in with it.
    const { lastInsertRowid } = db.prepare("INSERT INTO users (name, username, password_hash, role, usn) VALUES (?, ?, ?, 'student', ?)")
      .run(name.trim(), id.toLowerCase(), hashPassword(id.toLowerCase()), id);
    res.status(201).json({ id: Number(lastInsertRowid) });
  } catch {
    res.status(409).json({ error: 'USN already registered' });
  }
});

app.delete('/api/students/:id', faculty, (req, res) => {
  db.prepare("DELETE FROM users WHERE id = ? AND role = 'student'").run(req.params.id);
  res.status(204).end();
});

// Class roster for one subject on one date, with any status already marked.
app.get('/api/attendance', faculty, (req, res) => {
  const { subjectId, date } = req.query;
  res.json(db.prepare(`
    SELECT u.id, u.name, u.usn, a.status FROM users u
    LEFT JOIN attendance a ON a.student_id = u.id AND a.subject_id = ? AND a.date = ?
    WHERE u.role = 'student' ORDER BY u.usn`).all(subjectId, date));
});

app.post('/api/attendance', faculty, (req, res) => {
  const { subjectId, date, records } = req.body;
  if (!subjectId || !/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !Array.isArray(records))
    return res.status(400).json({ error: 'subjectId, date (YYYY-MM-DD) and records are required' });
  if (date > new Date().toLocaleDateString('en-CA')) return res.status(400).json({ error: 'Cannot mark attendance for a future date' });
  const upsert = db.prepare(`INSERT INTO attendance (subject_id, student_id, date, status) VALUES (?, ?, ?, ?)
    ON CONFLICT (subject_id, student_id, date) DO UPDATE SET status = excluded.status`);
  db.exec('BEGIN');
  try {
    for (const r of records) upsert.run(subjectId, r.studentId, date, r.status === 'P' ? 'P' : 'A');
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    return res.status(400).json({ error: e.message });
  }
  res.json({ saved: records.length, present: records.filter((r) => r.status === 'P').length });
});

app.get('/api/summary', faculty, (req, res) => {
  const rows = statsQuery.all(null, null).map(withMetrics);
  const subjects = db.prepare(`
    SELECT s.code, s.name, COUNT(DISTINCT a.date) AS classes,
           ROUND(100.0 * SUM(a.status = 'P') / COUNT(a.id), 1) AS percent
    FROM subjects s LEFT JOIN attendance a ON a.subject_id = s.id
    GROUP BY s.id ORDER BY s.code`).all();
  const trend = db.prepare(`
    SELECT date, ROUND(100.0 * SUM(status = 'P') / COUNT(*), 1) AS percent
    FROM attendance GROUP BY date ORDER BY date`).all();
  const totals = db.prepare(`
    SELECT (SELECT COUNT(*) FROM users WHERE role = 'student') AS students,
           (SELECT COUNT(*) FROM subjects) AS subjects,
           (SELECT COUNT(*) FROM (SELECT DISTINCT subject_id, date FROM attendance)) AS classes,
           ROUND(100.0 * SUM(status = 'P') / COUNT(*), 1) AS percent FROM attendance`).get();
  const shortage = rows.filter((r) => r.held && r.percent < TARGET).sort((a, b) => a.percent - b.percent);
  res.json({ target: TARGET, totals, subjects, trend, shortage });
});

app.get('/api/me', auth('student'), (req, res) => {
  res.json({ target: TARGET, subjects: statsQuery.all(req.user.id, req.user.id).map(withMetrics) });
});

app.get('/api/export.csv', faculty, (req, res) => {
  const quote = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = statsQuery.all(null, null).map(withMetrics)
    .map((r) => [r.usn, r.name, r.code, r.subject, r.held, r.attended, r.percent ?? '', r.percent < TARGET ? 'SHORTAGE' : 'OK'].map(quote).join(','));
  res.type('text/csv').attachment('attendance-report.csv')
    .send(['USN,Name,Subject Code,Subject,Classes Held,Attended,Percent,Status', ...lines].join('\n'));
});

// Serve the built React app in production (client/dist).
const dist = fileURLToPath(new URL('../client/dist', import.meta.url));
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (req, res) => res.sendFile('index.html', { root: dist }));
}

app.listen(PORT, () => console.log(`Attendance API running on http://localhost:${PORT}`));
