const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const app = express();
app.use(express.json());


const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 100, // Maksimal 100 permintaan per IP
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET;

const users = [
  { id: 1, username: 'retail-staff', password: 'password123', role: 'staff' },
  { id: 2, username: 'admin', password: 'adminpassword', role: 'admin' },
];

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ message: 'Username atau password salah' });
  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ message: 'Login berhasil', token });
});

app.listen(PORT, () => console.log(`🔑 Auth Service berjalan di port ${PORT}`));
