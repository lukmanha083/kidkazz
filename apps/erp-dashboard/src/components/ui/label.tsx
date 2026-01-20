import type * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Renders a styled HTML label element for form controls.
 *
 * @param className - Additional CSS class names to merge with the component's default classes
 * @param props - Remaining label element props are forwarded to the underlying `<label>` element
 * @returns A JSX label element with a `data-slot="label"` attribute and the composed `className`
 */
function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return (
    <label
      data-slot="label"
      className={cn(
        'flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 peer-[[data-disabled]]:opacity-50',
        className
      )}
      {...props}
    />
  );
}

export { Label };
