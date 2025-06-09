const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(session({
  secret: 'secret_key',
  resave: false,
  saveUninitialized: false
}));

const dbConfig = {
  host: 'localhost',
  user: 'todo_user',
  password: 'todo_pass',
  database: 'tododb'
};

// 🔐 Регистрация
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);

  try {
    const conn = await mysql.createConnection(dbConfig);
    await conn.execute('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashed]);
    const [user] = await conn.execute('SELECT * FROM users WHERE username = ?', [username]);
    req.session.userId = user[0].id;
    res.json({ message: 'Registration successful' });
    await conn.end();
  } catch (err) {
    res.status(400).json({ message: 'User already exists' });
  }
});

// 🔐 Авторизация
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const conn = await mysql.createConnection(dbConfig);
  const [rows] = await conn.execute('SELECT * FROM users WHERE username = ?', [username]);

  if (rows.length === 0 || !await bcrypt.compare(password, rows[0].password)) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  req.session.userId = rows[0].id;
  res.json({ message: 'Login successful' });
  await conn.end();
});

// ✅ Получить список задач
app.get('/tasks', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: 'Unauthorized' });

  const conn = await mysql.createConnection(dbConfig);
  const [tasks] = await conn.execute('SELECT id, title, completed FROM tasks WHERE user_id = ?', [req.session.userId]);
  res.json(tasks);
  await conn.end();
});

app.get('/me', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: 'Not logged in' });
  res.json({ id: req.session.userId });
});


// ➕ Добавить задачу
app.post('/add', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: 'Unauthorized' });

  console.log('Добавление задачи:', req.body, 'Пользователь:', req.session.userId);
  
  const { text } = req.body;
  const conn = await mysql.createConnection(dbConfig);
  await conn.execute('INSERT INTO tasks (title, user_id) VALUES (?, ?)', [text, req.session.userId]);
  res.json({ message: 'Task added' });
  await conn.end();
});

// ❌ Удалить задачу
app.delete('/delete', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: 'Unauthorized' });

  const { id } = req.body;
  const conn = await mysql.createConnection(dbConfig);
  await conn.execute('DELETE FROM tasks WHERE id = ? AND user_id = ?', [id, req.session.userId]);
  res.json({ message: 'Task deleted' });
  await conn.end();
});

// ✏️ Обновить задачу
app.put('/update', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: 'Unauthorized' });

  const { id, newText } = req.body;
  const conn = await mysql.createConnection(dbConfig);
  await conn.execute('UPDATE tasks SET title = ? WHERE id = ? AND user_id = ?', [newText, id, req.session.userId]);
  res.json({ message: 'Task updated' });
  await conn.end();
});

app.listen(3000, () => {
  console.log('🚀 Server running at http://localhost:3000');
});
