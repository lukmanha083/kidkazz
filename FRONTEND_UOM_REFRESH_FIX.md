# Frontend UOM Update Refresh Issue - Fix Guide

## Problem

After updating a product UOM via PUT `/api/uoms/products/:id`, the product view doesn't refresh to show the updated data. However, when clicking the Edit button, the edit form shows the correct/updated data.

## Root Cause

The view component is not refetching product data after a successful UOM update. The edit form works correctly because it fetches fresh data when opened.

## Backend Status

✅ **Backend is working correctly:**
- GET `/api/products/:id` returns fresh data including updated UOMs
- PUT `/api/uoms/products/:id` successfully updates and persists UOM changes
- No caching mechanism interfering with data freshness

## Frontend Fix Required

The frontend needs to refetch product data after UOM updates. Here's the recommended pattern using React Query:

### Pattern 1: Using React Query `invalidateQueries`

```typescript
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

function ProductUOMEditor({ productId }: { productId: string }) {
  const queryClient = useQueryClient();

  // Mutation for updating UOM
  const updateUOMMutation = useMutation({
    mutationFn: (data: { uomId: string; updates: Partial<ProductUOM> }) =>
      api.productUOMs.updateProductUOM(data.uomId, data.updates),
    onSuccess: () => {
      // Invalidate and refetch product data
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      queryClient.invalidateQueries({ queryKey: ['products'] }); // Also invalidate list
      toast.success('UOM updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update UOM', {
        description: error.message
      });
    },
  });

  const handleUpdateUOM = (uomId: string, updates: Partial<ProductUOM>) => {
    updateUOMMutation.mutate({ uomId, updates });
  };

  // ... rest of component
}
```

### Pattern 2: Manual Refetch

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

function ProductView({ productId }: { productId: string }) {
  // Query for product data
  const {
    data: product,
    refetch: refetchProduct,
    isLoading,
  } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => api.products.getProduct(productId),
  });

  // Mutation for updating UOM
  const updateUOMMutation = useMutation({
    mutationFn: (data: { uomId: string; updates: Partial<ProductUOM> }) =>
      api.productUOMs.updateProductUOM(data.uomId, data.updates),
    onSuccess: async () => {
      // Manually refetch product data
      await refetchProduct();
      toast.success('UOM updated and view refreshed');
    },
  });

  // ... rest of component
}
```

### Pattern 3: Optimistic Updates (Advanced)

```typescript
const updateUOMMutation = useMutation({
  mutationFn: (data: { uomId: string; updates: Partial<ProductUOM> }) =>
    api.productUOMs.updateProductUOM(data.uomId, data.updates),
  onMutate: async (newData) => {
    // Cancel any outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['product', productId] });

    // Snapshot previous value
    const previousProduct = queryClient.getQueryData(['product', productId]);

    // Optimistically update the cache
    queryClient.setQueryData(['product', productId], (old: any) => ({
      ...old,
      productUOMs: old.productUOMs.map((uom: ProductUOM) =>
        uom.id === newData.uomId ? { ...uom, ...newData.updates } : uom
      ),
    }));

    return { previousProduct };
  },
  onError: (err, newData, context) => {
    // Rollback on error
    queryClient.setQueryData(['product', productId], context?.previousProduct);
    toast.error('Failed to update UOM');
  },
  onSettled: () => {
    // Always refetch after error or success
    queryClient.invalidateQueries({ queryKey: ['product', productId] });
  },
});
```

## Implementation Checklist

### Step 1: Identify the Component

Find the frontend component that:
- [ ] Displays product details with UOMs
- [ ] Has an "Edit" button that opens a form
- [ ] Allows UOM updates

**Likely locations:**
- `apps/admin-dashboard/src/routes/dashboard/products/all.tsx` (if integrated with real API)
- `apps/admin-dashboard/app/routes/admin/products.tsx`
- A component that calls `api.productUOMs.updateProductUOM()`

### Step 2: Check if React Query is Used

- [ ] Component uses `useQuery` to fetch product data
- [ ] Component uses `useMutation` for updates
- [ ] `@tanstack/react-query` is imported

### Step 3: Apply the Fix

**If using React Query:**
- [ ] Add `queryClient.invalidateQueries()` to mutation's `onSuccess`
- [ ] Ensure query key matches between fetch and invalidation
- [ ] Test that view refreshes after update

**If NOT using React Query:**
- [ ] Add manual refetch call after successful update
- [ ] Example: `await fetchProduct(productId)` after `updateProductUOM()` succeeds

### Step 4: Verify the Fix

Test the following workflow:
1. [ ] Open product view → UOM data displays
2. [ ] Click Edit → modify UOM (e.g., change stock from 10 to 15)
3. [ ] Click Update → success toast appears
4. [ ] **View should automatically refresh** showing new stock value (15)
5. [ ] Click Edit again → form shows same updated value (15)

## Example: Complete Component

```typescript
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  productUOMs: ProductUOM[];
}

