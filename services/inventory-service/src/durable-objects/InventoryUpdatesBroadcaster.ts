/**
 * Durable Object: Inventory Updates Broadcaster
 *
 * Handles WebSocket connections for real-time inventory updates.
 * Clients subscribe to channels and receive instant notifications when inventory changes occur.
 *
 * Features:
 * - WebSocket connection management
 * - Channel-based subscriptions (global, product:xxx, warehouse:xxx, variant:xxx)
 * - Automatic connection cleanup with reconnection support
 * - Broadcast to all subscribers in matching channels
 * - Optimistic locking support via version field
 *
 * Phase 3 DDD Enhancement:
 * - New event types for inventory states
 * - Variant and UOM support
 * - Transfer and batch events
 */

import { DurableObject } from 'cloudflare:workers';

/**
 * Phase 3 Inventory Event Types (DDD Compliant)
 */
export type InventoryEventType =
  | 'inventory.updated'
  | 'inventory.low_stock'
  | 'inventory.out_of_stock'
  | 'batch.expiring_soon'
  | 'transfer.requested'
  | 'transfer.approved'
  | 'transfer.rejected'
  | 'transfer.picking_started'
  | 'transfer.packed'
  | 'transfer.shipped'
  | 'transfer.received'
  | 'transfer.completed'
  | 'transfer.cancelled';

/**
 * Phase 3 Enhanced Inventory Event (DDD Compliant)
 */
export interface InventoryEvent {
  type: InventoryEventType;
  data: {
    inventoryId?: string;
    productId?: string;
    warehouseId?: string;
    variantId?: string;
    uomId?: string;
    quantityAvailable?: number;
    quantityReserved?: number;
    quantityInTransit?: number;
    minimumStock?: number;
    version?: number;
    previousQuantity?: number;
    changeAmount?: number;
    movementType?: string;
    timestamp: string;
    [key: string]: any;
  };
}

/**
 * Legacy InventoryUpdate type (for backward compatibility)
 * @deprecated Use InventoryEvent instead
 */
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
  subscriptions: Set<string>; // Set of channel names (e.g., 'global', 'product:xxx', 'warehouse:xxx')
  connectedAt: number;
  lastPingAt: number;
}

export class InventoryUpdatesBroadcaster extends DurableObject {
  private sessions: Map<WebSocket, WebSocketSession>;

  constructor(state: DurableObjectState, env: any) {
    super(state, env);
    this.sessions = new Map();
  }

  /**
   * Handle HTTP requests (WebSocket upgrade or broadcast)
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Handle internal broadcast endpoint
    if (url.pathname === '/broadcast' && request.method === 'POST') {
      try {
        const event = (await request.json()) as InventoryEvent | InventoryUpdate;
        await this.broadcastEvent(event);
        return new Response('OK', { status: 200 });
      } catch (error) {
        console.error('Broadcast error:', error);
        return new Response('Broadcast failed', { status: 500 });
      }
    }

    // Only accept WebSocket upgrades
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    // Create WebSocket pair
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept the WebSocket connection
    server.accept();

    const now = Date.now();

    // Initialize session with default 'global' subscription
    const session: WebSocketSession = {
      webSocket: server,
      subscriptions: new Set(['global']),
      connectedAt: now,
      lastPingAt: now,
    };
    this.sessions.set(server, session);

    // Send welcome message
    server.send(
      JSON.stringify({
        type: 'connected',
        message: 'Connected to Inventory WebSocket',
        timestamp: new Date().toISOString(),
        defaultChannel: 'global',
      })
    );

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
          this.handleSubscribe(webSocket, session, message);
          break;

        case 'unsubscribe':
          this.handleUnsubscribe(webSocket, session, message);
          break;

        case 'ping':
          session.lastPingAt = Date.now();
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
   * Subscribe to a channel
   * Channels can be:
   * - 'global' - receive all updates
   * - 'product:{productId}' - updates for a specific product
   * - 'warehouse:{warehouseId}' - updates for a specific warehouse
   * - 'variant:{variantId}' - updates for a specific variant
   * - 'product:{productId}:warehouse:{warehouseId}' - updates for specific product+warehouse
   */
  private handleSubscribe(
    webSocket: WebSocket,
    session: WebSocketSession,
    message: { channel?: string; payload?: { productId?: string; warehouseId?: string; variantId?: string } }
  ): void {
    let channel: string;

    // Support both new channel format and legacy payload format
    if (message.channel) {
      channel = message.channel;
    } else if (message.payload) {
      // Legacy format support
      const { productId, warehouseId, variantId } = message.payload;
      channel = this.getChannelFromParams(productId, warehouseId, variantId);
    } else {
      channel = 'global';
    }

    session.subscriptions.add(channel);

    webSocket.send(
      JSON.stringify({
        type: 'subscribed',
        channel,
        timestamp: new Date().toISOString(),
      })
    );
  }

