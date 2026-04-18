const amqp = require('amqplib');
const { sendTransactionAlert } = require('../services/email.service.js');

async function connectRabbitMQ() {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL);
        const channel = await connection.createChannel();

        // 🏥 1. SET UP THE HOSPITAL (DLX)
        const dlxExchange = "notification-dlx";
        await channel.assertExchange(dlxExchange, "fanout", { durable: false });

        const dlqName = "notification-dead-letter-queue";
        await channel.assertQueue(dlqName, { durable: false });

        await channel.bindQueue(dlqName, dlxExchange, "");

        // 📢 2. SET UP THE MAIN TRAFFIC
        const exchange = "transaction-events";
        await channel.assertExchange(exchange, "fanout", { durable: false });

        // NOTE: We add the 'x-dead-letter-exchange' argument here.
        // If this crashes, you may need to delete the old 'notification_queue' from RabbitMQ first.
        const q = await channel.assertQueue("notification_queue", {
            durable: false,
            arguments: {
                "x-dead-letter-exchange": dlxExchange 
            }
        });

        console.log("📢 Notification Service watching queue:", q.queue);
        await channel.bindQueue(q.queue, exchange, "");

        // 🛠️ 3. THE SMART CONSUMER LOGIC
        channel.consume(q.queue, async (msg) => {
            if (msg.content) {
                // Get retry count from headers 
                let retryCount = msg.properties.headers['x-retry-count'] || 0;

                try {
                    const data = JSON.parse(msg.content.toString());
                    console.log(`📩 [Attempt ${retryCount + 1}] Sending email for:`, data.email);

                    await sendTransactionAlert(data.email, data.amount, data.type);
                    
                    channel.ack(msg); // SUCCESS!
                } catch (error) {
                    if (retryCount < 3) {
                        // STRIKE 1 or 2: Stamp the passport and try again
                        console.warn(`⚠️ Attempt ${retryCount + 1} failed. Retrying...`);
                        
                        retryCount++;
                        
                        channel.publish(exchange, "", msg.content, {
                            headers: { 'x-retry-count': retryCount }
                        });

                        channel.ack(msg); 
                    } else {
                        // STRIKE 3: Send to the Hospital (DLQ)
                        console.error("❌ 3 Attempts failed. Moving to Dead Letter Queue (DLQ).");
                        
                        // Reject with requeue: false to trigger transition to DLX
                        channel.nack(msg, false, false); 
                    }
                }
            }
        });

    } catch (error) {
        console.error("❌ RabbitMQ Error:", error);
    }
}

module.exports = { connectRabbitMQ };

