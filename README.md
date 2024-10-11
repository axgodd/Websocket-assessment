# WebSocket and RESTful API Server - Architecture Overview

## Part 1: Architecture Overview

WebSocket Server:

### Broadcasting messages: When a message is received from one client, the server broadcasts it to all other connected clients.

### Handling multiple connections: The server is capable of handling multiple clients at the same time by storing active WebSocket connections in memory and efficiently broadcasting messages to all connected clients.

Key Aspects:

WebSocket: The ws library is used to implement the WebSocket server, which listens for connections from clients. Each client is assigned a unique clientID, which is included in every message sent by that client. This allows the server to differentiate between clients and manage message ownership for features like deletion.
Message Broadcasting: When a message is received, it is sent to all clients currently connected to the WebSocket server, ensuring that every user gets real-time updates.
Error Handling: The server has error handling in place to log any issues with the WebSocket connection and handle client disconnections.

### RESTful API Server

Key Endpoints:

POST /resources: This endpoint allows the client to create a new message, which is then stored in memory and broadcast to all connected clients.
GET /resources: This endpoint retrieves all messages stored on the server. This is primarily used by the client to fetch the initial state of the chat when the page is first loaded.
DELETE /resources/: 
 This endpoint allows a client to delete a message, but only if the clientID of the sender matches the clientID of the requester.

## Part 2: Design Decisions, Libraries, and Frameworks

### Design Decisions

Separation of Concerns:
The WebSocket server handles real-time message updates, while the REST API manages the persistence and retrieval of messages. This separation ensures that real-time interactions are handled efficiently, and standard HTTP requests are processed asynchronously without interfering with WebSocket operations.
Scalability:
The WebSocket server can handle multiple clients efficiently using an in-memory store for connected clients and messages. For future scalability, a database (like MongoDB or Redis) could be integrated to persist messages across server restarts or horizontal scaling with load balancing.
Ownership and Security:
Each message is tagged with the clientID of the sender. This allows for proper authorization checks to ensure that only the sender of a message can delete it, preventing unauthorized modifications by other clients.
Error Handling:
The WebSocket server and REST API both include robust error handling mechanisms. For example, when a WebSocket connection is closed unexpectedly, it is gracefully handled by logging the event and cleaning up the connection.

### Libraries and Frameworks

Node.js:
Node.js is used as the runtime environment due to its non-blocking I/O and ability to handle concurrent connections efficiently, making it an ideal choice for both real-time WebSocket communication and RESTful API operations.

Express.js:
Express.js is used to build the RESTful API server. It provides a lightweight framework for handling HTTP requests and routing. Express middleware is used for JSON parsing, CORS handling, and logging.

WebSocket :
The ws library is used to create the WebSocket server, which allows for real-time communication between the server and connected clients. It provides a lightweight, low-level implementation of WebSocket, giving full control over connections, messages, and event handling.

Axios:
On the client side, Axios is used for making HTTP requests to the RESTful API. It provides a simple API for performing asynchronous HTTP requests and handling responses.

UUID:
The uuid library is used to generate unique identifiers (clientID and message IDs). This ensures that each message and client is uniquely identifiable, which is crucial for message deletion and client-specific actions.

Error Handling and Logging:
Winston is used for structured logging, ensuring that all errors and important events (like client disconnections or message deletions) are logged properly.

### Future Enhancements
Database Integration:
Currently, messages are stored in memory. For production usage, the server can be extended to use a database for storing messages, allowing data to be saved between server restarts.
A database like Redis can be used for message queuing or caching to improve performance when dealing with a large number of WebSocket connections.

Authentication and Security:
For a production environment, authentication could be added using JWT to authenticate clients and protect both WebSocket connections and REST API endpoints.

