import express from 'express';
import amqp from "amqplib/callback_api";
import logger from 'morgan';
import { connect } from './connection';

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

/**
 * Set up a consumer for the transaction queue
 */
function consume(connection: amqp.Connection) {

  if (!connection) {
    console.error('No RabbitMQ connection available. Make sure to connect first.');
    return;
  }

  // Create a channel to consume messages
  connection.createChannel(async (error: Error, channel: amqp.Channel) => {
    if (error) {
      console.error(`Failed to create channel: ${error.message}`);
      process.exit(1);
    }

    const queue = "transaction";

    // Ensure the queue exists
    channel.assertQueue(queue, {
      durable: false
    });

    console.info(`Waiting for messages in queue: ${queue}`);

    // Consume messages from the queue
    channel.consume(queue, (message) => {
      if (!message) {
        console.warn('Received null message');
        return;
      }

      try {
        const content = JSON.parse(message.content.toString());
        const reply = message.properties.replyTo;
        const uuid = message.properties.correlationId;

        console.info(`Received message: ${JSON.stringify(content)}`);
        console.info(`Reply queue: ${reply}, UUID: ${uuid}`);

        // Wait 3 seconds before responding
        setTimeout(() => {
          // Add success status to the data
          const responseData = {
            ...content,
            status: 'success'
          };

          // Send the response back to the reply queue
          if (reply && uuid) {
            channel.sendToQueue(
              reply,
              Buffer.from(JSON.stringify(responseData)),
              {
                correlationId: uuid
              }
            );
            console.info(`Response sent to queue: ${reply}`);
          } else {
            console.warn('Cannot reply: missing queue or uuid in message properties');
          }
        }, 3000); // Wait 3 seconds

      } catch (error: any) {
        console.error(`Error processing message: ${error.message}`);
      }

      // Acknowledge the message
      channel.ack(message);
    });
  });
}

// Start the server with proper error handling
const PORT = process.env.CONSUMER_PORT || 8085;

app.listen(PORT, () => {
  console.info(`Consumer server listening on port ${PORT}.`);
  connect(5, consume);
});
