/**
 * Broadcast Utility
 *
 * Helper functions to trigger real-time broadcasts via Durable Objects.
 * Called after inventory or warehouse changes to notify connected clients.
 *
 * Phase 3 DDD Implementation
 */

import type { InventoryEvent } from '../durable-objects/InventoryUpdatesBroadcaster';
import type { WarehouseUpdate } from '../durable-objects/WarehouseUpdatesBroadcaster';

/**
 * Broadcast inventory event to all subscribed WebSocket clients
 */
export async function broadcastInventoryEvent(
  env: { INVENTORY_UPDATES: DurableObjectNamespace },
  event: InventoryEvent
): Promise<void> {
  try {
    const id = env.INVENTORY_UPDATES.idFromName('global');
    const stub = env.INVENTORY_UPDATES.get(id) as any;
    await stub.broadcast(event);
  } catch (error) {
    console.error('Failed to broadcast inventory event:', error);
  }
}

/**
 * Broadcast warehouse update to all subscribed WebSocket clients
 */
export async function broadcastWarehouseUpdate(
  env: { WAREHOUSE_UPDATES: DurableObjectNamespace },
  update: WarehouseUpdate
): Promise<void> {
  try {
    const id = env.WAREHOUSE_UPDATES.idFromName('global');
    const stub = env.WAREHOUSE_UPDATES.get(id) as any;
    await stub.broadcastUpdate(update);
  } catch (error) {
    console.error('Failed to broadcast warehouse update:', error);
  }
}
