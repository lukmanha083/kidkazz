import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface ComboboxOption {
  value: string
  label: string
  barcode?: string
  name?: string
  sku?: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  disabled?: boolean
}

/**
 * Render a searchable combobox UI for picking an option from a list.
 *
 * The combobox shows the currently selected option label or a placeholder, opens a popover
 * with a search input and matching options, and updates selection via `onValueChange`.
 * Typing filters options case-insensitively by `label`, `barcode`, `sku`, or `name`.
 * Selecting the currently selected option clears the selection.
 *
 * @param options - Array of option objects (each with `value` and `label`, optional `barcode`, `name`, `sku`)
 * @param value - Currently selected option `value`, if any
 * @param onValueChange - Callback invoked with the new selected value (or `""` when selection is cleared)
 * @param placeholder - Text shown when no option is selected
 * @param searchPlaceholder - Placeholder text for the search input inside the popover
 * @param emptyText - Message displayed when no options match the search
 * @param className - Additional CSS classes applied to the trigger button
 * @param disabled - Whether the combobox is disabled
 * @returns A JSX element representing the combobox component
 */
export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyText = "No option found.",
  className,
  disabled = false,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")

  const filteredOptions = React.useMemo(() => {
    if (!searchValue) return options;

    const search = searchValue.toLowerCase();
    return options.filter((option) => {
      return (
        option.label.toLowerCase().includes(search) ||
        option.barcode?.toLowerCase().includes(search) ||
        option.sku?.toLowerCase().includes(search) ||
        option.name?.toLowerCase().includes(search)
      );
    });
  }, [options, searchValue]);

  const handleSelect = (selectedValue: string) => {
    onValueChange?.(selectedValue === value ? "" : selectedValue)
    setSearchValue("")
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between", className)}
        >
          {value
            ? options.find((option) => option.value === value)?.label
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <div className="flex flex-col">
          <div className="border-b px-3 py-2">
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {emptyText}
              </div>
            ) : (
              <div className="p-1">
                {filteredOptions.map((option) => {
                  const isSelected = value === option.value;
                  return (
                    <div
                      key={option.value}
                      className={cn(
                        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none",
                        "hover:bg-accent hover:text-accent-foreground",
                        isSelected && "bg-accent"
                      )}
                      onClick={() => handleSelect(option.value)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          isSelected ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col gap-0.5">
                        <span>{option.label}</span>
                        {option.barcode && (
                          <span className="text-xs text-muted-foreground">
                            Barcode: {option.barcode}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
