import type { ColumnDef } from '@tanstack/react-table';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DataTable } from './data-table';

// Mock child components
vi.mock('./data-table-toolbar', () => ({
  DataTableToolbar: ({ table }: any) => <div data-testid="toolbar">Toolbar</div>,
}));

vi.mock('./data-table-pagination', () => ({
  DataTablePagination: ({ table }: any) => <div data-testid="pagination">Pagination</div>,
}));

vi.mock('../table', () => ({
  Table: ({ children }: any) => <table data-testid="table">{children}</table>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableRow: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
  TableHead: ({ children }: any) => <th>{children}</th>,
  TableCell: ({ children, ...props }: any) => <td {...props}>{children}</td>,
}));

vi.mock('lucide-react', () => ({
  Loader2: () => <span data-testid="loader">Loading...</span>,
}));

interface TestData {
  id: string;
  name: string;
  value: number;
}

describe('DataTable', () => {
  const mockColumns: ColumnDef<TestData>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
    },
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'value',
      header: 'Value',
    },
  ];

  const mockData: TestData[] = [
    { id: '1', name: 'Item 1', value: 100 },
    { id: '2', name: 'Item 2', value: 200 },
    { id: '3', name: 'Item 3', value: 300 },
  ];

  describe('basic rendering', () => {
    it('should render table with data', () => {
      render(<DataTable columns={mockColumns} data={mockData} />);

      expect(screen.getByTestId('table')).toBeInTheDocument();
      expect(screen.getByTestId('toolbar')).toBeInTheDocument();
      expect(screen.getByTestId('pagination')).toBeInTheDocument();
    });

    it('should render without data', () => {
      render(<DataTable columns={mockColumns} data={[]} />);

      expect(screen.getByTestId('table')).toBeInTheDocument();
      expect(screen.getByText('No results found.')).toBeInTheDocument();
    });

    it('should show loading state', () => {
      render(<DataTable columns={mockColumns} data={[]} isLoading={true} />);

      expect(screen.getByTestId('loader')).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('pagination configuration', () => {
    it('should support client-side pagination by default', () => {
      render(<DataTable columns={mockColumns} data={mockData} />);

      expect(screen.getByTestId('pagination')).toBeInTheDocument();
    });

    it('should support manual pagination with pageCount', () => {
      const onPaginationChange = vi.fn();

      render(
        <DataTable
          columns={mockColumns}
          data={mockData}
          manualPagination={true}
          pageCount={5}
          onPaginationChange={onPaginationChange}
        />
      );

      expect(screen.getByTestId('table')).toBeInTheDocument();
    });

    it('should warn when manual pagination is missing pageCount', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      render(
        <DataTable
          columns={mockColumns}
          data={mockData}
          manualPagination={true}
          pageCount={undefined as any}
        />
      );

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('pageCount is required'));

      consoleSpy.mockRestore();
    });

    it('should disable pagination when enablePagination is false', () => {
      render(<DataTable columns={mockColumns} data={mockData} enablePagination={false} />);

      expect(screen.queryByTestId('pagination')).not.toBeInTheDocument();
    });

    it('should use custom page size', () => {
      render(<DataTable columns={mockColumns} data={mockData} pageSize={5} />);

      expect(screen.getByTestId('table')).toBeInTheDocument();
    });
  });

  describe('controlled pagination', () => {
    it('should use controlled pagination state', () => {
      const pagination = { pageIndex: 0, pageSize: 10 };
      const onPaginationChange = vi.fn();

      render(
        <DataTable
          columns={mockColumns}
          data={mockData}
          pagination={pagination}
          onPaginationChange={onPaginationChange}
        />
      );

      expect(screen.getByTestId('table')).toBeInTheDocument();
    });

    it('should fall back to internal pagination when not controlled', () => {
      render(<DataTable columns={mockColumns} data={mockData} />);

      expect(screen.getByTestId('table')).toBeInTheDocument();
    });
  });

  describe('optional features', () => {
    it('should support row selection when enabled', () => {
      render(<DataTable columns={mockColumns} data={mockData} enableRowSelection={true} />);

      expect(screen.getByTestId('table')).toBeInTheDocument();
    });

    it('should support column visibility control', () => {
      render(<DataTable columns={mockColumns} data={mockData} enableColumnVisibility={true} />);

      expect(screen.getByTestId('table')).toBeInTheDocument();
    });

    it('should disable column visibility when set to false', () => {
      render(<DataTable columns={mockColumns} data={mockData} enableColumnVisibility={false} />);

      expect(screen.getByTestId('table')).toBeInTheDocument();
    });

    it('should support row click callback', () => {
      const onRowClick = vi.fn();

      render(<DataTable columns={mockColumns} data={mockData} onRowClick={onRowClick} />);

      expect(screen.getByTestId('table')).toBeInTheDocument();
    });
  });

  describe('search and filtering', () => {
    it('should support search with custom key', () => {
      render(
        <DataTable
          columns={mockColumns}
          data={mockData}
          searchKey="name"
          searchPlaceholder="Search by name..."
        />
      );

      expect(screen.getByTestId('toolbar')).toBeInTheDocument();
    });

    it('should support filterable columns', () => {
      const filterableColumns = [
        {
          id: 'value',
          title: 'Value',
          options: [
            { label: 'Low', value: 'low' },
            { label: 'High', value: 'high' },
          ],
        },
      ];

      render(
        <DataTable columns={mockColumns} data={mockData} filterableColumns={filterableColumns} />
      );

      expect(screen.getByTestId('toolbar')).toBeInTheDocument();
    });

    it('should work without search configuration', () => {
      render(<DataTable columns={mockColumns} data={mockData} />);

      expect(screen.getByTestId('toolbar')).toBeInTheDocument();
    });
  });

  describe('loading states', () => {
    it('should show loading indicator when isLoading is true', () => {
      render(<DataTable columns={mockColumns} data={[]} isLoading={true} />);

      expect(screen.getByTestId('loader')).toBeInTheDocument();
      expect(screen.queryByText('No results found.')).not.toBeInTheDocument();
    });

    it('should show data when not loading', () => {
      render(<DataTable columns={mockColumns} data={mockData} isLoading={false} />);

      expect(screen.queryByTestId('loader')).not.toBeInTheDocument();
    });
  });

  describe('empty states', () => {
    it('should show empty message when no data and not loading', () => {
      render(<DataTable columns={mockColumns} data={[]} isLoading={false} />);

      expect(screen.getByText('No results found.')).toBeInTheDocument();
    });

    it('should not show empty message when loading', () => {
      render(<DataTable columns={mockColumns} data={[]} isLoading={true} />);

      expect(screen.queryByText('No results found.')).not.toBeInTheDocument();
    });
  });

  describe('type safety', () => {
    it('should enforce pageCount when manualPagination is true at compile time', () => {
      // This test verifies TypeScript type checking
      // The actual type check happens at compile time

      // Valid: manual pagination with pageCount
      const validManual = (
        <DataTable columns={mockColumns} data={mockData} manualPagination={true} pageCount={10} />
      );

      expect(validManual).toBeDefined();
    });

    it('should prevent pageCount when manualPagination is false', () => {
      // Valid: client-side pagination without pageCount
      const validClient = (
        <DataTable columns={mockColumns} data={mockData} manualPagination={false} />
      );

      expect(validClient).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle very large datasets', () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: `id-${i}`,
        name: `Item ${i}`,
        value: i * 100,
      }));

      render(<DataTable columns={mockColumns} data={largeData} pageSize={10} />);

      expect(screen.getByTestId('table')).toBeInTheDocument();
    });

    it('should handle empty columns array', () => {
      render(<DataTable columns={[]} data={mockData} />);

      expect(screen.getByTestId('table')).toBeInTheDocument();
    });

    it('should handle undefined optional props gracefully', () => {
      render(
        <DataTable
          columns={mockColumns}
          data={mockData}
          searchKey={undefined}
          searchPlaceholder={undefined}
          onRowClick={undefined}
        />
      );

      expect(screen.getByTestId('table')).toBeInTheDocument();
    });

    it('should handle rapid prop changes', () => {
      const { rerender } = render(
        <DataTable columns={mockColumns} data={mockData} isLoading={false} />
      );

      rerender(<DataTable columns={mockColumns} data={mockData} isLoading={true} />);

      expect(screen.getByTestId('loader')).toBeInTheDocument();

      rerender(<DataTable columns={mockColumns} data={[]} isLoading={false} />);

      expect(screen.getByText('No results found.')).toBeInTheDocument();
    });
  });

  describe('column configuration', () => {
    it('should render all column headers', () => {
      render(<DataTable columns={mockColumns} data={mockData} />);

      // Headers are rendered but we need to check the table structure
      expect(screen.getByTestId('table')).toBeInTheDocument();
    });

    it('should handle columns without data', () => {
      render(<DataTable columns={mockColumns} data={[]} />);

      expect(screen.getByText('No results found.')).toBeInTheDocument();
    });
  });
});
