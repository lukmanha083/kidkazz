import { useState, useEffect } from 'react';
import api, { type Inventory, type InventoryAdjustmentInput } from '@/lib/api';

export function useInventory(
  filters?: { productId?: string; warehouseId?: string },
  options?: { polling?: boolean; interval?: number }
) {
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.inventory.getAll(filters);
      setInventory(data.inventory);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();

    // Set up polling if enabled
    if (options?.polling) {
      const interval = setInterval(fetchInventory, options.interval || 30000);
      return () => clearInterval(interval);
    }
  }, [filters?.productId, filters?.warehouseId, options?.polling, options?.interval]);

  const adjustInventory = async (data: InventoryAdjustmentInput) => {
    try {
      const result = await api.inventory.adjust(data);
      // Refetch to get updated state
      await fetchInventory();
      return result;
    } catch (err) {
      throw err;
    }
  };

  const setMinimumStock = async (inventoryId: string, minimumStock: number) => {
    try {
      await api.inventory.setMinimumStock(inventoryId, minimumStock);
      await fetchInventory();
    } catch (err) {
      throw err;
    }
  };

  return {
    inventory,
    loading,
    error,
    refetch: fetchInventory,
    adjustInventory,
    setMinimumStock,
  };
}
