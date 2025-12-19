"use client";

import { Progress as ProgressPrimitive } from "@base-ui/react/progress";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Render a styled Progress root that provides a default track and indicator when no children are supplied.
 *
 * @param className - Additional CSS classes merged with the default "relative w-full"
 * @param children - Custom children to render inside the progress root; if omitted, a default Track containing an Indicator is rendered
 * @returns The Progress root element with merged classes and all passed props
 */
function Progress({
  className,
  children,
  ...props
}: ProgressPrimitive.Root.Props) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn("relative w-full", className)}
      {...props}
    >
      {children ? (
        children
      ) : (
        <ProgressTrack>
          <ProgressIndicator />
        </ProgressTrack>
      )}
    </ProgressPrimitive.Root>
  );
}

/**
 * Render a progress track element with default styling and optional additional classes.
 *
 * @param className - Additional CSS class names to merge with the default track classes
 * @returns The rendered ProgressPrimitive.Track element
 */
function ProgressTrack({ className, ...props }: ProgressPrimitive.Track.Props) {
  return (
    <ProgressPrimitive.Track
      data-slot="progress-track"
      className={cn(
        "bg-primary/20 w-full h-2 overflow-hidden rounded-full",
        className
      )}
      {...props}
    />
  );
}

/**
 * Renders a progress indicator element with default styling and a `data-slot="progress-indicator"` attribute.
 *
 * @param className - Additional CSS classes to merge with the default indicator classes
 * @returns The rendered progress indicator element
 */
function ProgressIndicator({
  className,
  ...props
}: ProgressPrimitive.Indicator.Props) {
  return (
    <ProgressPrimitive.Indicator
      data-slot="progress-indicator"
      className={cn(
        "bg-primary h-full w-full flex-1 transition-all",
        className
      )}
      {...props}
    />
  );
}

/**
 * Renders a progress label element with default typography and optional additional classes and props.
 *
 * @returns The rendered progress label element
 */
function ProgressLabel({ className, ...props }: ProgressPrimitive.Label.Props) {
  return (
    <ProgressPrimitive.Label
      data-slot="progress-label"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

/**
 * Wrapper component that renders a progress value element with default styling.
 *
 * @param className - Additional CSS class names to merge with the component's defaults
 * @returns The rendered progress value element
 */
function ProgressValue({ className, ...props }: ProgressPrimitive.Value.Props) {
  return (
    <ProgressPrimitive.Value
      data-slot="progress-value"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Progress,
  ProgressIndicator,
  ProgressLabel,
  ProgressTrack,
  ProgressValue,
};