import { cn } from '@/lib/utils';
import type { Column } from '@tanstack/react-table';
import { Check, PlusCircle } from 'lucide-react';
import type * as React from 'react';
import { Badge } from '../badge';
import { Button } from '../button';
import { Popover, PopoverContent, PopoverTrigger } from '../popover';
import { Separator } from '../separator';

interface FilterOption {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  /** Child values that should be selected when this option is selected */
  children?: string[];
  /** Parent value - if set, this option is a child */
  parentValue?: string;
}

interface DataTableFacetedFilterProps<TData, TValue> {
  column?: Column<TData, TValue>;
  title?: string;
  options: FilterOption[];
}

/**
 * Render a faceted multi-select filter control for a table column.
 *
 * The control displays a trigger button with the provided title and a summary of current selections,
 * and opens a popover listing all options. Selecting or deselecting options updates the column's
 * filter value to an array of selected option values, or to `undefined` when no options are selected.
 *
 * Supports parent-child hierarchies: selecting a parent option automatically selects all its children.
 *
 * @param column - Optional TanStack Table column used to read faceted counts and to read/update the column's filter value.
 * @param title - Optional label shown on the trigger button.
 * @param options - Array of option objects. Each option can have:
 *   - label: Display text
 *   - value: Filter value
 *   - icon: Optional icon component
 *   - children: Array of child option values (selecting parent selects these)
 *   - parentValue: If set, this option is displayed as a child (indented)
 * @returns A React element containing the faceted filter UI.
 */
export function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  options,
}: DataTableFacetedFilterProps<TData, TValue>) {
  const facets = column?.getFacetedUniqueValues();
  const selectedValues = new Set(column?.getFilterValue() as string[]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 border-dashed">
          <PlusCircle className="mr-2 h-4 w-4" />
          {title}
          {selectedValues?.size > 0 && (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">
                {selectedValues.size}
              </Badge>
              <div className="hidden space-x-1 lg:flex">
                {selectedValues.size > 2 ? (
                  <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                    {selectedValues.size} selected
                  </Badge>
                ) : (
                  options
                    .filter((option) => selectedValues.has(option.value))
                    .map((option) => (
                      <Badge
                        variant="secondary"
                        key={option.value}
                        className="rounded-sm px-1 font-normal"
                      >
                        {option.label}
                      </Badge>
                    ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <div aria-label={title} className="max-h-[300px] overflow-y-auto p-1">
          {options.map((option) => {
            const isSelected = selectedValues.has(option.value);

            const handleSelect = () => {
              const newSelectedValues = new Set(selectedValues);
              if (isSelected) {
                // Deselect this option
                newSelectedValues.delete(option.value);
                // Also deselect all children if this is a parent
                if (option.children?.length) {
                  option.children.forEach((child) => newSelectedValues.delete(child));
                }
              } else {
                // Select this option
                newSelectedValues.add(option.value);
                // Also select all children if this is a parent
                if (option.children?.length) {
                  option.children.forEach((child) => newSelectedValues.add(child));
                }
              }
              const filterValues = Array.from(newSelectedValues);
              column?.setFilterValue(filterValues.length ? filterValues : undefined);
            };

            const isChild = !!option.parentValue;

            return (
              <div
                key={option.value}
                data-selected={isSelected}
                onClick={handleSelect}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelect();
                  }
                }}
                // biome-ignore lint/a11y/noNoninteractiveTabindex: interactive option
                tabIndex={0}
                className={cn(
                  'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
                  isChild && 'pl-6'
                )}
              >
                <div
                  className={cn(
                    'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                    isSelected
                      ? 'bg-primary text-primary-foreground'
                      : 'opacity-50 [&_svg]:invisible'
                  )}
                >
                  <Check className="h-4 w-4" />
                </div>
                {option.icon && <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />}
                <span>{option.label}</span>
                {facets?.get(option.value) && (
                  <span className="ml-auto flex h-4 w-4 items-center justify-center font-mono text-xs">
                    {facets.get(option.value)}
                  </span>
                )}
              </div>
            );
          })}
          {selectedValues.size > 0 && (
            <>
              <div className="my-1 h-px bg-border" />
              <button
                type="button"
                onClick={() => column?.setFilterValue(undefined)}
                className="w-full relative flex cursor-pointer select-none items-center justify-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
              >
                Clear filters
              </button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
