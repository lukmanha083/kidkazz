import { useState, useCallback } from 'react';
import type { ProductUOM } from '@/lib/api';
import type { UOMWarehouseAllocation } from '@/components/products/ProductUOMWarehouseAllocation';

/**
 * TEMPORARY: ProductUOM with stock property
 * TODO Phase 3: Remove stock from Product Service (DDD violation)
 * Stock should be fetched from Inventory Service, not stored in Product UOMs
 */
export interface ProductUOMWithStock extends ProductUOM {
	stock: number; // TEMPORARY - violates DDD, will be removed in Phase 3
}

/**
 * Manage product UOMs, related form inputs, warehouse allocations, and stock calculations for a product.
 *
 * Exposes state for UOMs and form fields, setters for direct state updates, actions to add/remove/toggle/set defaults
 * and update allocations, and utilities to compute allocated and remaining stock in PCS.
 *
 * @returns An object containing:
 * - `productUOMs`, `selectedUOM`, `uomBarcode`, `uomStock`, `uomWarehouseAllocations` (state)
 * - `setProductUOMs`, `setSelectedUOM`, `setUomBarcode`, `setUomStock`, `setUomWarehouseAllocations` (setters)
 * - `addUOM`, `removeUOM`, `setDefaultUOM`, `toggleDefaultUOM`, `updateUOMAllocations`, `resetUOMInputs`, `resetAll` (actions)
 * - `calculateAllocatedPCS`, `getRemainingPCS`, `hasUOM` (utility functions)
 */
export function useUOMManagement() {
	// UOM list state
	const [productUOMs, setProductUOMs] = useState<ProductUOMWithStock[]>([]);

	// UOM form input state
	const [selectedUOM, setSelectedUOM] = useState("");
	const [uomBarcode, setUomBarcode] = useState("");
	const [uomStock, setUomStock] = useState("");

	// UOM warehouse allocations state - Map of UOM ID to warehouse allocations
	const [uomWarehouseAllocations, setUomWarehouseAllocations] = useState<
		Record<string, UOMWarehouseAllocation[]>
	>({});

	/**
	 * Add a new UOM to the product
	 */
	const addUOM = useCallback((newUOM: ProductUOMWithStock) => {
		setProductUOMs((prev) => [...prev, newUOM]);
	}, []);

	/**
	 * Remove a UOM from the product
	 */
	const removeUOM = useCallback((uomId: string) => {
		setProductUOMs((prev) => prev.filter((uom) => uom.id !== uomId));
		// Also remove UOM warehouse allocations
		setUomWarehouseAllocations((prev) => {
			const newAllocations = { ...prev };
			delete newAllocations[uomId];
			return newAllocations;
		});
	}, []);

	/**
	 * Set a UOM as default (and unset others)
	 */
	const setDefaultUOM = useCallback((uomId: string) => {
		setProductUOMs((prev) =>
			prev.map((uom) => ({
				...uom,
				isDefault: uom.id === uomId,
			}))
		);
	}, []);

	/**
	 * Toggle default status of a UOM
	 */
	const toggleDefaultUOM = useCallback((uomId: string) => {
		setProductUOMs((prev) =>
			prev.map((uom) => {
				if (uom.id === uomId) {
					return { ...uom, isDefault: !uom.isDefault };
				}
				return { ...uom, isDefault: false }; // Unset others
			})
		);
	}, []);

	/**
	 * Update warehouse allocations for a specific UOM
	 */
	const updateUOMAllocations = useCallback((
		uomId: string,
		allocations: UOMWarehouseAllocation[]
	) => {
		setUomWarehouseAllocations((prev) => ({
			...prev,
			[uomId]: allocations,
		}));
	}, []);

	/**
	 * Calculate total allocated stock across all UOMs (in PCS)
	 */
	const calculateAllocatedPCS = useCallback(() => {
		return productUOMs.reduce(
			(total, uom) => total + (uom.stock * uom.conversionFactor),
			0
		);
	}, [productUOMs]);

	/**
	 * Calculate remaining stock (in PCS)
	 */
	const getRemainingPCS = useCallback((totalStock: number) => {
		return totalStock - calculateAllocatedPCS();
	}, [calculateAllocatedPCS]);

	/**
	 * Reset UOM form inputs
	 */
	const resetUOMInputs = useCallback(() => {
		setSelectedUOM("");
		setUomBarcode("");
		setUomStock("");
	}, []);

	/**
	 * Reset all UOM state
	 */
	const resetAll = useCallback(() => {
		setProductUOMs([]);
		setSelectedUOM("");
		setUomBarcode("");
		setUomStock("");
		setUomWarehouseAllocations({});
	}, []);

	/**
	 * Check if a UOM code already exists in the product
	 */
	const hasUOM = useCallback((uomCode: string) => {
		return productUOMs.some((uom) => uom.uomCode === uomCode);
	}, [productUOMs]);

	return {
		// State
		productUOMs,
		selectedUOM,
		uomBarcode,
		uomStock,
		uomWarehouseAllocations,

		// State setters (for direct access if needed)
		setProductUOMs,
		setSelectedUOM,
		setUomBarcode,
		setUomStock,
		setUomWarehouseAllocations,

		// Actions
		addUOM,
		removeUOM,
		setDefaultUOM,
		toggleDefaultUOM,
		updateUOMAllocations,
		resetUOMInputs,
		resetAll,

		// Utilities
		calculateAllocatedPCS,
		getRemainingPCS,
		hasUOM,
	};
}