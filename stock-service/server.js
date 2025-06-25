const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit'); // BARU
const app = express();

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URL = process.env.MONGO_URL;
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY; // BARU

app.use(express.json());

// BARU: Konfigurasi rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

mongoose.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ Terhubung ke MongoDB'))
  .catch(err => console.error('❌ Gagal terhubung ke MongoDB', err));

const productSchema = new mongoose.Schema({
  sku: { type: String, required: true, unique: true },
  name: String,
  price: Number,
  quantity: { type: Number, default: 0 }
});
const Product = mongoose.model('Product', productSchema);

// Middleware otentikasi JWT untuk pengguna
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.sendStatus(401);
  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.sendStatus(403);
  }
}

// BARU: Middleware otentikasi untuk layanan internal
function internalAuthMiddleware(req, res, next) {
  const apiKey = req.headers['x-internal-api-key'];
  if (!apiKey || apiKey !== INTERNAL_API_KEY) {
    return res.status(403).json({ message: 'Forbidden: Invalid internal API key' });
  }
  next();
}

// === Endpoint Internal (dipanggil oleh service lain) ===

// BARU: Endpoint untuk mengurangi stok
app.post('/reduce', internalAuthMiddleware, async (req, res) => {
  const { sku, quantity } = req.body;
  if (!sku || !quantity) return res.status(400).json({ message: 'SKU dan quantity diperlukan' });

  const product = await Product.findOne({ sku });
  if (!product) return res.status(404).json({ message: 'Produk tidak ditemukan' });
  if (product.quantity < quantity) return res.status(400).json({ message: 'Stok tidak mencukupi' });

  product.quantity -= quantity;
  await product.save();
  res.json({ message: 'Stok berhasil dikurangi', product });
});


// === Endpoint Publik (CRUD untuk pengguna/staff) ===

// CREATE: Menambah produk baru
app.post('/products', authMiddleware, async (req, res) => {
  try {
    const { sku, name, price, quantity } = req.body;
    if (!sku || !name) return res.status(400).json({ message: 'SKU dan nama produk diperlukan' });
    const newProduct = new Product({ sku, name, price, quantity });
    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// READ: Menampilkan semua produk
app.get('/products', authMiddleware, async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil data produk' });
  }
});

// UPDATE: Mengubah data produk berdasarkan SKU
app.put('/products/:sku', authMiddleware, async (req, res) => {
  try {
    const { name, price, quantity } = req.body;
    const updatedProduct = await Product.findOneAndUpdate(
      { sku: req.params.sku },
      { name, price, quantity },
      { new: true, runValidators: true }
    );
    if (!updatedProduct) return res.status(404).json({ message: 'Produk tidak ditemukan' });
    res.json(updatedProduct);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE: Menghapus produk berdasarkan SKU
app.delete('/products/:sku', authMiddleware, async (req, res) => {
    try {
        const deletedProduct = await Product.findOneAndDelete({ sku: req.params.sku });
        if (!deletedProduct) return res.status(404).json({ message: 'Produk tidak ditemukan' });
        res.json({ message: 'Produk berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


app.listen(PORT, () => console.log(`📦 Stock service berjalan di port ${PORT}`));