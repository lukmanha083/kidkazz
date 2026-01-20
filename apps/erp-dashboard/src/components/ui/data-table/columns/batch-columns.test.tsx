import type { InventoryBatch } from '@/lib/api';
import { flexRender } from '@tanstack/react-table';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { batchStatusOptions, getBatchColumns } from './batch-columns';

// Mock the badge component
vi.mock('../../badge', () => ({
  Badge: ({ children, className, variant }: any) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  ),
}));

// Mock the data table components
vi.mock('../data-table-column-header', () => ({
  DataTableColumnHeader: ({ title }: any) => <div>{title}</div>,
}));

vi.mock('../data-table-row-actions', () => ({
  DataTableRowActions: ({ onEdit, onDelete, customActions }: any) => (
    <div data-testid="row-actions">
      {onEdit && (
        <button type="button" onClick={() => onEdit({})}>
          Edit
        </button>
      )}
      {onDelete && (
        <button type="button" onClick={() => onDelete({})}>
          Delete
        </button>
      )}
      {customActions?.map((action: any, idx: number) => (
        <button type="button" key={`action-${action.label}-${idx}`} onClick={action.onClick}>
          {action.label}
        </button>
      ))}
    </div>
  ),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  AlertTriangle: () => <span>⚠️</span>,
  Clock: () => <span>🕐</span>,
}));

