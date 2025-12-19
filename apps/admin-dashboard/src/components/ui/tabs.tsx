import * as React from "react";
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";

import { cn } from "@/lib/utils";

/**
 * Renders a Tabs root element with a preset vertical layout and slot attribute.
 *
 * @returns The Tabs root element with `data-slot="tabs"` and a `className` that combines `"flex flex-col gap-2"` with the provided `className`
 */
function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

/**
 * Render a tabs list container with preset styling and forwarding of props.
 *
 * @param className - Additional CSS classes to merge with the default styles
 * @returns The rendered tabs list element
 */
function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]",
        className
      )}
      {...props}
    />
  );
}

/**
 * Render a tab trigger element with preset styling and a "tabs-trigger" data-slot.
 *
 * @param className - Additional CSS class names appended to the default styling
 * @param props - Remaining props forwarded to the underlying TabsPrimitive.Tab
 * @returns A tab trigger React element configured for use within the Tabs component
 */
function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "data-active:bg-background dark:data-active:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-active:border-input dark:data-active:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-active:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  );
}

/**
 * Renders a tab panel for use inside a Tabs group.
 *
 * @returns A React element representing the tabs panel.
 */
function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };