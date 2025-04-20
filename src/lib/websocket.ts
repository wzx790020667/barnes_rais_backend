// Define WebSocket message types
export type WebsocketMessageType = 
  | "TRAINING_STARTED" 
  | "TRAINING_COMPLETED" 
  | "TRAINING_FAILED"
  | "TRAINING_PROGRESS";

export interface WebsocketMessage {
  type: WebsocketMessageType;
  payload?: any;
  timestamp: string;
}

// WebSocket service for broadcasting messages
// This service will use the clients tracked in the main server
class WebSocketService {
  private wsClients: Set<any>;
  private readonly WS_OPEN = 1; // WebSocket open state constant

  constructor(clients: Set<any>) {
    this.wsClients = clients;
  }

  broadcast(message: WebsocketMessage) {
    if (!this.wsClients.size) {
      console.log("No WebSocket clients connected, skipping broadcast");
      return;
    }

    const messageString = JSON.stringify({
      ...message,
      timestamp: message.timestamp || new Date().toISOString(),
    });

    console.log(`Broadcasting to ${this.wsClients.size} clients:`, messageString);
    
    for (const client of this.wsClients) {
      if (client.readyState === this.WS_OPEN) {
        client.send(messageString);
      }
    }
  }

  sendTrainingStarted(taskId: string, datasetName: string, customerId: string) {
    this.broadcast({
      type: "TRAINING_STARTED",
      payload: {
        taskId,
        datasetName,
        customerId,
      },
      timestamp: new Date().toISOString()
    });
  }

  sendTrainingCompleted(taskId: string, accuracy: string) {
    this.broadcast({
      type: "TRAINING_COMPLETED",
      payload: {
        taskId,
        accuracy
      },
      timestamp: new Date().toISOString()
    });
  }

  sendTrainingFailed(taskId: string, error: string) {
    this.broadcast({
      type: "TRAINING_FAILED",
      payload: {
        taskId,
        error
      },
      timestamp: new Date().toISOString()
    });
  }

  sendTrainingProgress(taskId: string, progress: number) {
    this.broadcast({
      type: "TRAINING_PROGRESS",
      payload: {
        taskId,
        progress
      },
      timestamp: new Date().toISOString()
    });
  }
}

// Export a function to create the service with the provided clients
export function createWebSocketService(clients: Set<any>) {
  return new WebSocketService(clients);
} 