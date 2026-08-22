import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

interface UserRecord { id: string; email: string; name: string; password: string; }
interface ProfileRecord {
  fullName: string;
  email: string;
  goal: string;
  pace: string;
  subjects: string;
  preferences: string;
  strongSubjects: string[];
  weakSubjects: string[];
  availableToday: number;
  schoolHours: number;
  tuitionHours: number;
  socialUse: string;
  socialPlatforms: string[];
  hobbies: string[];
  style: string;
  dailyTime: number;
}
interface TaskRecord { id: string; text: string; completed: boolean; }
interface TargetRecord { id: string; title: string; time: string; note: string; done: boolean; }
interface StudyLogRecord { id: string; type: 'study' | 'wellness'; title: string; minutes: number; createdAt: string; }

const users = new Map<string, UserRecord>();
const tokens = new Map<string, string>();
const profiles = new Map<string, ProfileRecord>();
const tasks = new Map<string, TaskRecord[]>();
const targets = new Map<string, TargetRecord[]>();
const logs = new Map<string, StudyLogRecord[]>();

const DEFAULT_PROFILE: ProfileRecord = {
  fullName: '',
  email: '',
  goal: '',
  pace: '',
  subjects: '',
  preferences: '',
  strongSubjects: [],
  weakSubjects: [],
  availableToday: 3,
  schoolHours: 0,
  tuitionHours: 0,
  socialUse: '',
  socialPlatforms: [],
  hobbies: [],
  style: '',
  dailyTime: 4,
};

function getAuthToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) return null;
  return token;
}

function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = getAuthToken(req);
  if (!token) {
    return res.status(401).json({ message: 'Missing authentication token' });
  }
  const userId = tokens.get(token);
  if (!userId) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
  (req as any).userId = userId;
  next();
}

function ensureUserData(userId: string) {
  if (!profiles.has(userId)) {
    const user = users.get(userId);
    profiles.set(userId, { ...DEFAULT_PROFILE, email: user?.email || '' });
  }
  if (!tasks.has(userId)) {
    tasks.set(userId, [
      { id: randomUUID(), text: 'Review yesterday’s notes', completed: false },
      { id: randomUUID(), text: 'Plan today’s study blocks', completed: false },
    ]);
  }
  if (!targets.has(userId)) {
    targets.set(userId, [
      { id: randomUUID(), title: 'Morning revision session', time: '45 min', note: 'Go through quick concept checks', done: false },
      { id: randomUUID(), title: 'Midday wellness break', time: '20 min', note: 'Walk, hydrate, breathe', done: false },
    ]);
  }
  if (!logs.has(userId)) {
    logs.set(userId, [
      { id: randomUUID(), type: 'study', title: 'Initial onboarding read', minutes: 20, createdAt: new Date().toISOString() },
    ]);
  }
}

app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ message: 'Email, password, and name are required' });
  }
  const existing = Array.from(users.values()).find((user) => user.email === email.toLowerCase());
  if (existing) {
    return res.status(409).json({ message: 'Email is already registered' });
  }
  const userId = randomUUID();
  const user: UserRecord = { id: userId, email: email.toLowerCase(), name, password };
  users.set(userId, user);
  const token = randomUUID();
  tokens.set(token, userId);
  profiles.set(userId, { ...DEFAULT_PROFILE, email: user.email, fullName: name });
  tasks.set(userId, []);
  targets.set(userId, []);
  logs.set(userId, []);

  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  const user = Array.from(users.values()).find((u) => u.email === email.toLowerCase());
  if (!user || user.password !== password) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  const token = randomUUID();
  tokens.set(token, user.id);
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const userId = (req as any).userId as string;
  const user = users.get(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ id: user.id, email: user.email, name: user.name });
});

app.get('/api/profile', authMiddleware, (req, res) => {
  const userId = (req as any).userId as string;
  ensureUserData(userId);
  res.json(profiles.get(userId));
});

app.post('/api/profile', authMiddleware, (req, res) => {
  const userId = (req as any).userId as string;
  const profile = req.body as ProfileRecord;
  if (!profile) {
    return res.status(400).json({ message: 'Profile data is required' });
  }
  const current = profiles.get(userId) || { ...DEFAULT_PROFILE, email: users.get(userId)?.email || '' };
  profiles.set(userId, { ...current, ...profile, email: current.email });
  res.json({ success: true, profile: profiles.get(userId) });
});

app.get('/api/tasks', authMiddleware, (req, res) => {
  const userId = (req as any).userId as string;
  ensureUserData(userId);
  res.json(tasks.get(userId) || []);
});

app.post('/api/tasks', authMiddleware, (req, res) => {
  const userId = (req as any).userId as string;
  const { text } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ message: 'Task text is required' });
  }
  const newTask = { id: randomUUID(), text, completed: false };
  const list = tasks.get(userId) || [];
  list.push(newTask);
  tasks.set(userId, list);
  res.json(newTask);
});

