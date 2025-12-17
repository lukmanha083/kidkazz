# Virtual Scrolling Guide

## Overview

This guide explains how to use virtual scrolling components for high-performance rendering of large datasets in the admin dashboard.

**Phase**: F5 - TanStack Virtual Integration (Complete)
**Related**: Frontend Refactoring Roadmap Phase F5

---

## When to Use Virtual Scrolling

### Use Cases by Dataset Size

| Component Type | Dataset Size | Recommended Approach |
|----------------|--------------|---------------------|
| **Small** | < 100 rows | Regular DataTable with pagination |
| **Medium** | 100-1,000 rows | DataTable with pagination (optional virtualization) |
| **Large** | 1,000-10,000 rows | **VirtualizedDataTable** (Recommended) |
| **Very Large** | 10,000+ rows | **VirtualizedDataTable** (Required) |

### Specific Use Cases (from Roadmap)

| Page/Feature | Typical Row Count | Component | Priority |
|--------------|------------------|-----------|----------|
| Product List | 100-1,000 | DataTable | Optional |
| Inventory List | 1,000-10,000 | **VirtualizedDataTable** | **Recommended** |
| Movement History | 10,000+ | **VirtualizedDataTable** | **Required** |
| Stock Opname Count | 1,000-5,000 | **VirtualizedDataTable** | **Recommended** |
| Batch Lists | 100-5,000 | VirtualizedDataTable (if > 1,000) | Optional |
| Transfer Items | 100-500 | DataTable | Optional |

---

## Available Components

### 1. VirtualTable

Simple virtualized table for custom use cases.

**Features:**
- Virtual scrolling for rows
- Sticky header support
- Custom row height
- Row click handlers
- Loading and empty states

**When to use:**
- Need a simple table without complex features
- Custom column definitions (non-TanStack Table)
- Don't need sorting, filtering, or pagination

```tsx
import { VirtualTable } from '@/components/ui/virtual-table';

interface Item {
  id: string;
  name: string;
  quantity: number;
}

function MyComponent() {
  const [items, setItems] = useState<Item[]>([]);

  return (
    <VirtualTable
      columns={[
        {
          header: "ID",
          accessor: "id"
        },
        {
          header: "Name",
          accessor: "name"
        },
        {
          header: "Quantity",
          accessor: (row) => <Badge>{row.quantity}</Badge>
        },
      ]}
      data={items}
      rowHeight={52}
      maxHeight="600px"
      onRowClick={(row) => console.log('Clicked:', row)}
      isLoading={false}
      stickyHeader={true}
    />
  );
}
```

---

### 2. VirtualList

Virtualized list for non-tabular data.

**Features:**
- Flexible item rendering
- Variable or fixed item heights
- Efficient for feeds, timelines, notifications

**When to use:**
- Movement history timeline
- Activity feeds
- Notification lists
- Chat messages
- Long dropdown lists

```tsx
import { VirtualList, VirtualListItem } from '@/components/ui/virtual-list';

interface Movement {
  id: string;
  type: string;
  quantity: number;
  timestamp: string;
}

function MovementHistory() {
  const [movements, setMovements] = useState<Movement[]>([]);

  return (
    <VirtualList
      items={movements}
      renderItem={(movement) => (
        <VirtualListItem>
          <div className="flex items-center justify-between w-full">
            <div>
              <p className="font-medium">{movement.type}</p>
              <p className="text-sm text-muted-foreground">
                {movement.timestamp}
              </p>
            </div>
            <Badge>{movement.quantity}</Badge>
          </div>
        </VirtualListItem>
      )}
      itemHeight={80}
      maxHeight="600px"
      gap={8}
      getItemKey={(item) => item.id}
    />
  );
}
```

---

### 3. VirtualizedDataTable (Recommended)

Full-featured TanStack Table with virtual scrolling.

**Features:**
- All TanStack Table features (sorting, filtering, column visibility)
- Virtual scrolling for performance
- Sticky header
- Toolbar with search and filters
- Row selection support

**When to use:**
- Need sorting, filtering, column visibility
- Large datasets (1,000+ rows)
- Want to replace paginated DataTable for better UX

