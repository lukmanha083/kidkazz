import { useState, useEffect } from 'react';
import { productApi, Product } from '@/lib/api';

export function useProducts(params?: { status?: string; category?: string; search?: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await productApi.getAll(params);
      setProducts(data.products);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [params?.status, params?.category, params?.search]);

  const createProduct = async (data: any) => {
    try {
      const newProduct = await productApi.create(data);
      setProducts(prev => [...prev, newProduct]);
      return newProduct;
    } catch (err) {
      throw err;
    }
  };

  const updateProduct = async (id: string, data: any) => {
    try {
      const updated = await productApi.update(id, data);
      setProducts(prev => prev.map(p => p.id === id ? updated : p));
      return updated;
    } catch (err) {
      throw err;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await productApi.delete(id);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      throw err;
    }
  };

  const updateStock = async (id: string, stock: number) => {
    try {
      await productApi.updateStock(id, stock);
      setProducts(prev => prev.map(p => p.id === id ? { ...p, stock } : p));
    } catch (err) {
      throw err;
    }
  };

  return {
    products,
    loading,
    error,
    refetch: fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    updateStock,
  };
}
