const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
app.use(express.static('public'));


const db = mysql.createConnection({
  host: 'localhost',
  user: 'todo_user',
  password: 'todo_pass',
  database: 'tododb'
});

db.connect(err => {
  if (err) throw err;
  console.log('✅ Подключено к MariaDB');
});

app.use(cors());
app.use(bodyParser.json());
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: false
}));

// Регистрация
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);
  const sql = 'INSERT INTO users (username, password) VALUES (?, ?)';
  db.query(sql, [username, hashedPassword], (err, result) => {
    if (err) return res.status(400).json({ message: 'Пользователь уже существует' });
    req.session.userId = result.insertId;
    res.json({ message: 'Регистрация успешна' });
  });
});

// Вход
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const sql = 'SELECT * FROM users WHERE username = ?';
  db.query(sql, [username], (err, results) => {
    const user = results[0];
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ message: 'Неверные данные' });
    }
    req.session.userId = user.id;
    res.json({ message: 'Вход успешен' });
  });
});

// Проверка входа
app.get('/me', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: 'Не авторизован' });
  db.query('SELECT id, username FROM users WHERE id = ?', [req.session.userId], (err, results) => {
    res.json(results[0]);
  });
});

// Выход
app.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ message: 'Выход выполнен' }));
});

app.listen(3000, () => {
  console.log('🚀 Сервер запущен на http://localhost:3000');
});
