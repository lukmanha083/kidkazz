/**
 * Durable Object: Inventory Updates Broadcaster
 *
 * Handles WebSocket connections for real-time inventory updates.
 * Clients subscribe to channels and receive instant notifications when inventory changes occur.
 *
 * Features:
 * - WebSocket connection management
 * - Channel-based subscriptions (global, product:xxx, warehouse:xxx, variant:xxx)
 * - Automatic connection cleanup
 * - Broadcast to all subscribers in matching channels
 * - Optimistic locking support via version field
 *
 * Phase 3 DDD Implementation
 */

import { DurableObject } from 'cloudflare:workers';

/**
 * Inventory Event Types (DDD Compliant)
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
 * Inventory Event (DDD Compliant)
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

interface WebSocketSession {
  webSocket: WebSocket;
  subscriptions: Set<string>;
  connectedAt: number;
  lastPingAt: number;
}

export class InventoryUpdatesBroadcaster extends DurableObject {
  private sessions: Map<WebSocket, WebSocketSession>;

  constructor(state: DurableObjectState, env: any) {
    super(state, env);
    this.sessions = new Map();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Handle internal broadcast endpoint
    if (url.pathname === '/broadcast' && request.method === 'POST') {
      try {
        const event = (await request.json()) as InventoryEvent;
        await this.broadcast(event);
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

    server.accept();

    const now = Date.now();
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

    server.addEventListener('message', (event) => {
      this.handleMessage(server, session, event);
    });

    server.addEventListener('close', () => {
      this.sessions.delete(server);
    });

    server.addEventListener('error', () => {
      this.sessions.delete(server);
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  private handleMessage(
    webSocket: WebSocket,
    session: WebSocketSession,
    event: MessageEvent
  ): void {
    try {
      const message = JSON.parse(event.data as string);

      switch (message.type) {
        case 'subscribe':
          this.handleSubscribe(webSocket, session, message.channel);
          break;

        case 'unsubscribe':
          this.handleUnsubscribe(webSocket, session, message.channel);
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
   * Channels:
   * - 'global' - receive all updates
   * - 'product:{productId}' - updates for a specific product
   * - 'warehouse:{warehouseId}' - updates for a specific warehouse
   * - 'variant:{variantId}' - updates for a specific variant
   * - 'uom:{uomId}' - updates for a specific UOM
   * - 'product:{productId}:warehouse:{warehouseId}' - specific product+warehouse
   * - 'transfer:{transferId}' - updates for a specific transfer
   */
  private handleSubscribe(
    webSocket: WebSocket,
    session: WebSocketSession,
    channel: string = 'global'
  ): void {
    session.subscriptions.add(channel);

    webSocket.send(
      JSON.stringify({
        type: 'subscribed',
        channel,
        timestamp: new Date().toISOString(),
      })
    );
  }

  private handleUnsubscribe(
    webSocket: WebSocket,
    session: WebSocketSession,
    channel: string = 'global'
  ): void {
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
   * Broadcast event to all subscribed clients
   */
  async broadcast(event: InventoryEvent): Promise<void> {
    const channels = this.getEventChannels(event);
    const message = JSON.stringify(event);

    let count = 0;
    const deadConnections: WebSocket[] = [];

    for (const [webSocket, session] of this.sessions.entries()) {
      const shouldReceive =
        session.subscriptions.has('global') ||
        channels.some((channel) => session.subscriptions.has(channel));

      if (shouldReceive) {
        try {
          webSocket.send(message);
          count++;
        } catch (error) {
          deadConnections.push(webSocket);
        }
      }
    }

    for (const ws of deadConnections) {
      this.sessions.delete(ws);
    }

    console.log(
      `[InventoryWebSocket] Broadcasted ${event.type} to ${count} clients. Channels: ${channels.join(', ')}`
    );
  }

  private getEventChannels(event: InventoryEvent): string[] {
    const channels: string[] = [];
    const { productId, warehouseId, variantId, uomId, transferId } = event.data;

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

    if (event.type.startsWith('transfer.') && transferId) {
      channels.push(`transfer:${transferId}`);
    }

    return channels;
  }

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
