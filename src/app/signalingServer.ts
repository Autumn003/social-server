import { WebSocketServer, WebSocket } from "ws";
import http from "http";

interface Message {
    type: string;
    sdp?: any;
    candidate?: any;
    id?: string; // Unique identifier for the sender/receiver
}

export const createSignalingServer = (server: http.Server) => {
    const wss = new WebSocketServer({ server });

    // Map to track connected clients by ID
    const clients: Map<string, WebSocket> = new Map();

    wss.on("connection", (ws) => {
        console.log("Client connected");

        ws.on("error", console.error);

        ws.on("message", (data) => {
            try {
                const message: Message = JSON.parse(data.toString());
                handleSignalingMessage(ws, message);
            } catch (error) {
                console.error("Failed to parse message:", data);
            }
        });

        ws.on("close", () => {
            console.log("Client disconnected");
            // Clean up disconnected client
            for (const [id, client] of clients.entries()) {
                if (client === ws) {
                    clients.delete(id);
                    console.log(`Client with ID ${id} removed`);
                }
            }
        });
    });

    const handleSignalingMessage = (ws: WebSocket, message: Message) => {
        switch (message.type) {
            case "register":
                if (message.id) {
                    clients.set(message.id, ws);
                    console.log(`Client registered with ID: ${message.id}`);
                }
                break;

            case "createOffer":
            case "createAnswer":
            case "iceCandidate":
                if (message.id) {
                    const target = clients.get(message.id);
                    if (target) {
                        target.send(JSON.stringify(message));
                        console.log(`Relayed message of type ${message.type} to ID ${message.id}`);
                    } else {
                        console.log(`Target ID ${message.id} not found`);
                    }
                }
                break;

            default:
                console.log("Unknown message type:", message.type);
                break;
        }
    };
};
