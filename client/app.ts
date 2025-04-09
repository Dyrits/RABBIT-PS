// No need for RabbitMQ imports as we're using HTTP
// Use environment variables for server details with fallbacks
const SERVER_HOST = process.env.SERVER_HOST || 'localhost';
const SERVER_PORT = process.env.SERVER_PORT || 8080;

const url = `http://${SERVER_HOST}:${SERVER_PORT}`;

console.info(`Connecting to server at ${url}`);

// Function to send HTTP request and handle response
async function sendHttpRequest() {
  try {
    // Sample data to send
    const transaction = {
      id: "TX" + Date.now(),
      amount: Math.round(Math.random() * 100),
      currency: "EUR",
      timestamp: new Date().toISOString()
    };

    console.info('Sending HTTP request to server...');
    console.info('Sample data:', JSON.stringify(transaction, null, 2));

    // Set up a timeout for the fetch request
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5 * 60 * 1000);

    // Send POST request to server
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transaction),
      signal: controller.signal
    });

    // Clear the timeout
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }

    // Parse and display the response
    const data = await response.json();
    console.info('Response received:', JSON.stringify(data, null, 2));
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('Request timed out after 5 minutes');
    } else {
      console.error(`Error: ${error.message}`);
    }
  }
}

// Execute the function
setInterval(sendHttpRequest, 2500);