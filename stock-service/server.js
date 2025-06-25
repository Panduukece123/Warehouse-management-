const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = express();

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URL = process.env.MONGO_URL;

app.use(express.json());

// Koneksi ke MongoDB
mongoose.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ Terhubung ke MongoDB'))
  .catch(err => console.error('❌ Gagal terhubung ke MongoDB', err));

// Skema produk dengan nama dan harga
const productSchema = new mongoose.Schema({
  sku: String,
  name: String,
  price: Number,
  quantity: Number
});

const Product = mongoose.model('Product', productSchema);

// Middleware JWT
function authMiddleware(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.sendStatus(401);
  try {
    req.user = jwt.verify(token.split(' ')[1], JWT_SECRET);
    next();
  } catch {
    return res.sendStatus(403);
  }
}

// Endpoint scan barcode: tambah quantity
app.post('/scan', authMiddleware, async (req, res) => {
  const { sku, name, price } = req.body;
  let product = await Product.findOne({ sku });

  if (!product) {
    product = new Product({ sku, name, price, quantity: 0 });
  }

  product.quantity += 1;

  // Update name & price jika ada perubahan
  if (name) product.name = name;
  if (price) product.price = price;

  await product.save();
  res.json({ message: 'Stock updated', product });
});

// Endpoint tampilkan semua produk
app.get('/products', authMiddleware, async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil data produk' });
  }
});

app.listen(PORT, () => console.log(`Stock service berjalan di port ${PORT}`));
