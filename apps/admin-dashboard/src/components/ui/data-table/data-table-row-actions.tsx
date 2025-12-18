import { Row } from '@tanstack/react-table';
import { MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react';
import { Button } from '../button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../dropdown-menu';

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
  onView?: (data: TData) => void;
  onEdit?: (data: TData) => void;
  onDelete?: (data: TData) => void;
  customActions?: Array<{
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
    onClick: (data: TData) => void;
    variant?: 'default' | 'destructive';
  }>;
}

/**
 * Render a contextual dropdown menu of row-specific actions for a data table.
 *
 * @param row - The table row whose `original` data is passed to action callbacks.
 * @param onView - Optional callback invoked with `row.original` when the "View" item is selected.
 * @param onEdit - Optional callback invoked with `row.original` when the "Edit" item is selected.
 * @param onDelete - Optional callback invoked with `row.original` when the "Delete" item is selected.
 * @param customActions - Optional array of additional actions. Each action's `onClick` is invoked with `row.original`; if `action.icon` is provided it is rendered, and `action.variant === 'destructive'` applies destructive styling.
 * @returns The JSX element that renders the actions dropdown menu for the provided row.
 */
export function DataTableRowActions<TData>({
  row,
  onView,
  onEdit,
  onDelete,
  customActions = [],
}: DataTableRowActionsProps<TData>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
        {onView && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onView(row.original);
            }}
          >
            <Eye className="mr-2 h-4 w-4" />
            View
          </DropdownMenuItem>
        )}
        {onEdit && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onEdit(row.original);
            }}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
        )}
        {customActions.map((action, index) => (
          <DropdownMenuItem
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              action.onClick(row.original);
            }}
            className={action.variant === 'destructive' ? 'text-destructive' : ''}
          >
            {action.icon && <action.icon className="mr-2 h-4 w-4" />}
            {action.label}
          </DropdownMenuItem>
        ))}
        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete(row.original);
              }}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}