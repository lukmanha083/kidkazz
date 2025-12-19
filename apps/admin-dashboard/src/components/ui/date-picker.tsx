"use client"

import * as React from "react"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface DatePickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
}

/**
 * Render a date selection UI consisting of a popover trigger and an inline calendar.
 *
 * The selected date is displayed in the trigger using a localized long date format. When the user selects
 * a date the component normalizes it to local time (year, month, day with time set to noon) before invoking
 * the change callback; if the selection is cleared the callback is invoked with `undefined`.
 *
 * @param date - The currently selected date, or `undefined` when no date is selected.
 * @param onDateChange - Optional callback invoked when the selection changes. Receives the normalized `Date` (time set to noon in local time) or `undefined`.
 * @param placeholder - Text shown in the trigger when no date is selected. Defaults to `"Pick a date"`.
 * @param disabled - If `true`, disables the trigger button and prevents opening the popover. Defaults to `false`.
 * @returns The rendered DatePicker React element.
 */
export function DatePicker({
  date,
  onDateChange,
  placeholder = "Pick a date",
  disabled = false,
}: DatePickerProps) {
  const handleDateChange = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      // Normalize to local timezone midnight to avoid off-by-one errors
      const normalizedDate = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        12, // Set to noon to avoid timezone edge cases
        0,
        0,
        0
      );
      onDateChange?.(normalizedDate);
    } else {
      onDateChange?.(undefined);
    }
  };

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
            disabled={disabled}
          />
        }
      >
        {date ? format(date, "PPP") : <span>{placeholder}</span>}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateChange}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}