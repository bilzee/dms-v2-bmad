// Real-time broadcast utility for Server-Sent Events
// Separated from API route to follow Next.js best practices

// Store active connections
const connections = new Set<ReadableStreamDefaultController>();

export function addConnection(controller: ReadableStreamDefaultController) {
  connections.add(controller);
}

export function removeConnection(controller: ReadableStreamDefaultController) {
  connections.delete(controller);
}

export function getConnectionCount(): number {
  return connections.size;
}

// Broadcast updates to all connected clients
export function broadcastUpdate(notification: {
  type: 'data_update';
  timestamp: string;
  changes: {
    incidents?: string[];
    assessments?: string[];
    responses?: string[];
  };
  affectedEntities?: string[];
}) {
  const data = `data: ${JSON.stringify(notification)}\n\n`;
  const encoded = new TextEncoder().encode(data);
  
  // Send to all active connections
  for (const controller of connections) {
    try {
      controller.enqueue(encoded);
    } catch (error) {
      // Remove broken connections
      connections.delete(controller);
    }
  }
}

// Broadcast heartbeat to keep connections alive
export function broadcastHeartbeat() {
  const heartbeatMessage = {
    type: 'heartbeat',
    timestamp: new Date().toISOString(),
  };
  
  const data = `data: ${JSON.stringify(heartbeatMessage)}\n\n`;
  const encoded = new TextEncoder().encode(data);
  
  for (const controller of connections) {
    try {
      controller.enqueue(encoded);
    } catch (error) {
      connections.delete(controller);
    }
  }
}