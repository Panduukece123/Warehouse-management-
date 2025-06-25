const amqp = require('amqplib');
const RABBITMQ_URL = process.env.RABBITMQ_URL;

async function startWorker() {
  console.log('🚚 Delivery Service (worker) mulai berjalan...');
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    await channel.assertQueue('order_queue', { durable: true });
    console.log('✅ Terhubung ke RabbitMQ, menunggu pesan di order_queue...');

    channel.consume('order_queue', (msg) => {
      if (msg !== null) {
        const order = JSON.parse(msg.content.toString());
        console.log(`🚚 Menerima order untuk diproses: ProductID=${order.productId}, Quantity=${order.quantity}`);
        channel.ack(msg);
      }
    }, { noAck: false });
  } catch (error) {
    console.error('❌ Gagal terhubung/memproses pesan dari RabbitMQ', error);
    setTimeout(startWorker, 5000);
  }
}
startWorker();