```tsx
import { VirtualizedDataTable } from '@/components/ui/data-table/virtualized-data-table';
import { ColumnDef } from '@tanstack/react-table';

interface Batch {
  id: string;
  batchNumber: string;
  expirationDate: string;
  quantityAvailable: number;
  status: string;
}

function BatchList() {
  const [batches, setBatches] = useState<Batch[]>([]);

  const columns: ColumnDef<Batch>[] = [
    {
      accessorKey: "batchNumber",
      header: "Batch Number",
    },
    {
      accessorKey: "expirationDate",
      header: "Expiration Date",
      cell: ({ row }) => formatDate(row.original.expirationDate),
    },
    {
      accessorKey: "quantityAvailable",
      header: "Available",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <Badge>{row.original.status}</Badge>,
    },
  ];

  return (
    <VirtualizedDataTable
      columns={columns}
      data={batches}
      searchKey="batchNumber"
      searchPlaceholder="Search batches..."
      enableColumnVisibility
      enableRowSelection
      filterableColumns={[
        {
          id: "status",
          title: "Status",
          options: [
            { label: "Active", value: "active" },
            { label: "Expired", value: "expired" },
            { label: "Quarantined", value: "quarantined" },
          ],
        },
      ]}
      rowHeight={52}
      maxHeight="600px"
      onRowClick={(batch) => navigate(`/batch/${batch.id}`)}
    />
  );
}
```

---

## Migration from Regular DataTable

### Before (Paginated DataTable)

```tsx
<DataTable
  columns={columns}
  data={batches}
  searchKey="batchNumber"
  enablePagination
  pageSize={20}
/>
```

### After (Virtualized)

```tsx
<VirtualizedDataTable
  columns={columns}  // Same column definitions!
  data={batches}
  searchKey="batchNumber"
  rowHeight={52}
  maxHeight="600px"
/>
```

**Benefits:**
- ✅ No pagination needed - scroll through all items
- ✅ Better UX for large datasets
- ✅ Faster initial render
- ✅ Only visible rows in DOM
- ✅ Same TanStack Table features

---

## Performance Considerations

### Row Height

Choose appropriate row height based on content:

```tsx
// Simple row (1 line text)
rowHeight={48}

// Standard row (1-2 lines)
rowHeight={52}  // Default

// Dense row (multiple lines)
rowHeight={72}

// Complex row (images, badges)
rowHeight={80}
```

### Overscan

Number of rows to render outside viewport:

```tsx
// Minimal (faster, may show blank rows during fast scrolling)
overscan={5}

// Recommended (balanced)
overscan={10}  // Default

// Aggressive (smoother scrolling, slightly slower)
overscan={20}
```

### Max Height

Container height affects performance:

```tsx
// Small viewport (better performance)
maxHeight="400px"

// Recommended
maxHeight="600px"  // Default

// Large viewport (more rows rendered)
maxHeight="800px"

// Full height
maxHeight="calc(100vh - 200px)"
```

---

## Real-World Examples

### Example 1: Inventory Movement History

**Scenario**: Showing 10,000+ inventory movements
**Component**: VirtualList
**Why**: Timeline format, not tabular data

```tsx
import { VirtualList, VirtualListItem } from '@/components/ui/virtual-list';

function InventoryMovementHistory({ productId }: { productId: string }) {
  const { data: movements } = useQuery({
    queryKey: ['movements', productId],
    queryFn: () => movementApi.getHistory(productId),
  });

  return (
    <VirtualList
      items={movements || []}
      renderItem={(movement) => (
        <VirtualListItem>
          <div className="flex items-center gap-4 w-full">
            <MovementIcon type={movement.type} />
            <div className="flex-1">
              <p className="font-medium">{movement.type}</p>
              <p className="text-sm text-muted-foreground">
                {movement.reason}
              </p>
            </div>
            <div className="text-right">
              <p className={cn(
                "font-medium",
                movement.quantity > 0 ? "text-green-600" : "text-red-600"
              )}>
                {movement.quantity > 0 ? '+' : ''}{movement.quantity}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatDate(movement.timestamp)}
              </p>
            </div>
          </div>
        </VirtualListItem>
      )}
      itemHeight={80}
      maxHeight="600px"
      getItemKey={(m) => m.id}
      emptyMessage="No movements found"
    />
  );
}
```

### Example 2: Batch Management (Large Dataset)

**Scenario**: Managing 1,000-5,000 batches with FEFO sorting
**Component**: VirtualizedDataTable
**Why**: Need sorting, filtering, table format

```tsx
import { VirtualizedDataTable } from '@/components/ui/data-table/virtualized-data-table';

function BatchManagement() {
  const { data: batches } = useQuery({
    queryKey: ['batches'],
    queryFn: () => batchApi.getAll(),
  });

  // Sort by FEFO (First Expired, First Out)
  const sortedBatches = useMemo(() =>
    batches?.sort((a, b) => {
      const dateA = new Date(a.expirationDate || Infinity);
      const dateB = new Date(b.expirationDate || Infinity);
      return dateA.getTime() - dateB.getTime();
    }) || [],
    [batches]
  );

  return (
    <VirtualizedDataTable
      columns={batchColumns}
      data={sortedBatches}
      searchKey="batchNumber"
      searchPlaceholder="Search batches..."
      enableColumnVisibility
      filterableColumns={[
        {
          id: "status",
          title: "Status",
          options: [
            { label: "Active", value: "active" },
            { label: "Expired", value: "expired" },
            { label: "Quarantined", value: "quarantined" },
          ],
        },
      ]}
      rowHeight={60}
      maxHeight="calc(100vh - 400px)"
    />
  );
}
```