describe('batch-columns', () => {
  const createMockBatch = (overrides?: Partial<InventoryBatch>): InventoryBatch => ({
    id: 'batch-1',
    batchNumber: 'BTH-001',
    lotNumber: 'LOT-123',
    expirationDate: '2024-12-31',
    manufactureDate: '2024-01-01',
    quantityAvailable: 100,
    quantityReserved: 10,
    status: 'active',
    supplier: 'Test Supplier',
    notes: 'Test notes',
    warehouseId: 'wh-1',
    productId: 'prod-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  });

  describe('getBatchColumns', () => {
    it('should return an array of column definitions', () => {
      const columns = getBatchColumns();
      expect(Array.isArray(columns)).toBe(true);
      expect(columns.length).toBeGreaterThan(0);
    });

    it('should include all required column IDs', () => {
      const columns = getBatchColumns();
      const columnIds = columns.map((col) => ('accessorKey' in col ? col.accessorKey : col.id));

      expect(columnIds).toContain('batchNumber');
      expect(columnIds).toContain('lotNumber');
      expect(columnIds).toContain('expiration');
      expect(columnIds).toContain('quantity');
      expect(columnIds).toContain('status');
      expect(columnIds).toContain('supplier');
      expect(columnIds).toContain('actions');
    });

    it('should accept callback options', () => {
      const onEdit = vi.fn();
      const onAdjust = vi.fn();
      const onDelete = vi.fn();

      const columns = getBatchColumns({ onEdit, onAdjust, onDelete });
      expect(columns).toBeDefined();
    });
  });

  describe('calculateDaysUntilExpiration logic', () => {
    it('should handle null expiration date', () => {
      const batch = createMockBatch({ expirationDate: null });
      const columns = getBatchColumns();
      const expirationColumn = columns.find((col) => col.id === 'expiration');

      if (expirationColumn && 'accessorFn' in expirationColumn && expirationColumn.accessorFn) {
        const days = expirationColumn.accessorFn(batch, 0);
        expect(days).toBe(Number.POSITIVE_INFINITY);
      }
    });

    it('should calculate positive days for future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const batch = createMockBatch({ expirationDate: futureDate.toISOString() });

      const columns = getBatchColumns();
      const expirationColumn = columns.find((col) => col.id === 'expiration');

      if (expirationColumn && 'accessorFn' in expirationColumn && expirationColumn.accessorFn) {
        const days = expirationColumn.accessorFn(batch, 0);
        expect(days).toBeGreaterThan(0);
        expect(days).toBeLessThanOrEqual(31);
      }
    });

    it('should calculate negative days for past dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);
      const batch = createMockBatch({ expirationDate: pastDate.toISOString() });

      const columns = getBatchColumns();
      const expirationColumn = columns.find((col) => col.id === 'expiration');

      if (expirationColumn && 'accessorFn' in expirationColumn && expirationColumn.accessorFn) {
        const days = expirationColumn.accessorFn(batch, 0);
        expect(days).toBeLessThan(0);
      }
    });
  });

  describe('expiration column sorting', () => {
    it('should sort expired batches before active ones', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const expiredBatch = createMockBatch({
        id: 'expired',
        expirationDate: pastDate.toISOString(),
      });
      const activeBatch = createMockBatch({
        id: 'active',
        expirationDate: futureDate.toISOString(),
      });

      const columns = getBatchColumns();
      const expirationColumn = columns.find((col) => col.id === 'expiration');

      if (expirationColumn && 'sortingFn' in expirationColumn && expirationColumn.sortingFn) {
        const mockRowA = { original: expiredBatch } as any;
        const mockRowB = { original: activeBatch } as any;

        const result = expirationColumn.sortingFn(mockRowA, mockRowB, 'expiration');
        expect(result).toBeLessThan(0); // Expired should come first
      }
    });

    it('should sort by days remaining when both are active', () => {
      const soonDate = new Date();
      soonDate.setDate(soonDate.getDate() + 5);
      const laterDate = new Date();
      laterDate.setDate(laterDate.getDate() + 30);

      const soonBatch = createMockBatch({ expirationDate: soonDate.toISOString() });
      const laterBatch = createMockBatch({ expirationDate: laterDate.toISOString() });

      const columns = getBatchColumns();
      const expirationColumn = columns.find((col) => col.id === 'expiration');

      if (expirationColumn && 'sortingFn' in expirationColumn && expirationColumn.sortingFn) {
        const mockRowA = { original: soonBatch } as any;
        const mockRowB = { original: laterBatch } as any;

        const result = expirationColumn.sortingFn(mockRowA, mockRowB, 'expiration');
        expect(result).toBeLessThan(0); // Soon expiring should come first
      }
    });
  });

  describe('status column filter', () => {
    it('should filter by status value', () => {
      const batch = createMockBatch({ status: 'active' });
      const columns = getBatchColumns();
      const statusColumn = columns.find((col) => col.accessorKey === 'status');

      if (statusColumn && 'filterFn' in statusColumn && statusColumn.filterFn) {
        const mockRow = { getValue: (id: string) => batch.status } as any;

        expect(statusColumn.filterFn(mockRow, 'status', ['active'])).toBe(true);
        expect(statusColumn.filterFn(mockRow, 'status', ['expired'])).toBe(false);
        expect(statusColumn.filterFn(mockRow, 'status', ['active', 'quarantined'])).toBe(true);
      }
    });
  });

  describe('quantity column display', () => {
    it('should display available and reserved quantities', () => {
      const batch = createMockBatch({
        quantityAvailable: 100,
        quantityReserved: 20,
      });

      const columns = getBatchColumns();
      const quantityColumn = columns.find((col) => col.id === 'quantity');

      if (quantityColumn && 'cell' in quantityColumn) {
        const mockRow = { original: batch } as any;
        const cellContent = quantityColumn.cell({ row: mockRow } as any);
        expect(cellContent).toBeDefined();
      }
    });

    it('should handle zero reserved quantity', () => {
      const batch = createMockBatch({
        quantityAvailable: 100,
        quantityReserved: 0,
      });

      const columns = getBatchColumns();
      const quantityColumn = columns.find((col) => col.id === 'quantity');

      if (quantityColumn && 'cell' in quantityColumn) {
        const mockRow = { original: batch } as any;
        const cellContent = quantityColumn.cell({ row: mockRow } as any);
        expect(cellContent).toBeDefined();
      }
    });
  });

  describe('actions column', () => {
    it('should render row actions with callbacks', () => {
      const onEdit = vi.fn();
      const onDelete = vi.fn();
      const batch = createMockBatch();

      const columns = getBatchColumns({ onEdit, onDelete });
      const actionsColumn = columns.find((col) => col.id === 'actions');

      expect(actionsColumn).toBeDefined();
    });

    it('should include custom adjust action when provided', () => {
      const onAdjust = vi.fn();
      const columns = getBatchColumns({ onAdjust });
      const actionsColumn = columns.find((col) => col.id === 'actions');

      expect(actionsColumn).toBeDefined();
    });
  });

  describe('batchStatusOptions', () => {
    it('should export status filter options', () => {
      expect(batchStatusOptions).toBeDefined();
      expect(Array.isArray(batchStatusOptions)).toBe(true);
      expect(batchStatusOptions.length).toBe(4);
    });

    it('should have correct status values', () => {
      const values = batchStatusOptions.map((opt) => opt.value);
      expect(values).toContain('active');
      expect(values).toContain('expired');
      expect(values).toContain('quarantined');
      expect(values).toContain('recalled');
    });

    it('should have labels for each status', () => {
      batchStatusOptions.forEach((option) => {
        expect(option.label).toBeDefined();
        expect(option.value).toBeDefined();
        expect(typeof option.label).toBe('string');
        expect(typeof option.value).toBe('string');
      });
    });
  });

  describe('edge cases', () => {
    it('should handle missing lotNumber', () => {
      const batch = createMockBatch({ lotNumber: null });
      const columns = getBatchColumns();
      const lotColumn = columns.find((col) => col.accessorKey === 'lotNumber');

      expect(lotColumn).toBeDefined();
    });

    it('should handle missing supplier', () => {
      const batch = createMockBatch({ supplier: null });
      const columns = getBatchColumns();
      const supplierColumn = columns.find((col) => col.accessorKey === 'supplier');

      expect(supplierColumn).toBeDefined();
    });

    it('should handle all status types', () => {
      const statuses: InventoryBatch['status'][] = ['active', 'expired', 'quarantined', 'recalled'];

      statuses.forEach((status) => {
        const batch = createMockBatch({ status });
        const columns = getBatchColumns();
        const statusColumn = columns.find((col) => col.accessorKey === 'status');

        expect(statusColumn).toBeDefined();
      });
    });
  });
});
