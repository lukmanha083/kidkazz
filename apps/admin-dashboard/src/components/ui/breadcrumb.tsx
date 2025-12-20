import { useRender } from "@base-ui/react/use-render";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Renders a navigation container for breadcrumbs.
 *
 * @returns A <nav> element with `aria-label="breadcrumb"` and `data-slot="breadcrumb"` that spreads received props onto the element.
 */
function Breadcrumb({ ...props }: React.ComponentProps<"nav">) {
  return <nav aria-label="breadcrumb" data-slot="breadcrumb" {...props} />;
}

/**
 * Renders an ordered list used as the breadcrumb container.
 *
 * The element includes a data-slot of "breadcrumb-list" and a set of default utility
 * classes for spacing, text size, and wrapping. Any `className` passed will be
 * merged with the defaults and remaining props are forwarded to the `<ol>` element.
 *
 * @param className - Additional CSS classes to merge with the default classes
 * @returns The breadcrumb `<ol>` element
 */
function BreadcrumbList({ className, ...props }: React.ComponentProps<"ol">) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn(
        "text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm break-words sm:gap-2.5",
        className
      )}
      {...props}
    />
  );
}

/**
 * Renders a breadcrumb list item element with standard data-slot and default spacing classes.
 *
 * @returns The rendered `<li>` element for a breadcrumb item with `data-slot="breadcrumb-item"` and the provided `className` merged with default layout classes.
 */
function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-item"
      className={cn("inline-flex items-center gap-1.5", className)}
      {...props}
    />
  );
}

/**
 * Renders a breadcrumb link element and injects standard data-slot and styling.
 *
 * Merges the provided `className` with default hover and transition styles and forwards all other props to the rendered element.
 *
 * @param className - Additional CSS classes to merge with the default `"hover:text-foreground transition-colors"` classes
 * @param render - A render prop that determines which element to render (defaults to an `<a />` element)
 * @returns A React element representing the breadcrumb link
 */
function BreadcrumbLink({
  className,
  render = <a />,
  ...props
}: useRender.ComponentProps<"a">) {
  return useRender({
    render,
    props: {
      "data-slot": "breadcrumb-link",
      className: cn("hover:text-foreground transition-colors", className),
      ...props,
    },
  });
}

/**
 * Renders the current page label for a breadcrumb.
 *
 * @returns A span element with `aria-current="page"` and `data-slot="breadcrumb-page"`, combining default and provided `className` and forwarding remaining props.
 */
function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-page"
      aria-current="page"
      className={cn("text-foreground font-normal", className)}
      {...props}
    />
  );
}

/**
 * Renders a breadcrumb separator list item with accessibility attributes and a default icon.
 *
 * @param children - Optional content to display inside the separator; if omitted, a `ChevronRight` icon is rendered.
 * @param className - Additional CSS classes to merge with the component's default sizing classes.
 */
function BreadcrumbSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      className={cn("[&>svg]:size-3.5", className)}
      {...props}
    >
      {children ?? <ChevronRight />}
    </li>
  );
}

/**
 * Renders an ellipsis element used in a breadcrumb to indicate omitted items.
 *
 * @returns A span element containing a horizontal-more icon and a screen-reader-only "More" label
 */
function BreadcrumbEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      aria-hidden="true"
      className={cn("flex size-9 items-center justify-center", className)}
      {...props}
    >
      <MoreHorizontal className="size-4" />
      <span className="sr-only">More</span>
    </span>
  );
}

export {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
};