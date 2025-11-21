/**
 * Durable Object: Inventory Updates Broadcaster
 *
 * Handles WebSocket connections for real-time inventory updates.
 * Clients subscribe to specific product/warehouse combinations and receive
 * instant notifications when inventory changes occur.
 *
 * Features:
 * - WebSocket connection management
 * - Room-based subscriptions (product+warehouse)
 * - Automatic connection cleanup
 * - Broadcast to all subscribers in a room
 */

import { DurableObject } from 'cloudflare:workers';

export interface InventoryUpdate {
  type: 'inventory_updated' | 'inventory_adjusted' | 'stock_low';
  data: {
    inventoryId: string;
    productId: string;
    warehouseId: string;
    quantityAvailable: number;
    quantityReserved: number;
    minimumStock?: number;
    timestamp: string;
  };
}

interface WebSocketSession {
  webSocket: WebSocket;
  subscriptions: Set<string>; // Set of "productId:warehouseId" room keys
}

export class InventoryUpdatesBroadcaster extends DurableObject {
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
      subscriptions: new Set(),
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
   * Subscribe to inventory updates for specific product/warehouse
   */
  private handleSubscribe(
    session: WebSocketSession,
    payload: { productId?: string; warehouseId?: string }
  ): void {
    const { productId, warehouseId } = payload;

    // Create room key
    const roomKey = this.getRoomKey(productId, warehouseId);
    session.subscriptions.add(roomKey);

    // Send confirmation
    session.webSocket.send(
      JSON.stringify({
        type: 'subscribed',
        roomKey,
        productId,
        warehouseId,
      })
    );
  }

  /**
   * Unsubscribe from inventory updates
   */
  private handleUnsubscribe(
    session: WebSocketSession,
    payload: { productId?: string; warehouseId?: string }
  ): void {
    const { productId, warehouseId } = payload;
    const roomKey = this.getRoomKey(productId, warehouseId);
    session.subscriptions.delete(roomKey);

    session.webSocket.send(
      JSON.stringify({
        type: 'unsubscribed',
        roomKey,
        productId,
        warehouseId,
      })
    );
  }

  /**
   * Broadcast inventory update to all subscribed clients
   * This method is called via HTTP POST from the inventory service
   */
  async broadcastUpdate(update: InventoryUpdate): Promise<void> {
    const roomKey = this.getRoomKey(update.data.productId, update.data.warehouseId);

    let count = 0;
    const message = JSON.stringify(update);

    // Broadcast to all sessions subscribed to this room
    for (const [webSocket, session] of this.sessions.entries()) {
      if (session.subscriptions.has(roomKey) || session.subscriptions.has('*')) {
        try {
          webSocket.send(message);
          count++;
        } catch (error) {
          // Remove dead connections
          this.sessions.delete(webSocket);
        }
      }
    }

    console.log(`Broadcasted update to ${count} clients for room: ${roomKey}`);
  }

  /**
   * Generate room key for subscriptions
   */
  private getRoomKey(productId?: string, warehouseId?: string): string {
    if (!productId && !warehouseId) return '*'; // Subscribe to all
    if (productId && warehouseId) return `${productId}:${warehouseId}`;
    if (productId) return `product:${productId}`;
    if (warehouseId) return `warehouse:${warehouseId}`;
    return '*';
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
      for (const roomKey of session.subscriptions) {
        subscriptionCounts[roomKey] = (subscriptionCounts[roomKey] || 0) + 1;
      }
    }

    return {
      totalConnections: this.sessions.size,
      subscriptionCounts,
    };
  }
}
