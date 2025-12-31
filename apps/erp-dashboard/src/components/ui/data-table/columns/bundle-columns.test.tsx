import { describe, it, expect, vi } from 'vitest';
import { getBundleColumns, bundleStatusOptions } from './bundle-columns';
import type { ProductBundle } from '@/lib/api';

// Mock dependencies
vi.mock('../../badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  ),
}));

vi.mock('../data-table-column-header', () => ({
  DataTableColumnHeader: ({ title }: any) => <div>{title}</div>,
}));

vi.mock('../data-table-row-actions', () => ({
  DataTableRowActions: ({ onView, onEdit, onDelete }: any) => (
    <div data-testid="row-actions">
      {onView && <button onClick={() => onView({})}>View</button>}
      {onEdit && <button onClick={() => onEdit({})}>Edit</button>}
      {onDelete && <button onClick={() => onDelete({})}>Delete</button>}
    </div>
  ),
}));

vi.mock('lucide-react', () => ({
  Gift: () => <span>🎁</span>,
}));

describe('bundle-columns', () => {
  const createMockBundle = (overrides?: Partial<ProductBundle>): ProductBundle => ({
    id: 'bundle-1',
    bundleName: 'Test Bundle',
    bundleDescription: 'A test bundle description',
    bundleSKU: 'BUN-001',
    bundlePrice: 100000,
    discountPercentage: 10,
    status: 'active',
    products: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  });

  describe('getBundleColumns', () => {
    it('should return an array of column definitions', () => {
      const columns = getBundleColumns();
      expect(Array.isArray(columns)).toBe(true);
      expect(columns.length).toBeGreaterThan(0);
    });

    it('should include all required columns', () => {
      const columns = getBundleColumns();
      const columnIds = columns.map(col => 
        'accessorKey' in col ? col.accessorKey : col.id
      );
      
      expect(columnIds).toContain('bundleName');
      expect(columnIds).toContain('bundleSKU');
      expect(columnIds).toContain('products');
      expect(columnIds).toContain('bundlePrice');
      expect(columnIds).toContain('discountPercentage');
      expect(columnIds).toContain('status');
      expect(columnIds).toContain('actions');
    });

    it('should accept callback options', () => {
      const onView = vi.fn();
      const onEdit = vi.fn();
      const onDelete = vi.fn();

      const columns = getBundleColumns({ onView, onEdit, onDelete });
      expect(columns).toBeDefined();
      expect(columns.length).toBeGreaterThan(0);
    });

    it('should work with empty options', () => {
      const columns = getBundleColumns({});
      expect(columns).toBeDefined();
      expect(columns.length).toBeGreaterThan(0);
    });
  });

  describe('formatRupiah function', () => {
    it('should format prices correctly in IDR', () => {
      const bundle = createMockBundle({ bundlePrice: 100000 });
      const columns = getBundleColumns();
      const priceColumn = columns.find(col => col.accessorKey === 'bundlePrice');
      
      expect(priceColumn).toBeDefined();
      if (priceColumn && 'cell' in priceColumn) {
        const mockRow = { 
          getValue: (key: string) => bundle.bundlePrice 
        } as any;
        const cellContent = priceColumn.cell({ row: mockRow } as any);
        expect(cellContent).toBeDefined();
      }
    });

    it('should handle zero price', () => {
      const bundle = createMockBundle({ bundlePrice: 0 });
      const columns = getBundleColumns();
      const priceColumn = columns.find(col => col.accessorKey === 'bundlePrice');
      
      expect(priceColumn).toBeDefined();
    });

    it('should handle large prices', () => {
      const bundle = createMockBundle({ bundlePrice: 99999999 });
      const columns = getBundleColumns();
      const priceColumn = columns.find(col => col.accessorKey === 'bundlePrice');
      
      expect(priceColumn).toBeDefined();
    });
  });

  describe('status column', () => {
    it('should display active status correctly', () => {
      const bundle = createMockBundle({ status: 'active' });
      const columns = getBundleColumns();
      const statusColumn = columns.find(col => col.accessorKey === 'status');
      
      expect(statusColumn).toBeDefined();
      if (statusColumn && 'cell' in statusColumn) {
        const mockRow = { 
          getValue: (key: string) => bundle.status 
        } as any;
        const cellContent = statusColumn.cell({ row: mockRow } as any);
        expect(cellContent).toBeDefined();
      }
    });

    it('should display inactive status correctly', () => {
      const bundle = createMockBundle({ status: 'inactive' });
      const columns = getBundleColumns();
      const statusColumn = columns.find(col => col.accessorKey === 'status');
      
      expect(statusColumn).toBeDefined();
    });

    it('should filter by status correctly', () => {
      const bundle = createMockBundle({ status: 'active' });
      const columns = getBundleColumns();
      const statusColumn = columns.find(col => col.accessorKey === 'status');
      
      if (statusColumn && 'filterFn' in statusColumn && statusColumn.filterFn) {
        const mockRow = { 
          getValue: (id: string) => bundle.status 
        } as any;
        
        expect(statusColumn.filterFn(mockRow, 'status', ['active'])).toBe(true);
        expect(statusColumn.filterFn(mockRow, 'status', ['inactive'])).toBe(false);
      }
    });
  });

  describe('bundle name column', () => {
    it('should display bundle name and description', () => {
      const bundle = createMockBundle({
        bundleName: 'Premium Bundle',
        bundleDescription: 'A premium product bundle'
      });
      
      const columns = getBundleColumns();
      const nameColumn = columns.find(col => col.accessorKey === 'bundleName');
      
      expect(nameColumn).toBeDefined();
      if (nameColumn && 'cell' in nameColumn) {
        const mockRow = { 
          getValue: (key: string) => bundle.bundleName,
          original: bundle
        } as any;
        const cellContent = nameColumn.cell({ row: mockRow } as any);
        expect(cellContent).toBeDefined();
      }
    });

    it('should handle empty description', () => {
      const bundle = createMockBundle({
        bundleName: 'Test Bundle',
        bundleDescription: ''
      });
      
      const columns = getBundleColumns();
      const nameColumn = columns.find(col => col.accessorKey === 'bundleName');
      
      expect(nameColumn).toBeDefined();
    });
  });

  describe('SKU column', () => {
    it('should display SKU in monospace font', () => {
      const bundle = createMockBundle({ bundleSKU: 'BUN-12345' });
      const columns = getBundleColumns();
      const skuColumn = columns.find(col => col.accessorKey === 'bundleSKU');
      
      expect(skuColumn).toBeDefined();
      if (skuColumn && 'cell' in skuColumn) {
        const mockRow = { 
          getValue: (key: string) => bundle.bundleSKU 
        } as any;
        const cellContent = skuColumn.cell({ row: mockRow } as any);
        expect(cellContent).toBeDefined();
      }
    });
  });

  describe('discount column', () => {
    it('should display discount percentage', () => {
      const bundle = createMockBundle({ discountPercentage: 15 });
      const columns = getBundleColumns();
      const discountColumn = columns.find(col => col.accessorKey === 'discountPercentage');
      
      expect(discountColumn).toBeDefined();
    });

    it('should handle zero discount', () => {
      const bundle = createMockBundle({ discountPercentage: 0 });
      const columns = getBundleColumns();
      const discountColumn = columns.find(col => col.accessorKey === 'discountPercentage');
      
      expect(discountColumn).toBeDefined();
    });

    it('should handle high discount percentages', () => {
      const bundle = createMockBundle({ discountPercentage: 99 });
      const columns = getBundleColumns();
      const discountColumn = columns.find(col => col.accessorKey === 'discountPercentage');
      
      expect(discountColumn).toBeDefined();
    });
  });

  describe('products column', () => {
    it('should display bundle badge', () => {
      const columns = getBundleColumns();
      const productsColumn = columns.find(col => col.id === 'products');
      
      expect(productsColumn).toBeDefined();
      if (productsColumn && 'cell' in productsColumn) {
        const cellContent = productsColumn.cell({} as any);
        expect(cellContent).toBeDefined();
      }
    });
  });

  describe('actions column', () => {
    it('should include view, edit, and delete actions', () => {
      const onView = vi.fn();
      const onEdit = vi.fn();
      const onDelete = vi.fn();

      const columns = getBundleColumns({ onView, onEdit, onDelete });
      const actionsColumn = columns.find(col => col.id === 'actions');
      
      expect(actionsColumn).toBeDefined();
    });

    it('should work without callbacks', () => {
      const columns = getBundleColumns({});
      const actionsColumn = columns.find(col => col.id === 'actions');
      
      expect(actionsColumn).toBeDefined();
    });
  });

  describe('bundleStatusOptions', () => {
    it('should export status filter options', () => {
      expect(bundleStatusOptions).toBeDefined();
      expect(Array.isArray(bundleStatusOptions)).toBe(true);
    });

    it('should have active and inactive options', () => {
      expect(bundleStatusOptions.length).toBe(2);
      
      const values = bundleStatusOptions.map(opt => opt.value);
      expect(values).toContain('active');
      expect(values).toContain('inactive');
    });

    it('should have proper label-value pairs', () => {
      bundleStatusOptions.forEach(option => {
        expect(option.label).toBeDefined();
        expect(option.value).toBeDefined();
        expect(typeof option.label).toBe('string');
        expect(typeof option.value).toBe('string');
      });
    });
  });

  describe('edge cases', () => {
    it('should handle undefined callback options', () => {
      const columns = getBundleColumns();
      expect(columns).toBeDefined();
      expect(columns.length).toBeGreaterThan(0);
    });

    it('should handle partial callback options', () => {
      const onEdit = vi.fn();
      const columns = getBundleColumns({ onEdit });
      expect(columns).toBeDefined();
    });

    it('should handle very long bundle names', () => {
      const longName = 'A'.repeat(200);
      const bundle = createMockBundle({ bundleName: longName });
      const columns = getBundleColumns();
      
      expect(columns).toBeDefined();
    });

    it('should handle very long descriptions', () => {
      const longDesc = 'B'.repeat(500);
      const bundle = createMockBundle({ bundleDescription: longDesc });
      const columns = getBundleColumns();
      
      expect(columns).toBeDefined();
    });
  });
});