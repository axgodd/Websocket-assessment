const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const cluster = require('cluster');
const os = require('os');
const morgan = require('morgan');
const logger = require('./logger');

const numCPUs = os.cpus().length;

if (cluster.isMaster) {
    // Fork workers based on the number of CPU cores available
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }
    logger.info('RESTful API server running on port 3000');
    logger.info('WebSocket server running on port 8080');
    // Handle worker exit
    cluster.on('exit', (worker) => {
        logger.error(`Worker ${worker.process.pid} died`);
        cluster.fork(); // Restart the worker
    });

} else {
    // Create the Express application for each worker
    const app = express();
    app.use(cors());
    app.use(express.json());

    // Use Morgan to log
    app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

    let messages = [];
    let clients = new Map(); // Map to store clients with additional metadata


    app.use((err, req, res, next) => {
        logger.error(`Error: ${err.message}`);
        res.status(500).json({ error: 'Internal server error' });
    });

    // 1. Create a new message
    app.post('/resources', (req, res) => {
        try {
            const newMessage = { id: uuidv4(), clientID: req.body.clientID, content: req.body.data };
            messages.push(newMessage);
            logger.info(`Message created: ${JSON.stringify(newMessage)}`);
            res.status(201).json(newMessage);
        } catch (error) {
            logger.error('Error creating message:', error);
            res.status(500).json({ error: 'Failed to create message' });
        }
    });

    // 2. Get all messages
    app.get('/resources', (req, res) => {
        try {
            res.status(200).json(messages);
            logger.info('Fetched all messages');
        } catch (error) {
            logger.error('Error fetching messages:', error);
            res.status(500).json({ error: 'Failed to fetch messages' });
        }
    });

    // 3. Delete a message by ID
    app.delete('/resources/:id', (req, res) => {
        const { id } = req.params;
        const { clientID } = req.body; // Assuming the clientID is sent in the request body

        try {
            const messageIndex = messages.findIndex(message => message.id === id);
            if (messageIndex !== -1) {
                const message = messages[messageIndex];
                if (message.clientID === clientID) {
                    messages.splice(messageIndex, 1);
                    logger.info(`Message deleted: ${id}`);
                    res.status(200).json({ message: `Message with id ${id} deleted.` });

                    // Broadcast to all clients that a message was deleted
                    broadcastMessage(JSON.stringify({ type: 'delete', id }));
                } else {
                    logger.warn(`Unauthorized delete attempt: clientID ${clientID} tried to delete message ${id}`);
                    res.status(403).json({ error: 'Unauthorized delete attempt' });
                }
            } else {
                logger.warn(`Message not found: ${id}`);
                res.status(404).json({ error: `Message with id ${id} not found.` });
            }
        } catch (error) {
            logger.error('Error deleting message:', error);
            res.status(500).json({ error: 'Failed to delete message' });
        }
    });

    const apiServer = app.listen(3000);

    // WebSocket Server
    const wss = new WebSocket.Server({ port: 8080 });

    wss.on('connection', (ws) => {
        const clientID = `client-${uuidv4()}`;
        clients.set(ws, { id: clientID, connectedAt: Date.now() });

        logger.info(`A new client connected: ${clientID}`);

        // Send all messages (resources) to the newly connected client
        ws.send(JSON.stringify({ type: 'initial', messages }));

        // Send a welcome message as JSON
        ws.send(JSON.stringify({ type: 'welcome', message: `Welcome to the WebSocket server! Your clientID: ${clientID}` }));

        // Listen for incoming WebSocket messages
        ws.on('message', (message) => {
            logger.info(`Server received: ${message}`);

            try {
                const parsedMessage = JSON.parse(message);
                const newMessage = {
                    id: uuidv4(),
                    clientID: parsedMessage.clientID,
                    content: parsedMessage.content
                };

                // Store the new message
                messages.push(newMessage);
                logger.info(`Message received: ${JSON.stringify(newMessage)}`);

                // Broadcast the new message to all clients
                broadcastMessage(JSON.stringify({ type: 'new', message: newMessage }));
            } catch (error) {
                logger.error('Error processing WebSocket message:', error);
            }
        });

        // Handle client disconnection
        ws.on('close', () => {
            const clientData = clients.get(ws);
            if (clientData) {
                logger.info(`Client disconnected: ${clientData.id}`);
                clients.delete(ws); // Remove the disconnected client
            }
        });

        // Handle WebSocket errors
        ws.on('error', (error) => {
            logger.error(`WebSocket error: ${error.message}`);
        });
    });

    // Function to broadcast a message to all WebSocket clients
    function broadcastMessage(message) {
        clients.forEach((clientData, ws) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(message); // Broadcast the message to the open client
                logger.info(`Broadcasted message to client ${clientData.id}`);
            }
        });
    }


}