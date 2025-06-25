const amqp = require('amqplib');
const axios = require('axios'); // BARU

const RABBITMQ_URL = process.env.RABBITMQ_URL;
const STOCK_SERVICE_URL = process.env.STOCK_SERVICE_URL; // BARU
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY; // BARU

async function startWorker() {
  console.log('🚚 Delivery Service (worker) mulai berjalan...');
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    await channel.assertQueue('order_queue', { durable: true });
    console.log('✅ Terhubung ke RabbitMQ, menunggu pesan di order_queue...');

    channel.consume('order_queue', async (msg) => { // DIUBAH: Menjadi async
      if (msg !== null) {
        const order = JSON.parse(msg.content.toString());
        console.log(`🚚 Menerima order untuk diproses: ProductSKU=${order.sku}, Quantity=${order.quantity}`);

        try {
          // BARU: Panggil stock-service untuk mengurangi stok
          await axios.post(`${STOCK_SERVICE_URL}/reduce`,
            {
              sku: order.sku,
              quantity: order.quantity
            },
            {
              headers: { 'x-internal-api-key': INTERNAL_API_KEY } // Header otentikasi internal
            }
          );
          console.log(`✅ Stok untuk SKU ${order.sku} berhasil dikurangi.`);
          channel.ack(msg); // Konfirmasi pesan setelah berhasil
        } catch (error) {
          // Jika gagal (misal stok tidak cukup, atau service mati)
          const errorMessage = error.response ? error.response.data.message : error.message;
          console.error(`❌ Gagal mengurangi stok untuk SKU ${order.sku}: ${errorMessage}`);
          // Di sini, kita bisa memilih untuk tidak ack (nack) agar pesan dicoba lagi nanti,
          // atau memindahkannya ke antrian "dead-letter" untuk diinspeksi manual.
          // Untuk sekarang, kita log error dan tetap ack agar antrian tidak stuck.
          channel.ack(msg); 
        }
      }
    }, { noAck: false });
  } catch (error) {
    console.error('❌ Gagal terhubung/memproses pesan dari RabbitMQ', error);
    setTimeout(startWorker, 5000);
  }
}

startWorker();
