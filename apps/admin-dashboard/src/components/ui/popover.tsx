import * as React from "react"
import * as PopoverPrimitive from "@base-ui/react/popover"

import { cn } from "@/lib/utils"

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverPositioner = PopoverPrimitive.Positioner

const PopoverPopup = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Popup>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Popup>
>(({ className, ...props }, ref) => (
  <PopoverPrimitive.Popup
    ref={ref}
    className={cn(
      "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none",
      "data-[starting-style]:animate-in data-[ending-style]:animate-out",
      "data-[starting-style]:fade-in-0 data-[ending-style]:fade-out-0",
      "data-[starting-style]:zoom-in-95 data-[ending-style]:zoom-out-95",
      "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
))
PopoverPopup.displayName = "PopoverPopup"

// Wrapper component for easier usage (similar to old API)
const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Popup>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Popup> & {
    align?: "start" | "center" | "end"
    sideOffset?: number
  }
>(({ children, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPositioner
      align={align}
      sideOffset={sideOffset}
      arrowPadding={8}
    >
      <PopoverPopup ref={ref} {...props}>
        {children}
      </PopoverPopup>
    </PopoverPositioner>
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = "PopoverContent"

const PopoverClose = PopoverPrimitive.Close

export {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverClose,
  PopoverPositioner,
  PopoverPopup,
}
