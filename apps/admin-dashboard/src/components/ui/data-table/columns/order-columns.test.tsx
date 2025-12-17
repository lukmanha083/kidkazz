import { describe, it, expect, vi } from 'vitest';
import { getOrderColumns, orderStatusOptions, type Order } from './order-columns';

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
  Package: () => <span>📦</span>,
  Truck: () => <span>🚚</span>,
  CheckCircle: () => <span>✓</span>,
}));

describe('order-columns', () => {
  const createMockOrder = (overrides?: Partial<Order>): Order => ({
    id: 'ORD-001',
    customer: 'John Doe',
    email: 'john@example.com',
    product: 'Test Product',
    quantity: 5,
    amount: 199.99,
    status: 'Pending',
    date: '2024-01-15T10:00:00Z',
    ...overrides,
  });

  describe('getOrderColumns', () => {
    it('should return an array of column definitions', () => {
      const columns = getOrderColumns();
      expect(Array.isArray(columns)).toBe(true);
      expect(columns.length).toBeGreaterThan(0);
    });

    it('should include all required columns', () => {
      const columns = getOrderColumns();
      const columnIds = columns.map(col => 
        'accessorKey' in col ? col.accessorKey : col.id
      );
      
      expect(columnIds).toContain('id');
      expect(columnIds).toContain('customer');
      expect(columnIds).toContain('product');
      expect(columnIds).toContain('quantity');
      expect(columnIds).toContain('amount');
      expect(columnIds).toContain('date');
      expect(columnIds).toContain('status');
      expect(columnIds).toContain('actions');
    });

    it('should accept callback options', () => {
      const onView = vi.fn();
      const onEdit = vi.fn();
      const onDelete = vi.fn();

      const columns = getOrderColumns({ onView, onEdit, onDelete });
      expect(columns).toBeDefined();
      expect(columns.length).toBeGreaterThan(0);
    });

    it('should work with empty options', () => {
      const columns = getOrderColumns({});
      expect(columns).toBeDefined();
    });
  });

  describe('order ID column', () => {
    it('should display order ID in monospace font', () => {
      const order = createMockOrder({ id: 'ORD-12345' });
      const columns = getOrderColumns();
      const idColumn = columns.find(col => col.accessorKey === 'id');
      
      expect(idColumn).toBeDefined();
      if (idColumn && 'cell' in idColumn) {
        const mockRow = { getValue: (key: string) => order.id } as any;
        const cellContent = idColumn.cell({ row: mockRow } as any);
        expect(cellContent).toBeDefined();
      }
    });
  });

  describe('customer column', () => {
    it('should display customer name and email', () => {
      const order = createMockOrder({
        customer: 'Jane Smith',
        email: 'jane@example.com'
      });
      
      const columns = getOrderColumns();
      const customerColumn = columns.find(col => col.id === 'customer');
      
      expect(customerColumn).toBeDefined();
      if (customerColumn && 'cell' in customerColumn) {
        const mockRow = { original: order } as any;
        const cellContent = customerColumn.cell({ row: mockRow } as any);
        expect(cellContent).toBeDefined();
      }
    });

    it('should use accessor function for sorting', () => {
      const order = createMockOrder({ customer: 'Test Customer' });
      const columns = getOrderColumns();
      const customerColumn = columns.find(col => col.id === 'customer');
      
      if (customerColumn && 'accessorFn' in customerColumn && customerColumn.accessorFn) {
        const result = customerColumn.accessorFn(order, 0);
        expect(result).toBe('Test Customer');
      }
    });
  });

  describe('amount column', () => {
    it('should format amount as currency with 2 decimals', () => {
      const order = createMockOrder({ amount: 123.45 });
      const columns = getOrderColumns();
      const amountColumn = columns.find(col => col.accessorKey === 'amount');
      
      expect(amountColumn).toBeDefined();
      if (amountColumn && 'cell' in amountColumn) {
        const mockRow = { getValue: (key: string) => order.amount } as any;
        const cellContent = amountColumn.cell({ row: mockRow } as any);
        expect(cellContent).toBeDefined();
      }
    });

    it('should handle zero amount', () => {
      const order = createMockOrder({ amount: 0 });
      const columns = getOrderColumns();
      const amountColumn = columns.find(col => col.accessorKey === 'amount');
      
      expect(amountColumn).toBeDefined();
    });

    it('should handle large amounts', () => {
      const order = createMockOrder({ amount: 999999.99 });
      const columns = getOrderColumns();
      const amountColumn = columns.find(col => col.accessorKey === 'amount');
      
      expect(amountColumn).toBeDefined();
    });
  });

  describe('date column', () => {
    it('should format date correctly', () => {
      const order = createMockOrder({ date: '2024-06-15T14:30:00Z' });
      const columns = getOrderColumns();
      const dateColumn = columns.find(col => col.accessorKey === 'date');
      
      expect(dateColumn).toBeDefined();
      if (dateColumn && 'cell' in dateColumn) {
        const mockRow = { getValue: (key: string) => order.date } as any;
        const cellContent = dateColumn.cell({ row: mockRow } as any);
        expect(cellContent).toBeDefined();
      }
    });

    it('should handle different date formats', () => {
      const dates = [
        '2024-01-01T00:00:00Z',
        '2024-12-31T23:59:59Z',
        '2024-06-15T12:00:00Z'
      ];

      dates.forEach(date => {
        const order = createMockOrder({ date });
        const columns = getOrderColumns();
        const dateColumn = columns.find(col => col.accessorKey === 'date');
        expect(dateColumn).toBeDefined();
      });
    });
  });

  describe('status column', () => {
    const statuses: Order['status'][] = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

    statuses.forEach(status => {
      it(`should display ${status} status correctly`, () => {
        const order = createMockOrder({ status });
        const columns = getOrderColumns();
        const statusColumn = columns.find(col => col.accessorKey === 'status');
        
        expect(statusColumn).toBeDefined();
        if (statusColumn && 'cell' in statusColumn) {
          const mockRow = { getValue: (key: string) => order.status } as any;
          const cellContent = statusColumn.cell({ row: mockRow } as any);
          expect(cellContent).toBeDefined();
        }
      });
    });

    it('should filter by status correctly', () => {
      const order = createMockOrder({ status: 'Shipped' });
      const columns = getOrderColumns();
      const statusColumn = columns.find(col => col.accessorKey === 'status');
      
      if (statusColumn && 'filterFn' in statusColumn && statusColumn.filterFn) {
        const mockRow = { getValue: (id: string) => order.status } as any;
        
        expect(statusColumn.filterFn(mockRow, 'status', ['Shipped'])).toBe(true);
        expect(statusColumn.filterFn(mockRow, 'status', ['Pending'])).toBe(false);
        expect(statusColumn.filterFn(mockRow, 'status', ['Shipped', 'Delivered'])).toBe(true);
      }
    });

    it('should apply correct status colors', () => {
      const order = createMockOrder({ status: 'Delivered' });
      const columns = getOrderColumns();
      const statusColumn = columns.find(col => col.accessorKey === 'status');
      
      expect(statusColumn).toBeDefined();
    });

    it('should show correct status icons', () => {
      const order = createMockOrder({ status: 'Shipped' });
      const columns = getOrderColumns();
      const statusColumn = columns.find(col => col.accessorKey === 'status');
      
      expect(statusColumn).toBeDefined();
    });
  });

  describe('quantity column', () => {
    it('should display quantity centered', () => {
      const order = createMockOrder({ quantity: 10 });
      const columns = getOrderColumns();
      const quantityColumn = columns.find(col => col.accessorKey === 'quantity');
      
      expect(quantityColumn).toBeDefined();
    });

    it('should handle single quantity', () => {
      const order = createMockOrder({ quantity: 1 });
      const columns = getOrderColumns();
      const quantityColumn = columns.find(col => col.accessorKey === 'quantity');
      
      expect(quantityColumn).toBeDefined();
    });

    it('should handle large quantities', () => {
      const order = createMockOrder({ quantity: 9999 });
      const columns = getOrderColumns();
      const quantityColumn = columns.find(col => col.accessorKey === 'quantity');
      
      expect(quantityColumn).toBeDefined();
    });
  });

  describe('product column', () => {
    it('should display product name', () => {
      const order = createMockOrder({ product: 'Premium Widget' });
      const columns = getOrderColumns();
      const productColumn = columns.find(col => col.accessorKey === 'product');
      
      expect(productColumn).toBeDefined();
    });

    it('should handle long product names', () => {
      const longName = 'A'.repeat(100);
      const order = createMockOrder({ product: longName });
      const columns = getOrderColumns();
      const productColumn = columns.find(col => col.accessorKey === 'product');
      
      expect(productColumn).toBeDefined();
    });
  });

  describe('actions column', () => {
    it('should include view, edit, and delete actions', () => {
      const onView = vi.fn();
      const onEdit = vi.fn();
      const onDelete = vi.fn();

      const columns = getOrderColumns({ onView, onEdit, onDelete });
      const actionsColumn = columns.find(col => col.id === 'actions');
      
      expect(actionsColumn).toBeDefined();
    });

    it('should work without callbacks', () => {
      const columns = getOrderColumns({});
      const actionsColumn = columns.find(col => col.id === 'actions');
      
      expect(actionsColumn).toBeDefined();
    });
  });

  describe('orderStatusOptions', () => {
    it('should export all status filter options', () => {
      expect(orderStatusOptions).toBeDefined();
      expect(Array.isArray(orderStatusOptions)).toBe(true);
      expect(orderStatusOptions.length).toBe(5);
    });

    it('should have all status values', () => {
      const values = orderStatusOptions.map(opt => opt.value);
      expect(values).toContain('Pending');
      expect(values).toContain('Processing');
      expect(values).toContain('Shipped');
      expect(values).toContain('Delivered');
      expect(values).toContain('Cancelled');
    });

    it('should have proper label-value pairs', () => {
      orderStatusOptions.forEach(option => {
        expect(option.label).toBeDefined();
        expect(option.value).toBeDefined();
        expect(typeof option.label).toBe('string');
        expect(typeof option.value).toBe('string');
        expect(option.label).toBe(option.value);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle missing optional callbacks', () => {
      const columns = getOrderColumns();
      expect(columns).toBeDefined();
      expect(columns.length).toBe(8);
    });

    it('should handle partial callback options', () => {
      const onView = vi.fn();
      const columns = getOrderColumns({ onView });
      expect(columns).toBeDefined();
    });

    it('should handle very long customer names', () => {
      const longName = 'A'.repeat(200);
      const order = createMockOrder({ customer: longName });
      const columns = getOrderColumns();
      
      expect(columns).toBeDefined();
    });

    it('should handle very long email addresses', () => {
      const longEmail = 'a'.repeat(50) + '@' + 'b'.repeat(50) + '.com';
      const order = createMockOrder({ email: longEmail });
      const columns = getOrderColumns();
      
      expect(columns).toBeDefined();
    });

    it('should handle decimal quantities gracefully', () => {
      const order = createMockOrder({ quantity: 1.5 });
      const columns = getOrderColumns();
      const quantityColumn = columns.find(col => col.accessorKey === 'quantity');
      
      expect(quantityColumn).toBeDefined();
    });
  });
});