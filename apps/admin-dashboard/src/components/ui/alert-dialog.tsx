"use client";

import * as React from "react";
import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

/**
 * Renders the root AlertDialog element that wraps dialog state and behavior.
 *
 * Renders a base AlertDialog root with a `data-slot="alert-dialog"` attribute so it can be composed with the provided subcomponents.
 *
 * @returns The rendered AlertDialog root element
 */
function AlertDialog(props: AlertDialogPrimitive.Root.Props) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />;
}

/**
 * Renders the alert dialog trigger element and attaches data-slot="alert-dialog-trigger".
 *
 * Forwards received props to the underlying trigger primitive.
 *
 * @returns The trigger element for the alert dialog.
 */
function AlertDialogTrigger(props: AlertDialogPrimitive.Trigger.Props) {
  return (
    <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
  );
}

/**
 * Render a Portal for the alert dialog that includes a data-slot attribute for composition.
 *
 * @param props - Props forwarded to the underlying Portal component
 * @returns The Portal element configured for the alert dialog
 */
function AlertDialogPortal(props: AlertDialogPrimitive.Portal.Props) {
  return (
    <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
  );
}

/**
 * Renders the alert dialog overlay/backdrop with default styling and allows augmenting it via `className`.
 *
 * @returns The overlay element for the alert dialog.
 */
function AlertDialogOverlay({
  className,
  ...props
}: AlertDialogPrimitive.Backdrop.Props) {
  return (
    <AlertDialogPrimitive.Backdrop
      data-slot="alert-dialog-overlay"
      className={cn(
        "data-[open]:animate-in data-[open]:fade-in-0 data-[closed]:animate-out data-[closed]:fade-out-0 data-[closed]:animation-duration-[200ms] fixed inset-0 z-50 bg-black/50",
        className
      )}
      {...props}
    />
  );
}

/**
 * Renders the alert dialog content inside a portal with its overlay.
 *
 * @param className - Additional CSS classes to apply to the dialog content container
 * @returns The dialog content element rendered within a portal and accompanied by the overlay
 */
function AlertDialogContent({
  className,
  ...props
}: AlertDialogPrimitive.Popup.Props) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Popup
        data-slot="alert-dialog-content"
        className={cn(
          "bg-background data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 data-[closed]:zoom-out-95 data-[open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg",
          className
        )}
        {...props}
      />
    </AlertDialogPortal>
  );
}

/**
 * Renders the header container for an alert dialog.
 *
 * @returns A div element serving as the alert dialog header, marked with `data-slot="alert-dialog-header"` and default layout classes; accepts and forwards standard div props.
 */
function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  );
}

/**
 * Renders the footer container for an alert dialog with responsive layout and spacing.
 *
 * @returns A `div` element serving as the alert dialog footer with stacked buttons on small screens and right-aligned buttons on larger screens.
 */
function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  );
}

/**
 * Renders the alert dialog title with preset typography.
 *
 * @returns The alert dialog title element.
 */
function AlertDialogTitle({
  className,
  ...props
}: AlertDialogPrimitive.Title.Props) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn("text-lg font-semibold", className)}
      {...props}
    />
  );
}

/**
 * Renders the alert dialog's description element with standard styling and a data-slot attribute.
 *
 * @param className - Additional CSS classes to append to the base description styles
 * @returns The rendered AlertDialog description element
 */
function AlertDialogDescription({
  className,
  ...props
}: AlertDialogPrimitive.Description.Props) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

/**
 * Primary action button that closes the alert dialog.
 *
 * @param className - Additional CSS classes to merge with the component's default button styles
 * @returns A JSX element rendering a styled close action button for the dialog
 */
function AlertDialogAction({
  className,
  ...props
}: AlertDialogPrimitive.Close.Props) {
  return (
    <AlertDialogPrimitive.Close
      className={cn(buttonVariants(), className)}
      {...props}
    />
  );
}

/**
 * Styled Close button used as the alert dialog's cancel action.
 *
 * Renders a Close element with the outline button variant and merges any additional `className` values; forwards all other props.
 *
 * @param className - Additional CSS classes to merge with the outline button styles
 * @returns The Close element configured as the dialog's cancel action
 */
function AlertDialogCancel({
  className,
  ...props
}: AlertDialogPrimitive.Close.Props) {
  return (
    <AlertDialogPrimitive.Close
      className={cn(buttonVariants({ variant: "outline" }), className)}
      {...props}
    />
  );
}

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};