import type { Employee } from '@/lib/api';
import type { ColumnDef } from '@tanstack/react-table';
import { Briefcase, Building, Mail, Phone } from 'lucide-react';
import { Badge } from '../../badge';
import { DataTableColumnHeader } from '../data-table-column-header';
import { DataTableRowActions } from '../data-table-row-actions';

interface EmployeeColumnOptions {
  onView?: (employee: Employee) => void;
  onEdit?: (employee: Employee) => void;
  onDelete?: (employee: Employee) => void;
}

export const employeeStatusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'On Leave', value: 'on_leave' },
  { label: 'Terminated', value: 'terminated' },
  { label: 'Resigned', value: 'resigned' },
];

export function getEmployeeColumns(options: EmployeeColumnOptions = {}): ColumnDef<Employee>[] {
  const { onView, onEdit, onDelete } = options;

  return [
    {
      accessorKey: 'employeeNumber',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Emp. No." />,
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.getValue('employeeNumber')}</span>
      ),
    },
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.getValue('name')}</div>
          <div className="text-sm text-muted-foreground font-mono">{row.original.code}</div>
        </div>
      ),
    },
    {
      accessorKey: 'department',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Department"
          className="hidden md:table-cell"
        />
      ),
      cell: ({ row }) => {
        const department = row.getValue('department') as string;
        const position = row.original.position;
        return (
          <div className="hidden md:block">
            {department ? (
              <div className="flex items-center gap-1">
                <Building className="h-3 w-3 text-muted-foreground" />
                <span>{department}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
            {position && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Briefcase className="h-3 w-3" />
                <span>{position}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'email',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Contact" className="hidden lg:table-cell" />
      ),
      cell: ({ row }) => {
        const email = row.original.email;
        const phone = row.original.phone;
        return (
          <div className="hidden lg:block space-y-1">
            {email && (
              <div className="flex items-center gap-1 text-sm">
                <Mail className="h-3 w-3 text-muted-foreground" />
                <span className="truncate max-w-[150px]">{email}</span>
              </div>
            )}
            {phone && (
              <div className="flex items-center gap-1 text-sm">
                <Phone className="h-3 w-3 text-muted-foreground" />
                <span className="font-mono">{phone}</span>
              </div>
            )}
            {!email && !phone && <span className="text-muted-foreground">-</span>}
          </div>
        );
      },
    },
    {
      accessorKey: 'joinDate',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Join Date" className="hidden lg:table-cell" />
      ),
      cell: ({ row }) => {
        const joinDate = row.getValue('joinDate') as number | null;
        if (!joinDate) return <span className="hidden lg:inline text-muted-foreground">-</span>;
        const date = new Date(joinDate);
        return (
          <span className="hidden lg:inline">
            {date.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
          </span>
        );
      },
    },
    {
      accessorKey: 'employmentStatus',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const status = row.getValue('employmentStatus') as string;
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
          active: 'default',
          on_leave: 'outline',
          terminated: 'destructive',
          resigned: 'secondary',
        };
        const labels: Record<string, string> = {
          active: 'Active',
          on_leave: 'On Leave',
          terminated: 'Terminated',
          resigned: 'Resigned',
        };
        return <Badge variant={variants[status] || 'secondary'}>{labels[status] || status}</Badge>;
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DataTableRowActions row={row} onView={onView} onEdit={onEdit} onDelete={onDelete} />
      ),
    },
  ];
}