### Example 3: Stock Opname Counting Interface

**Scenario**: Physical inventory count for 1,000-5,000 items
**Component**: VirtualizedDataTable with custom cells
**Why**: Need editable cells, keyboard navigation

```tsx
function StockOpnameCount({ sessionId }: { sessionId: string }) {
  const { data: items } = useQuery({
    queryKey: ['opname-items', sessionId],
    queryFn: () => opnameApi.getItems(sessionId),
  });

  const columns: ColumnDef<OpnameItem>[] = [
    {
      accessorKey: "productSKU",
      header: "SKU",
    },
    {
      accessorKey: "productName",
      header: "Product",
    },
    {
      accessorKey: "systemQuantity",
      header: "System Count",
    },
    {
      id: "countedQuantity",
      header: "Physical Count",
      cell: ({ row }) => (
        <Input
          type="number"
          defaultValue={row.original.countedQuantity}
          onChange={(e) => handleCountUpdate(
            row.original.id,
            parseInt(e.target.value)
          )}
          className="w-24"
        />
      ),
    },
    {
      id: "variance",
      header: "Variance",
      cell: ({ row }) => {
        const variance =
          (row.original.countedQuantity || 0) -
          row.original.systemQuantity;
        return (
          <Badge
            variant={variance === 0 ? "outline" : "destructive"}
          >
            {variance > 0 ? '+' : ''}{variance}
          </Badge>
        );
      },
    },
  ];

  return (
    <VirtualizedDataTable
      columns={columns}
      data={items || []}
      searchKey="productSKU"
      searchPlaceholder="Scan or search SKU..."
      rowHeight={60}
      maxHeight="calc(100vh - 300px)"
    />
  );
}
```

---

## Best Practices

### ✅ Do

1. **Use virtualization for large datasets** (> 1,000 rows)
2. **Choose appropriate row height** based on content
3. **Use `getItemKey` or `getRowId`** for stable keys
4. **Enable sticky headers** for better navigation
5. **Provide loading and empty states**
6. **Use consistent row heights** for better performance
7. **Test with real data volumes** in your use case

### ❌ Don't

1. **Don't virtualize small datasets** (< 100 rows) - unnecessary overhead
2. **Don't use variable row heights** unless necessary (performance impact)
3. **Don't set maxHeight too large** - affects number of rendered rows
4. **Don't forget to memoize data** - re-sorting/filtering can be expensive
5. **Don't skip loading states** - poor UX during data fetch
6. **Don't use complex cell rendering** - keep cells lightweight
7. **Don't forget accessibility** - ensure keyboard navigation works

---

## Troubleshooting

### Problem: Blank rows during scrolling

**Solution**: Increase `overscan` prop

```tsx
<VirtualizedDataTable
  {...props}
  overscan={20}  // Increase from default 10
/>
```

### Problem: Scroll position jumps

**Solution**: Ensure consistent row heights

```tsx
// Bad - variable heights
rowHeight={(row) => row.type === 'large' ? 80 : 52}

// Good - fixed height
rowHeight={60}
```

### Problem: Poor performance with many columns

**Solution**: Reduce visible columns, use column visibility

```tsx
<VirtualizedDataTable
  {...props}
  enableColumnVisibility
  // Hide non-essential columns by default
/>
```

### Problem: Search/filter feels slow

**Solution**: Debounce search input, memoize filtered data

```tsx
const debouncedSearch = useDebouncedValue(search, 300);

const filteredData = useMemo(() =>
  data.filter(item =>
    item.name.includes(debouncedSearch)
  ),
  [data, debouncedSearch]
);
```

---

## Phase F5 Deliverables ✅

- [x] Install @tanstack/react-virtual
- [x] Create VirtualTable component
- [x] Create VirtualList component
- [x] Create VirtualizedDataTable (integrated with TanStack Table)
- [x] Export components from centralized index
- [x] Create documentation and usage examples
- [ ] Optimize inventory movement history (Phase 7/8 - pending backend)
- [ ] Optimize stock opname counting interface (Phase 8 - pending backend)

---

## Related Documentation

- [Frontend Refactoring Roadmap - Phase F5](../bounded-contexts/frontend/FRONTEND_REFACTORING_ROADMAP.md#phase-f5-tanstack-virtual-integration)
- [TanStack Virtual Docs](https://tanstack.com/virtual/latest)
- [TanStack Table Docs](https://tanstack.com/table/latest)

---

**Status**: Phase F5 Complete ✅
**Last Updated**: 2025-12-17
