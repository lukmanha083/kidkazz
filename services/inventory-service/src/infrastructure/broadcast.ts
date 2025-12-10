/**
 * Broadcast Utility
 *
 * Helper functions to trigger real-time broadcasts via Durable Objects.
 * These are called after inventory or warehouse changes to notify connected clients.
 *
 * Phase 3 DDD Enhancement:
 * - Added support for new InventoryEvent type
 * - Maintains backward compatibility with InventoryUpdate
 */

import type { InventoryUpdate, InventoryEvent } from '../durable-objects/InventoryUpdatesBroadcaster';
import type { WarehouseUpdate } from '../durable-objects/WarehouseUpdatesBroadcaster';

/**
 * Trigger inventory event broadcast (Phase 3 DDD-compliant)
 * Supports the new event types: inventory.updated, inventory.low_stock, inventory.out_of_stock, etc.
 */
export async function broadcastInventoryEvent(
  env: { INVENTORY_UPDATES: DurableObjectNamespace },
  event: InventoryEvent
): Promise<void> {
  try {
    const id = env.INVENTORY_UPDATES.idFromName('global');
    const stub = env.INVENTORY_UPDATES.get(id) as any;
    await stub.broadcastEvent(event);
  } catch (error) {
    console.error('Failed to broadcast inventory event:', error);
    // Don't throw - broadcasts are best-effort
  }
}

/**
 * Trigger inventory update broadcast (legacy)
 * @deprecated Use broadcastInventoryEvent instead
 */
export async function broadcastInventoryUpdate(
  env: { INVENTORY_UPDATES: DurableObjectNamespace },
  update: InventoryUpdate
): Promise<void> {
  try {
    const id = env.INVENTORY_UPDATES.idFromName('global');
    const stub = env.INVENTORY_UPDATES.get(id) as any;
    await stub.broadcastUpdate(update);
  } catch (error) {
    console.error('Failed to broadcast inventory update:', error);
    // Don't throw - broadcasts are best-effort
  }
}

/**
 * Trigger warehouse update broadcast
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
    // Don't throw - broadcasts are best-effort
  }
}
