import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import { cn } from "../../lib/utils";

interface VirtualListProps<TData> {
	items: TData[];
	renderItem: (item: TData, index: number) => React.ReactNode;
	itemHeight?: number;
	overscan?: number;
	maxHeight?: string;
	getItemKey?: (item: TData, index: number) => string;
	isLoading?: boolean;
	emptyMessage?: string;
	className?: string;
	gap?: number;
}

/**
 * Render a virtualized scrollable list that only mounts visible items for high-performance rendering of large collections.
 *
 * @param items - Array of data items to render.
 * @param renderItem - Function that renders a single item: `(item, index) => JSX.Element`.
 * @param itemHeight - Estimated height in pixels for each item; used by the virtualizer to estimate scroll size.
 * @param overscan - Number of additional items to render before and after the visible range to reduce pop-in.
 * @param maxHeight - CSS height for the scrollable container (e.g., `"600px"` or `"50vh"`).
 * @param getItemKey - Optional function to derive a stable key for an item: `(item, index) => string`.
 * @param isLoading - When true, shows a centered loading state instead of the list.
 * @param emptyMessage - Message to display when `items` is empty.
 * @param className - Optional additional container class names.
 * @param gap - Optional vertical gap (in pixels) added to the estimated item height.
 * @returns A JSX element containing the virtualized list, loading state, or empty-state message.
 */
export function VirtualList<TData>({
	items,
	renderItem,
	itemHeight = 60,
	overscan = 5,
	maxHeight = "600px",
	getItemKey,
	isLoading = false,
	emptyMessage = "No items to display.",
	className,
	gap = 0,
}: VirtualListProps<TData>) {
	const parentRef = useRef<HTMLDivElement>(null);

	const virtualizer = useVirtualizer({
		count: items.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => itemHeight + gap,
		overscan,
	});

	const virtualItems = virtualizer.getVirtualItems();

	if (isLoading) {
		return (
			<div
				className={cn(
					"flex items-center justify-center rounded-md border bg-background",
					className,
				)}
				style={{ height: maxHeight }}
			>
				<div className="flex items-center gap-2">
					<div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
					<span className="text-muted-foreground">Loading...</span>
				</div>
			</div>
		);
	}

	if (items.length === 0) {
		return (
			<div
				className={cn(
					"flex items-center justify-center rounded-md border bg-background",
					className,
				)}
				style={{ height: maxHeight }}
			>
				<span className="text-muted-foreground">{emptyMessage}</span>
			</div>
		);
	}

	return (
		<div
			ref={parentRef}
			className={cn("relative overflow-auto", className)}
			style={{ height: maxHeight }}
		>
			<div
				style={{
					height: `${virtualizer.getTotalSize()}px`,
					width: "100%",
					position: "relative",
				}}
			>
				{virtualItems.map((virtualItem) => {
					const item = items[virtualItem.index];
					const key = getItemKey
						? getItemKey(item, virtualItem.index)
						: `item-${virtualItem.index}`;

					return (
						<div
							key={key}
							data-index={virtualItem.index}
							style={{
								position: "absolute",
								top: 0,
								left: 0,
								width: "100%",
								height: `${virtualItem.size}px`,
								transform: `translateY(${virtualItem.start}px)`,
							}}
						>
							{renderItem(item, virtualItem.index)}
						</div>
					);
				})}
			</div>
		</div>
	);
}

/**
 * VirtualListItem - Optional wrapper component for list items
 * Provides consistent spacing and styling
 */
interface VirtualListItemProps {
	children: React.ReactNode;
	className?: string;
	onClick?: () => void;
}

/**
 * Styled list item wrapper that provides optional click handling and keyboard activation.
 *
 * Renders its children inside a styled container that becomes interactive when `onClick` is provided:
 * the element receives `role="button"`, `tabIndex=0`, and activates `onClick` on mouse click or when
 * the user presses Enter or Space.
 *
 * @param children - Content to render inside the list item.
 * @param className - Additional class names to merge with the component's base styles.
 * @param onClick - Optional click handler; invoked on mouse click or keyboard activation (Enter/Space).
 */
export function VirtualListItem({
	children,
	className,
	onClick,
}: VirtualListItemProps) {
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if ((e.key === "Enter" || e.key === " ") && onClick) {
			e.preventDefault();
			onClick();
		}
	};

	return (
		<div
			className={cn(
				"flex items-center gap-3 rounded-md border bg-card p-4 text-card-foreground",
				onClick && "cursor-pointer hover:bg-muted/50",
				className,
			)}
			onClick={onClick}
			onKeyDown={onClick ? handleKeyDown : undefined}
			role={onClick ? "button" : undefined}
			tabIndex={onClick ? 0 : undefined}
		>
			{children}
		</div>
	);
}