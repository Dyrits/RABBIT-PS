import amqp, { Message } from "amqplib/callback_api";
import { MessageProperties } from "amqplib/properties.js";

export class Channel {
  channel: amqp.Channel;
  private static connection: amqp.Connection;

  static connect(connection: amqp.Connection): void {
    Channel.connection = connection;
  }

  static async create(): Promise<Channel> {
    try {
      const instance = new Channel();

      // Create the channel with a Promise wrapper for better error handling
      instance.channel = await new Promise<amqp.Channel>((resolve, reject) => {
        Channel.connection.createChannel((error: Error, channel: amqp.Channel) => {
          if (error) {
            reject(new Error(`Failed to create channel: ${error.message}`));
            return;
          }

          // Set up channel error handler:
          channel.on('error', (error: Error) => {
            console.error(`Channel error: ${error.message}`);
          });

          // Set up channel close handler:
          channel.on('close', () => {
            console.info('The channel was closed.');
          });

          resolve(channel);
        });
      });

      return instance;
    } catch (error: any) {
      console.error(`Error creating channel: ${error.message}`);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.channel) {
      try {
        await this.channel.close();
        console.info('Channel closed successfully');
      } catch (error: any) {
        console.error(`Error closing channel: ${error.message}`);
      } finally {
        this.channel = null;
      }
    }
  }

  publish(
    queue: string, 
    message: any, 
    properties: MessageProperties,
    retries: number = 5, 
    backoff: number = 500
  ): void {
      try {
        const attempt = (retry: number): void => {
          try {
            this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), properties, (error: Error) => {
              if (error) {
                if (retry > 0) {
                  console.error(`Failed to send message to queue ${queue}. Retrying... ${retry} retries left.`);
                  setTimeout(() => attempt(retry - 1), backoff + 250);
                } else {
                  throw new Error(`Failed to send message to queue ${queue} after ${retries} retries.`);
                }
              } else {
                console.info(`Successfully published message to queue ${queue}`);
              }
            });
          } catch (error: any) {
            if (retry > 0) {
              console.error(`Error in sendToQueue: ${error.message}. Retrying... ${retry} retries left.`);
              setTimeout(() => attempt(retry - 1), backoff + 250);
            } else {
              throw new Error(`Failed to send message to queue ${queue} after ${retries} retries: ${error.message}`);
            }
          }
        };

        attempt(retries);
      } catch (error: any) {
        throw new Error(`Unexpected error in publish: ${error.message}`);
      }
  }

  listen(
    queue: string, 
    uuid: string, 
    callback: (data: any) => void
  ): void {
    try {
      this.channel.consume(queue, (message: Message) => {
        try {
          if (!message) {
            console.warn('An empty message was received.');
            return;
          }

          console.info(`Received message from queue ${queue}`);

          // Check if the message has the expected properties
          if (!message.properties || !message.properties.correlationId) {
            console.warn('Received message without the expected UUID');
            return;
          }

          console.info(`Message uuid: ${message.properties.correlationId}`);

          if (message.properties.correlationId === uuid) {
            try {
              const data = JSON.parse(message.content.toString());
              console.info('Successfully parsed message content');
              callback(data);
            } catch (error: any) {
              console.error(`Error parsing message content: ${error.message}`);
              callback({ error: 'Invalid message format' });
            } finally {
              this.close();
            }
          } else {
            console.info('Message UUID does not match expected UUID. The message will be ignored.');
          }
        } catch (error: any) {
          console.error(`Error processing message: ${error.message}`);
        }
      }, { noAck: true });

      console.info(`Successfully set up consumer for queue ${queue}.`);
    } catch (error: any) {
      console.error(`Error setting up consumer: ${error.message}`);
      throw error;
    }
  }
}
