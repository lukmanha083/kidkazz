"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Renders a dialog root element with data-slot="dialog" and forwards all received props.
 *
 * @param props - Props forwarded to the underlying dialog root component
 * @returns A React element representing the dialog root
 */
function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

/**
 * Renders a dialog trigger element with data-slot="dialog-trigger" while forwarding all received props.
 *
 * @returns The rendered dialog trigger element.
 */
function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

/**
 * Wraps DialogPrimitive.Portal, adding a data-slot attribute and forwarding all props.
 *
 * @param props - Props passed through to DialogPrimitive.Portal
 * @returns A DialogPrimitive.Portal element rendered with `data-slot="dialog-portal"` and the provided props applied
 */
function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

/**
 * Renders a dialog close control with a fixed `data-slot="dialog-close"`.
 *
 * @returns A Close element for the dialog that applies the provided props and sets `data-slot="dialog-close"`.
 */
function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

/**
 * Renders the dialog backdrop with default overlay styles and a data-slot for identification.
 *
 * @param className - Additional class names to merge with the component's default overlay classes
 * @returns The dialog backdrop element with merged classes and passed-through props
 */
function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 data-[closed]:animation-duration-[200ms] fixed inset-0 z-50 bg-black/50",
        className
      )}
      {...props}
    />
  );
}

/**
 * Renders the dialog content area inside a portal with a backdrop and an optional close control.
 *
 * @param className - Additional CSS class names to apply to the dialog popup container.
 * @param children - Elements to render inside the dialog popup.
 * @param showCloseButton - When `true`, renders a positioned close button inside the popup; defaults to `true`.
 * @returns The dialog popup element rendered within a portal and overlay.
 */
function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean;
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "bg-background data-[open]:animate-in data-[open]:fade-in-0 data-[open]:zoom-in-95 data-[closed]:animate-out data-[closed]:fade-out-0 data-[closed]:zoom-out-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="ring-offset-background focus:ring-ring data-[open]:bg-accent data-[open]:text-muted-foreground absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  );
}

/**
 * Renders the dialog header container with vertical spacing and responsive text alignment.
 *
 * @param className - Additional CSS classes to append to the header's default layout and alignment classes
 * @returns A div element with data-slot="dialog-header" configured as the dialog's header area
 */
function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  );
}

/**
 * Render a dialog footer container that arranges footer content responsively.
 *
 * @returns A `div` element with `data-slot="dialog-footer"`, a responsive flex layout (column-reverse on small screens, row aligned and right-justified on larger screens), and any provided `className` and other `div` props merged onto it.
 */
function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  );
}

/**
 * Renders a dialog title element with standardized styling and a `data-slot="dialog-title"` attribute.
 *
 * @returns The rendered dialog title element
 */
function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  );
}

/**
 * Renders the dialog's descriptive text styled as muted, small typography.
 *
 * @param className - Additional CSS classes to append to the default muted small-text styles
 * @returns The dialog description element
 */
function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};