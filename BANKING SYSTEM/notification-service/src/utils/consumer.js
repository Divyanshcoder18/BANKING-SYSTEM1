const amqp = require('amqplib');
const { sendTransactionAlert } = require('../services/email.service.js');


async function connectRabbitMQ(){
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL);
        const channel = await connection.createChannel();

        const exchange = "transaction-events"  ; 
        await channel.assertExchange(exchange, "fanout", {durable: false});

        const q = await channel.assertQueue("notification_queue", {durable: false});
        console.log("Waiting for messages in queue: ", q.queue);

        await channel.bindQueue(q.queue, exchange, "");

        channel.consume(q.queue, async (msg) => {
            if(msg.content){
                const data = JSON.parse(msg.content.toString());
                console.log("Received event:", data);
                await sendTransactionAlert(data.email, data.amount, data.type);
                channel.ack(msg); 
            }
        });


        
    } catch (error) {
        console.error(" Rabbit MQ consume Error: ", error);
    }
}

module.exports = { connectRabbitMQ };