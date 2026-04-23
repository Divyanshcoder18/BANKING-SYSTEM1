const amqp = require('amqplib');
const { sendTransactionEmail } = require('../services/email.services.js');

const queue = 'transaction-events';

async function connectRabbitMQ() {
    let retries = 5;
    while (retries) {
        try {
            console.log(`[NOTIFY] Attempting to connect... (Retries left: ${retries})`);
            const connection = await amqp.connect(process.env.RABBITMQ_URI || 'amqp://localhost');
            const channel = await connection.createChannel();
            await channel.assertQueue(queue, { durable: true });

            console.log("✅ [NOTIFY] Connected successfully");

            channel.consume(queue, async (msg) => {
                if (msg !== null) {
                    try {
                        const data = JSON.parse(msg.content.toString());
                        await sendTransactionEmail(data.type, data);
                        channel.ack(msg);
                    } catch (err) {
                        console.error("[NOTIFY] Error processing message:", err.message);
                        channel.ack(msg);
                    }
                }
            });
            return;
        } catch (error) {
            retries -= 1;
            console.log(`⚠️ [NOTIFY] Connection failed. Retrying in 5 seconds...`);
            if (retries === 0) {
                console.error("❌ [NOTIFY] Critical: Could not connect to RabbitMQ broker.");
                throw error;
            }
            await new Promise(res => setTimeout(res, 5000));
        }
    }
}

module.exports = { connectRabbitMQ };
