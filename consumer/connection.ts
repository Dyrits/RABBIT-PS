import amqp from "amqplib/callback_api";

// Use environment variables for connection details with fallbacks
const RABBITMQ_HOST = process.env.RABBITMQ_HOST || 'localhost';
const RABBITMQ_PORT = process.env.RABBITMQ_PORT || 5672;
const RABBITMQ_USER = process.env.RABBITMQ_USER || 'hipay-user';
const RABBITMQ_PASS = process.env.RABBITMQ_PASS || 'hipay-password';

const url = `amqp://${RABBITMQ_USER}:${RABBITMQ_PASS}@${RABBITMQ_HOST}:${RABBITMQ_PORT}`;

/**
 * Connect to RabbitMQ with retry logic
 * @param retries Number of retries before giving up
 * @param callback Callback function to be called after the connection is established
 */
export function connect(retries: number, callback: (connection: amqp.Connection) => void) {
  if (!retries) {
    console.error('Max retries reached. Exiting...');
    process.exit(1);
  }

  console.info(`Connecting to RabbitMQ at ${RABBITMQ_HOST}:${RABBITMQ_PORT}`);

  amqp.connect(url, (error: Error, connection: amqp.Connection) => {
    if (error) {
      console.error(`Failed to connect to RabbitMQ: ${error.message}`);
      setTimeout(() => {
        console.info(`Retrying connection... (${retries - 1} retries left.)`);
        connect(retries - 1, callback);
      }, 2500);
    } else {
      // Set up connection error handler:
      connection.on('error', (error: Error) => {
        console.error(`RabbitMQ connection error: ${error.message}`);
        setTimeout(() => {
          console.info(`Retrying connection...`);
          connect(5, callback);
        }, 1000);
      });

      callback(connection);
    }
  });
}
