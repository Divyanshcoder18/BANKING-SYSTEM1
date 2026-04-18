const amqp = require('amqplib');

/**
 * THE PRODUCER (producer.js)
 * This is the "Voice" that shouts transaction events to everyone listening.
 */

async function publishTransactionEvent(data) {
    try {
        // 1. Connect to RabbitMQ
        const connection = await amqp.connect(process.env.RABBITMQ_URL);
        const channel = await connection.createChannel();

        // 2. Declare the Exchange (Must match the consumer!)
        const exchange = "transaction-events";
        
        // fanout = send to ALL queues bound to this exchange (broadcast)
        await channel.assertExchange(exchange, "fanout", { durable: false });

        // 3. Publish the message
        // We convert the data object to a JSON string, then to a Buffer
        channel.publish(
            exchange, 
            "", // Routing key (not used in fanout)
            Buffer.from(JSON.stringify(data))
        );

        console.log("📢 [Transaction Service] Event Published:", data);

        // 4. Close connection after a short delay (to ensure message is sent)
        setTimeout(() => {
            connection.close();
        }, 500);

    } catch (error) {
        console.error("❌ RabbitMQ Produce Error:", error);
    }
}

module.exports = { publishTransactionEvent };