interface ProductUOM {
  id: string;
  uomCode: string;
  uomName: string;
  barcode: string;
  conversionFactor: number;
  stock: number;
  isDefault: boolean;
}

export function ProductViewWithUOMs({ productId }: { productId: string }) {
  const queryClient = useQueryClient();
  const [isEditingUOM, setIsEditingUOM] = useState<string | null>(null);
  const [editStock, setEditStock] = useState<number>(0);

  // Fetch product data
  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const response = await fetch(`http://localhost:8788/api/products/${productId}`);
      if (!response.ok) throw new Error('Failed to fetch product');
      return response.json() as Promise<Product>;
    },
  });

  // Update UOM mutation
  const updateUOMMutation = useMutation({
    mutationFn: async ({ uomId, stock }: { uomId: string; stock: number }) => {
      return api.productUOMs.updateProductUOM(uomId, { stock });
    },
    onSuccess: () => {
      // ✅ KEY FIX: Invalidate query to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      toast.success('UOM updated successfully');
      setIsEditingUOM(null);
    },
    onError: (error: Error) => {
      toast.error('Failed to update UOM', {
        description: error.message,
      });
    },
  });

  const handleUpdateUOM = (uomId: string) => {
    updateUOMMutation.mutate({ uomId, stock: editStock });
  };

  if (isLoading) return <div>Loading...</div>;
  if (!product) return <div>Product not found</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">{product.name}</h2>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Product UOMs</h3>
        {product.productUOMs.map((uom) => (
          <div key={uom.id} className="flex items-center gap-4 p-3 border rounded">
            <div className="flex-1">
              <p className="font-medium">{uom.uomName}</p>
              <p className="text-sm text-gray-600">
                Code: {uom.uomCode} | Barcode: {uom.barcode}
              </p>
            </div>

            {isEditingUOM === uom.id ? (
              <>
                <input
                  type="number"
                  value={editStock}
                  onChange={(e) => setEditStock(Number(e.target.value))}
                  className="border rounded px-2 py-1"
                />
                <button
                  onClick={() => handleUpdateUOM(uom.id)}
                  disabled={updateUOMMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                  {updateUOMMutation.isPending ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setIsEditingUOM(null)}
                  className="px-4 py-2 bg-gray-300 rounded"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <p className="font-semibold">Stock: {uom.stock}</p>
                <button
                  onClick={() => {
                    setIsEditingUOM(uom.id);
                    setEditStock(uom.stock);
                  }}
                  className="px-4 py-2 bg-gray-100 rounded"
                >
                  Edit
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Common Mistakes to Avoid

### ❌ Mistake 1: Not invalidating the query

```typescript
const updateUOMMutation = useMutation({
  mutationFn: updateProductUOM,
  onSuccess: () => {
    toast.success('Updated'); // ❌ No refetch!
  },
});
```

### ✅ Correct:

```typescript
const updateUOMMutation = useMutation({
  mutationFn: updateProductUOM,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['product', productId] });
    toast.success('Updated');
  },
});
```

### ❌ Mistake 2: Wrong query key

```typescript
// Fetch uses one key
useQuery({ queryKey: ['product', productId], ... });

// But invalidate uses different key
queryClient.invalidateQueries({ queryKey: ['products'] }); // ❌ Wrong key!
```

### ✅ Correct:

```typescript
// Same key for both
useQuery({ queryKey: ['product', productId], ... });
queryClient.invalidateQueries({ queryKey: ['product', productId] }); // ✅ Matching key
```

### ❌ Mistake 3: Updating local state instead of refetching

```typescript
const handleUpdate = async () => {
  await updateProductUOM(uomId, data);
  // ❌ Manually updating local state
  setProduct(prev => ({
    ...prev,
    productUOMs: prev.productUOMs.map(uom =>
      uom.id === uomId ? { ...uom, ...data } : uom
    ),
  }));
};
```

### ✅ Correct:

```typescript
const handleUpdate = async () => {
  await updateProductUOM(uomId, data);
  // ✅ Let React Query refetch from server
  queryClient.invalidateQueries({ queryKey: ['product', productId] });
};
```

## Next Steps

1. **Find the component** experiencing the issue
2. **Apply Pattern 1 or 2** from above
3. **Test the workflow** (view → edit → update → view refreshes)
4. **Commit the fix** with message: "fix: Refresh product view after UOM update"

## Related Files

- Backend API Client: `apps/admin-dashboard/src/lib/api.ts`
- UOM Update Endpoint: `services/product-service/src/infrastructure/http/routes/uoms.ts:199`
- Product GET Endpoint: `services/product-service/src/infrastructure/http/routes/products.ts:76`

## Questions?

If you're having trouble finding the component or implementing the fix, check:
1. Browser DevTools Network tab - look for API calls being made
2. React DevTools - find which component is rendering the product view
3. Search codebase for `productUOMs` to find where UOMs are displayed
