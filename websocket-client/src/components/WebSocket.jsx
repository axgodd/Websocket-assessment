import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './WebSocket.css';

const WebSocketComponent = () => {
    const [socket, setSocket] = useState(null);
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [clientID, setClientID] = useState(null);

    // Function to handle WebSocket messages
    const handleWebSocketMessage = (event) => {
        try {
            const data = JSON.parse(event.data);

            // Process different types of WebSocket messages
            if (data.type === 'initial') {
                setMessages(data.messages); // Set initial messages from the server
            } else if (data.type === 'new') {
                setMessages((prevMessages) => [...prevMessages, data.message]); // Add new message
            } else if (data.type === 'delete') {
                setMessages((prevMessages) =>
                    prevMessages.filter((msg) => msg.id !== data.id)
                ); // Remove deleted message
            }
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    };


    const handleWebSocketClose = (event) => {
        console.warn('WebSocket closed:', event);
    };


    const handleWebSocketError = (error) => {
        if (socket && socket.readyState === WebSocket.CLOSED) {
            console.error('WebSocket Error:', error);
        }
    };

    // Function to send a new message via WebSocket
    const sendMessage = () => {
        if (socket && socket.readyState === WebSocket.OPEN && message) {
            try {
                const messageData = { clientID, content: message }; // Include clientID with the message
                socket.send(JSON.stringify(messageData)); // Send the message to the server
                setMessage(''); // Clear the input field after sending
            } catch (error) {
                console.error('Error sending message:', error);
            }
        }
    };

    // Fetch messages
    const fetchMessages = async () => {
        try {
            const response = await axios.get('http://localhost:3000/resources');
            setMessages(response.data);
        } catch (error) {
            console.error('Error fetching messages from server:', error);
        }
    };

    // Delete a message
    const deleteMessage = async (id) => {
        try {
            await axios.delete(`http://localhost:3000/resources/${id}`, { data: { clientID } });
            setMessages((prevMessages) => prevMessages.filter((msg) => msg.id !== id));
        } catch (error) {
            if (error.response && error.response.status === 403) {
                console.warn('Unauthorized delete attempt:', error.response.data);
            } else {
                console.error('Error deleting message:', error);
            }
        }
    };

    useEffect(() => {
        const ws = new WebSocket('ws://localhost:8080');
        setSocket(ws);

        // Generate a random clientID
        const generatedClientID = `client-${Math.random().toString(36).substring(7)}`;
        setClientID(generatedClientID);

        ws.onopen = () => {
            console.log('Connected to WebSocket server');
        };

        fetchMessages();

        // Set up WebSocket event handlers
        ws.onmessage = handleWebSocketMessage;
        ws.onclose = handleWebSocketClose;
        ws.onerror = handleWebSocketError;


        return () => {
            if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                ws.close();
            }
        };
    }, []);

    return (
        <div className="chat-container">
            <h1>WebSocket Chat</h1>
            <div className="message-input-container">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter your message"
                    className="message-input"
                />
                <button onClick={sendMessage} className="send-button">Send</button>
            </div>


            <ul className="message-list">
                {messages.map((msg) => (
                    <li key={msg.id} className={`message-item ${msg.clientID === clientID ? 'own-message' : ''}`}>
                        <span className="client-id">{msg.clientID}: </span>
                        <span className="message-content">{msg.content}</span>

                        {msg.clientID === clientID && (
                            <button onClick={() => deleteMessage(msg.id)} className="delete-button">Delete</button>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default WebSocketComponent;