# RABBIT-PS

## About The Project

A RabbitMQ publish/subscribe demo in TypeScript, orchestrated with Docker Compose. It runs three Node.js services alongside a RabbitMQ broker:

- `server`: an Express API that publishes messages to RabbitMQ (amqplib).
- `consumer`: an Express service that consumes messages from RabbitMQ.
- `client`: a small script that calls the server.

### Built With

- TypeScript / Node.js (tsx)
- Express 5
- RabbitMQ (amqplib, rabbitmq:3-management image)
- Docker Compose

## Getting Started

### Prerequisites

- Docker and Docker Compose

### Running

```sh
make local-watch
```

This runs `docker compose up --build`, starting the RabbitMQ broker (management UI on port 15672), the server (port 8080), the consumer (port 8081), and the client.

## License

No license file is present in this repository.

## Contact

Dyrits - https://github.com/Dyrits
