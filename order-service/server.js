const express = require('express');
const amqp = require('amqplib');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(express.json());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use(limiter);

const PORT = 3000;
const RABBITMQ_URL = process.env.RABBITMQ_URL;
let channel;

async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertQueue('order_queue', { durable: true });
    console.log('✅ Terhubung ke RabbitMQ');
  } catch (error) {
    console.error('❌ Gagal terhubung ke RabbitMQ', error);
    setTimeout(connectRabbitMQ, 5000);
  }
}

app.post('/orders', (req, res) => {
  const orderData = req.body;
  
  // DIUBAH: Validasi sekarang menggunakan 'sku', bukan 'productId'
  if (!orderData.sku || !orderData.quantity) {
    return res.status(400).json({ message: 'Data order tidak lengkap. Pastikan ada "sku" dan "quantity".' });
  }
  
  try {
    const orderPayload = Buffer.from(JSON.stringify(orderData));
    channel.sendToQueue('order_queue', orderPayload, { persistent: true });
    console.log(`📦 Pesan order dikirim: ${JSON.stringify(orderData)}`);
    res.status(202).json({ message: 'Order diterima dan sedang diproses' });
  } catch (error) {
    console.error('❌ Gagal mengirim pesan order', error);
    res.status(500).json({ message: 'Gagal memproses order' });
  }
});

app.listen(PORT, () => {
  console.log(`🛒 Order Service berjalan di port ${PORT}`);
  connectRabbitMQ();
});