app.put('/api/tasks/:id/toggle', authMiddleware, (req, res) => {
  const userId = (req as any).userId as string;
  const taskId = req.params.id;
  const list = tasks.get(userId) || [];
  const task = list.find((item) => item.id === taskId);
  if (!task) return res.status(404).json({ message: 'Task not found' });
  task.completed = !task.completed;
  res.json(task);
});

app.delete('/api/tasks/:id', authMiddleware, (req, res) => {
  const userId = (req as any).userId as string;
  const taskId = req.params.id;
  const list = tasks.get(userId) || [];
  const removed = list.find((item) => item.id === taskId);
  tasks.set(userId, list.filter((item) => item.id !== taskId));
  if (!removed) return res.status(404).json({ message: 'Task not found' });
  res.json({ success: true, removed });
});

app.get('/api/targets', authMiddleware, (req, res) => {
  const userId = (req as any).userId as string;
  ensureUserData(userId);
  res.json(targets.get(userId) || []);
});

app.put('/api/targets/:id/toggle', authMiddleware, (req, res) => {
  const userId = (req as any).userId as string;
  const targetId = req.params.id;
  const list = targets.get(userId) || [];
  const target = list.find((item) => item.id === targetId);
  if (!target) return res.status(404).json({ message: 'Target not found' });
  target.done = !target.done;
  res.json(target);
});

app.post('/api/targets/generate', authMiddleware, (req, res) => {
  const userId = (req as any).userId as string;
  const { subjects, availableHours } = req.body as { subjects: string[]; availableHours: number };
  const focusSubjects = Array.isArray(subjects) && subjects.length > 0 ? subjects : ['Study Session'];
  const hours = typeof availableHours === 'number' && availableHours > 0 ? availableHours : 3;
  const blockMinutes = Math.max(30, Math.round((hours * 60) / focusSubjects.length));
  const generated = focusSubjects.map((subject, index) => ({
    id: randomUUID(),
    title: `Study ${subject}`,
    time: `${blockMinutes} min`,
    note: `Deep practice and revision for ${subject}`,
    done: false,
  }));
  generated.push({
    id: randomUUID(),
    title: 'Restorative wellness break',
    time: '15 min',
    note: 'Walk, hydrate, and reset your focus',
    done: false,
  });
  targets.set(userId, generated);
  res.json(generated);
});

app.get('/api/logs', authMiddleware, (req, res) => {
  const userId = (req as any).userId as string;
  ensureUserData(userId);
  res.json(logs.get(userId) || []);
});

app.post('/api/logs', authMiddleware, (req, res) => {
  const userId = (req as any).userId as string;
  const { type, title, minutes } = req.body as { type: 'study' | 'wellness'; title: string; minutes: number };
  if (!type || !title || typeof minutes !== 'number') {
    return res.status(400).json({ message: 'Log type, title, and minutes are required' });
  }
  const newLog = { id: randomUUID(), type, title, minutes, createdAt: new Date().toISOString() };
  const list = logs.get(userId) || [];
  list.unshift(newLog);
  logs.set(userId, list);
  res.json(newLog);
});

app.post('/api/chat', authMiddleware, (req, res) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ message: 'Message is required' });
  }
  const normalized = message.toLowerCase();
  let reply = 'I’m ready to help you optimize your next study block. Share what you want to focus on today.';
  if (normalized.includes('focus') || normalized.includes('study')) {
    reply = 'Start by breaking your topic into 25-minute blocks. Alternate study bursts with short breath breaks, and revisit the hardest concept first.';
  } else if (normalized.includes('stress') || normalized.includes('anxiety')) {
    reply = 'If you feel overwhelmed, stop, breathe deeply for two minutes, and then choose one small task you can finish right now.';
  } else if (normalized.includes('schedule') || normalized.includes('routine')) {
    reply = 'Use a rhythm of work-rest cycles: 45 minutes of focused study followed by 15 minutes of wellness reset.';
  }
  res.json({ reply });
});

app.post('/api/quiz', authMiddleware, (req, res) => {
  const { subject, difficulty, numQuestions } = req.body as { subject: string; difficulty: string; numQuestions: number };
  const count = Number.isInteger(numQuestions) && numQuestions > 0 ? Math.min(numQuestions, 10) : 5;
  const diff = difficulty || 'medium';
  const topic = subject || 'General Studies';
  const baseOptions = ['Correct', 'Incorrect', 'Maybe', 'Depends'];
  const questions = Array.from({ length: count }, (_, index) => {
    const answerIndex = index % 4;
    const question = `Question ${index + 1}: What is an important idea to remember for ${topic}?`;
    return {
      question,
      options: [...baseOptions],
      answerIndex,
      explanation: `This is a synthetic ${diff} question about ${topic} designed for quick review. The right answer is option ${answerIndex + 1}.`,
    };
  });
  res.json({ questions });
});

app.post('/api/contact', (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ message: 'All contact fields are required' });
  }
  res.json({ success: true, message: 'Your message was received. We will respond soon.' });
});

app.use(express.static(path.join(__dirname, 'bb')));

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const port = process.env.PORT ? Number(process.env.PORT) : 4173;
app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
});
