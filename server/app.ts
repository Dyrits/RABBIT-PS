import express from 'express';
import amqp from "amqplib/callback_api";
import logger from 'morgan';
import crypto from 'crypto';
import { Channel } from './Channel';
import { connect } from './connection';

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));


app.post('/', async (request, response) => {
  try {
    const uuid = crypto.randomUUID();
    const data = request.body;
    const delay = 5 * 60 * 1000;

    const channel = await Channel.create();

    const reply = await new Promise((resolve, reject) => {
      channel.channel.assertQueue('', { exclusive: true }, (error: Error, queue: amqp.Replies.AssertQueue) => {
        if (error) {
          console.error(`Failed to assert queue: ${error.message}`);
          response.status(500).json({ error: `Failed to assert queue: ${error.message}` });
          reject(error);
        }
        resolve(queue.queue);
      });
    })

    const timeout = setTimeout(() => {
      channel.close();
      response.status(504).json({ error: "The server took too long to respond." });
    }, delay);

    // Set up the consumer first to ensure we're ready to receive the response
    channel.listen(reply, uuid, (data: object) => {
      clearTimeout(timeout); // Clear the timeout when we get a response
      if (!data) {
        console.warn('An empty message was received.');
      }
      response.json(data);
    });

    // Then publish the message with the uuid:
    channel.publish("transaction", data, {
      correlationId: uuid,
      replyTo: reply
    });

    console.info(`Message with uuid ${uuid} sent to queue.`);
  } catch (error: any) {
    console.error(error.message);
    response.status(500).json({ error: `An error occurred while sending the transaction.` });
  }
});


// Start the server with proper error handling
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.info(`Server listening on port ${PORT}.`);
  connect(5, Channel.connect);
});