  /**
   * Unsubscribe from a channel
   */
  private handleUnsubscribe(
    webSocket: WebSocket,
    session: WebSocketSession,
    message: { channel?: string; payload?: { productId?: string; warehouseId?: string; variantId?: string } }
  ): void {
    let channel: string;

    if (message.channel) {
      channel = message.channel;
    } else if (message.payload) {
      const { productId, warehouseId, variantId } = message.payload;
      channel = this.getChannelFromParams(productId, warehouseId, variantId);
    } else {
      channel = 'global';
    }

    session.subscriptions.delete(channel);

    webSocket.send(
      JSON.stringify({
        type: 'unsubscribed',
        channel,
        timestamp: new Date().toISOString(),
      })
    );
  }

  /**
   * Broadcast event to all subscribed clients (Phase 3 DDD compliant)
   */
  async broadcastEvent(event: InventoryEvent | InventoryUpdate): Promise<void> {
    const channels = this.getEventChannels(event);
    const message = JSON.stringify(event);

    let count = 0;
    const deadConnections: WebSocket[] = [];

    // Broadcast to all sessions that match any of the event's channels
    for (const [webSocket, session] of this.sessions.entries()) {
      const shouldReceive =
        session.subscriptions.has('global') ||
        channels.some((channel) => session.subscriptions.has(channel));

      if (shouldReceive) {
        try {
          webSocket.send(message);
          count++;
        } catch (error) {
          // Mark for removal
          deadConnections.push(webSocket);
        }
      }
    }

    // Remove dead connections
    for (const ws of deadConnections) {
      this.sessions.delete(ws);
    }

    console.log(
      `[InventoryWebSocket] Broadcasted ${event.type} to ${count} clients. Channels: ${channels.join(', ')}`
    );
  }

  /**
   * Legacy broadcast method for backward compatibility
   * @deprecated Use broadcastEvent instead
   */
  async broadcastUpdate(update: InventoryUpdate): Promise<void> {
    return this.broadcastEvent(update);
  }

  /**
   * Get all relevant channels for an event
   */
  private getEventChannels(event: InventoryEvent | InventoryUpdate): string[] {
    const channels: string[] = [];
    const { productId, warehouseId, variantId, uomId } = event.data as any;

    // Add specific channels based on event data
    if (variantId) {
      channels.push(`variant:${variantId}`);
    }

    if (uomId) {
      channels.push(`uom:${uomId}`);
    }

    if (productId && warehouseId) {
      channels.push(`product:${productId}:warehouse:${warehouseId}`);
    }

    if (productId) {
      channels.push(`product:${productId}`);
    }

    if (warehouseId) {
      channels.push(`warehouse:${warehouseId}`);
    }

    // Transfer events get their own channel
    if (event.type.startsWith('transfer.')) {
      const { transferId } = event.data as any;
      if (transferId) {
        channels.push(`transfer:${transferId}`);
      }
    }

    return channels;
  }

  /**
   * Generate channel name from parameters (legacy support)
   */
  private getChannelFromParams(
    productId?: string,
    warehouseId?: string,
    variantId?: string
  ): string {
    if (variantId) return `variant:${variantId}`;
    if (productId && warehouseId) return `product:${productId}:warehouse:${warehouseId}`;
    if (productId) return `product:${productId}`;
    if (warehouseId) return `warehouse:${warehouseId}`;
    return 'global';
  }

  /**
   * Get connection stats (for monitoring)
   */
  getStats(): {
    totalConnections: number;
    subscriptionCounts: Record<string, number>;
    oldestConnection: number | null;
    newestConnection: number | null;
  } {
    const subscriptionCounts: Record<string, number> = {};
    let oldestConnection: number | null = null;
    let newestConnection: number | null = null;

    for (const session of this.sessions.values()) {
      for (const channel of session.subscriptions) {
        subscriptionCounts[channel] = (subscriptionCounts[channel] || 0) + 1;
      }

      if (oldestConnection === null || session.connectedAt < oldestConnection) {
        oldestConnection = session.connectedAt;
      }
      if (newestConnection === null || session.connectedAt > newestConnection) {
        newestConnection = session.connectedAt;
      }
    }

    return {
      totalConnections: this.sessions.size,
      subscriptionCounts,
      oldestConnection,
      newestConnection,
    };
  }
}
