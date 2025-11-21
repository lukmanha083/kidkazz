/**
 * Durable Object: Warehouse Updates Broadcaster
 *
 * Handles WebSocket connections for real-time warehouse updates.
 * Clients subscribe to warehouse changes and receive instant notifications.
 *
 * Features:
 * - WebSocket connection management
 * - Warehouse-specific subscriptions
 * - Automatic connection cleanup
 * - Broadcast to all subscribers
 */

import { DurableObject } from 'cloudflare:workers';

export interface WarehouseUpdate {
  type: 'warehouse_created' | 'warehouse_updated' | 'warehouse_deleted';
  data: {
    warehouseId: string;
    code: string;
    name: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      country?: string;
      postalCode?: string;
    };
    isActive: boolean;
    timestamp: string;
  };
}

interface WebSocketSession {
  webSocket: WebSocket;
  subscriptions: Set<string>; // Set of warehouse IDs or '*' for all
}

export class WarehouseUpdatesBroadcaster extends DurableObject {
  private sessions: Map<WebSocket, WebSocketSession>;

  constructor(state: DurableObjectState, env: any) {
    super(state, env);
    this.sessions = new Map();
  }

  /**
   * Handle HTTP requests (WebSocket upgrade)
   */
  async fetch(request: Request): Promise<Response> {
    // Only accept WebSocket upgrades
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    // Create WebSocket pair
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept the WebSocket connection
    server.accept();

    // Initialize session
    const session: WebSocketSession = {
      webSocket: server,
      subscriptions: new Set(['*']), // Default: subscribe to all warehouses
    };
    this.sessions.set(server, session);

    // Set up event handlers
    server.addEventListener('message', (event) => {
      this.handleMessage(server, session, event);
    });

    server.addEventListener('close', () => {
      this.sessions.delete(server);
    });

    server.addEventListener('error', () => {
      this.sessions.delete(server);
    });

    // Send welcome message
    server.send(
      JSON.stringify({
        type: 'connected',
        message: 'Connected to warehouse updates broadcaster',
        timestamp: Date.now(),
      })
    );

    // Return the client-side WebSocket
    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(
    webSocket: WebSocket,
    session: WebSocketSession,
    event: MessageEvent
  ): void {
    try {
      const message = JSON.parse(event.data as string);

      switch (message.type) {
        case 'subscribe':
          this.handleSubscribe(session, message.payload);
          break;

        case 'unsubscribe':
          this.handleUnsubscribe(session, message.payload);
          break;

        case 'ping':
          webSocket.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;

        default:
          webSocket.send(
            JSON.stringify({
              type: 'error',
              message: `Unknown message type: ${message.type}`,
            })
          );
      }
    } catch (error) {
      webSocket.send(
        JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
        })
      );
    }
  }

  /**
   * Subscribe to warehouse updates
   */
  private handleSubscribe(
    session: WebSocketSession,
    payload: { warehouseId?: string }
  ): void {
    const subscriptionKey = payload.warehouseId || '*';
    session.subscriptions.add(subscriptionKey);

    // Send confirmation
    session.webSocket.send(
      JSON.stringify({
        type: 'subscribed',
        warehouseId: payload.warehouseId,
        subscribedToAll: subscriptionKey === '*',
      })
    );
  }

  /**
   * Unsubscribe from warehouse updates
   */
  private handleUnsubscribe(
    session: WebSocketSession,
    payload: { warehouseId?: string }
  ): void {
    const subscriptionKey = payload.warehouseId || '*';
    session.subscriptions.delete(subscriptionKey);

    session.webSocket.send(
      JSON.stringify({
        type: 'unsubscribed',
        warehouseId: payload.warehouseId,
      })
    );
  }

  /**
   * Broadcast warehouse update to all subscribed clients
   * This method is called via HTTP POST from the inventory service
   */
  async broadcastUpdate(update: WarehouseUpdate): Promise<void> {
    const warehouseId = update.data.warehouseId;

    let count = 0;
    const message = JSON.stringify(update);

    // Broadcast to all sessions subscribed to this warehouse or all warehouses
    for (const [webSocket, session] of this.sessions.entries()) {
      if (session.subscriptions.has(warehouseId) || session.subscriptions.has('*')) {
        try {
          webSocket.send(message);
          count++;
        } catch (error) {
          // Remove dead connections
          this.sessions.delete(webSocket);
        }
      }
    }

    console.log(
      `Broadcasted warehouse update to ${count} clients for warehouse: ${warehouseId}`
    );
  }

  /**
   * Get connection stats (for monitoring)
   */
  getStats(): {
    totalConnections: number;
    subscriptionCounts: Record<string, number>;
  } {
    const subscriptionCounts: Record<string, number> = {};

    for (const session of this.sessions.values()) {
      for (const subscriptionKey of session.subscriptions) {
        subscriptionCounts[subscriptionKey] =
          (subscriptionCounts[subscriptionKey] || 0) + 1;
      }
    }

    return {
      totalConnections: this.sessions.size,
      subscriptionCounts,
    };
  }
}
