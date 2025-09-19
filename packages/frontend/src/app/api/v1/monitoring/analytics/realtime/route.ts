import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/server';
import { addConnection, removeConnection } from '@/lib/realtime/broadcast';

export async function GET(request: NextRequest) {
  const session = await auth();
  
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const stream = new ReadableStream({
    start(controller) {
      // Add connection to active connections
      addConnection(controller);
      
      // Send initial connection message
      const initialMessage = {
        type: 'connection_established',
        timestamp: new Date().toISOString(),
        clientId: Math.random().toString(36).substr(2, 9),
      };
      
      const data = `data: ${JSON.stringify(initialMessage)}\n\n`;
      controller.enqueue(new TextEncoder().encode(data));
      
      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          const heartbeatMessage = {
            type: 'heartbeat',
            timestamp: new Date().toISOString(),
          };
          
          const data = `data: ${JSON.stringify(heartbeatMessage)}\n\n`;
          controller.enqueue(new TextEncoder().encode(data));
        } catch (error) {
          // Connection closed, clean up
          clearInterval(heartbeat);
          removeConnection(controller);
        }
      }, 30000); // 30 second heartbeat
      
      // Clean up on close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        removeConnection(controller);
        controller.close();
      });
    },
    
    cancel() {
      // Remove connection when client disconnects
      removeConnection(this as any);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}

