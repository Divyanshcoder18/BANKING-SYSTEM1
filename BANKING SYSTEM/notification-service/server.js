require('dotenv').config();
const { connectRabbitMQ } = require('./src/utils/consumer.js');

/**
 * THE POWER SWITCH (server.js)
 * This turns on the Notification Service and starts the "Ear" (RabbitMQ Consumer).
 */

console.log("🚀 Notification Service is starting up...");

// Start listening for messages
connectRabbitMQ()
    .then(() => {
        console.log("✅ Successfully connected to RabbitMQ");
        console.log("📢 Waiting for 'transaction-events' to process emails...");
    })
    .catch((err) => {
        console.error("❌ Critical Error: Could not start Notification Service", err);
        process.exit(1);
    });

// Keep the process running in the background
process.stdin.resume();
