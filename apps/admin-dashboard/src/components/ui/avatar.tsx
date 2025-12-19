import { cn } from "@/lib/utils";
import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";

/**
 * Render a styled avatar root element that forwards props to the underlying avatar primitive.
 *
 * @param className - Additional CSS class names to merge with the component's default styles
 * @param props - Remaining props forwarded to the underlying avatar root element
 * @returns The avatar root element with merged classes and forwarded props
 */
function Avatar({ className, ...props }: AvatarPrimitive.Root.Props) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-full",
        className
      )}
      {...props}
    />
  );
}

/**
 * Render an avatar image element with default sizing and merged classes.
 *
 * @param className - Additional CSS classes merged with the component's default sizing classes (`aspect-square size-full`)
 * @param props - Other props forwarded to the underlying AvatarPrimitive.Image
 * @returns The avatar image element with merged classes and forwarded props
 */
function AvatarImage({ className, ...props }: AvatarPrimitive.Image.Props) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full", className)}
      {...props}
    />
  );
}

/**
 * Renders the avatar fallback UI used when an image is unavailable.
 *
 * @param className - Additional CSS classes to apply to the fallback container
 * @returns A React element that renders the avatar fallback container
 */
function AvatarFallback({
  className,
  ...props
}: AvatarPrimitive.Fallback.Props) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "bg-muted flex items-center justify-center size-full rounded-full text-sm",
        className
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarImage, AvatarFallback };