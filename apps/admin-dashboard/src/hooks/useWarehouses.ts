import { useState, useEffect } from 'react';
import api, { type Warehouse } from '@/lib/api';

export function useWarehouses(options?: { polling?: boolean; interval?: number }) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.warehouse.getAll();
      setWarehouses(data.warehouses);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch warehouses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();

    // Set up polling if enabled
    if (options?.polling) {
      const interval = setInterval(fetchWarehouses, options.interval || 30000);
      return () => clearInterval(interval);
    }
  }, [options?.polling, options?.interval]);

  const createWarehouse = async (data: any) => {
    try {
      const newWarehouse = await api.warehouse.create(data);
      setWarehouses(prev => [...prev, newWarehouse.warehouse]);
      return newWarehouse;
    } catch (err) {
      throw err;
    }
  };

  const updateWarehouse = async (id: string, data: any) => {
    try {
      const updated = await api.warehouse.update(id, data);
      setWarehouses(prev => prev.map(w => w.id === id ? updated.warehouse : w));
      return updated;
    } catch (err) {
      throw err;
    }
  };

  const deleteWarehouse = async (id: string) => {
    try {
      await api.warehouse.delete(id);
      setWarehouses(prev => prev.filter(w => w.id !== id));
    } catch (err) {
      throw err;
    }
  };

  return {
    warehouses,
    loading,
    error,
    refetch: fetchWarehouses,
    createWarehouse,
    updateWarehouse,
    deleteWarehouse,
  };
}
