import * as React from "react";
import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";

import { cn } from "@/lib/utils";

/**
 * Renders a styled separator element that adapts sizing for horizontal or vertical orientation.
 *
 * @param className - Additional CSS classes to apply to the separator.
 * @param props - Remaining props forwarded to the underlying SeparatorPrimitive.
 * @returns A React element for a separator with orientation-aware sizing and the provided classes.
 */
function Separator({ className, ...props }: SeparatorPrimitive.Props) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      className={cn(
        "bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
        className
      )}
      {...props}
    />
  );
}

export { Separator };