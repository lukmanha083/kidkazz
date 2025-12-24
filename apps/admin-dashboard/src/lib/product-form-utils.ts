/**
 * Product Form Utility Functions
 *
 * Extracted from handleSubmitForm to improve maintainability
 * Each function handles a specific aspect of product creation/update
 *
 * @see Phase 2.5: Refactor handleSubmitForm
 */

import { toast } from 'sonner';
import type { ProductFormData } from './form-schemas';
import type { CreateProductInput, ProductUOM, UOM } from './api';
import type { ProductUOMWithStock } from '@/hooks/useUOMManagement';
import type { WarehouseAllocation } from '@/components/products/ProductWarehouseAllocation';
import type { UOMWarehouseAllocation } from '@/components/products/ProductUOMWarehouseAllocation';

/**
 * Create base unit UOM if not already added manually
 * Ensures every product has a base unit UOM for stock calculations
 */
export function createBaseUnitUOM(
	formValues: ProductFormData,
	existingUOMs: ProductUOMWithStock[],
	availableUOMs: UOM[],
	calculateAllocatedPCS: () => number,
	selectedProductId?: string
): ProductUOMWithStock[] {
	let finalProductUOMs = [...existingUOMs];
	const selectedBaseUnitCode = formValues.baseUnit || "PCS";

	if (!finalProductUOMs.some((u) => u.uomCode === selectedBaseUnitCode)) {
		const hasDefault = finalProductUOMs.some((u) => u.isDefault);

		// Calculate allocated stock from other UOMs
		const allocatedStock = calculateAllocatedPCS();

		// Stock is now 0 as it's managed via Inventory Service
		const remainingStock = 0;

		// Find the base unit details from available UOMs
		const baseUnitInfo = availableUOMs.find(
			(u) => u.code === selectedBaseUnitCode,
		);
		const baseUnitName = baseUnitInfo?.name || "Pieces";

		const baseUOM: ProductUOMWithStock = {
			id: `uom-${selectedBaseUnitCode.toLowerCase()}-${Date.now()}`,
			productId: selectedProductId || "",
			uomCode: selectedBaseUnitCode,
			uomName: baseUnitName,
			barcode: formValues.barcode,
			conversionFactor: 1,
			stock: remainingStock,
			isDefault: !hasDefault,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		if (baseUOM.isDefault) {
			finalProductUOMs = finalProductUOMs.map((u) => ({
				...u,
				isDefault: false,
			}));
		}

		finalProductUOMs = [baseUOM, ...finalProductUOMs];
	}

	// Ensure at least one UOM is default
	if (
		!finalProductUOMs.some((u) => u.isDefault) &&
		finalProductUOMs.length > 0
	) {
		finalProductUOMs[0].isDefault = true;
	}

	return finalProductUOMs;
}

/**
 * Build product payload from form values
 * DDD compliant - NO minimumStock, stock managed via Inventory Service
 */
export function buildProductPayload(formValues: ProductFormData): CreateProductInput {
	return {
		barcode: formValues.barcode,
		name: formValues.name,
		sku: formValues.sku,
		description: formValues.description || undefined,
		categoryId: formValues.categoryId || undefined,
		price: formValues.price,
		stock: 0, // Deprecated: Stock is now managed via Product Locations (Inventory Service)
		baseUnit: formValues.baseUnit,
		wholesaleThreshold: formValues.wholesaleThreshold,
		// NOTE: minimumStock REMOVED - stock management is handled by Inventory Service (DDD)
		status: formValues.status,
		availableForRetail: formValues.availableForRetail,
		availableForWholesale: formValues.availableForWholesale,
		minimumOrderQuantity: formValues.minimumOrderQuantity,
		// Physical dimensions for shipping cost calculation
		weight: formValues.weight || undefined,
		length: formValues.length || undefined,
		width: formValues.width || undefined,
		height: formValues.height || undefined,
		// Product expiration and alert dates (now in TanStack form)
		expirationDate: formValues.expirationDate || undefined,
		alertDate: formValues.alertDate || undefined,
	};
}

/**
 * Create UOMs for a new product
 * Returns map of UOM code to temp ID for later lookups
 */
export async function syncProductUOMsAdd(
	productId: string,
	productUOMs: ProductUOMWithStock[],
	uomApi: any,
): Promise<Map<string, string>> {
	const uomCodeMap = new Map<string, string>();

	for (const uom of productUOMs) {
		uomCodeMap.set(uom.uomCode, uom.id);
		await uomApi.addProductUOM({
			productId,
			uomCode: uom.uomCode,
			uomName: uom.uomName,
			barcode: uom.barcode,
			conversionFactor: uom.conversionFactor,
			stock: uom.stock,
			isDefault: uom.isDefault,
		});
	}

	return uomCodeMap;
}

/**
 * Sync UOMs for an existing product (add, update, delete)
 */
export async function syncProductUOMsEdit(
	productId: string,
	currentUOMs: ProductUOMWithStock[],
	existingUOMs: ProductUOM[],
	uomApi: any,
): Promise<void> {
	// Add or update UOMs
	for (const uom of currentUOMs) {
		const existingUOM = existingUOMs.find(
			(e) => e.uomCode === uom.uomCode,
		);

		if (existingUOM) {
			// Update existing UOM if there are changes
			if (
				existingUOM.barcode !== uom.barcode ||
				(existingUOM as any).stock !== uom.stock ||
				existingUOM.isDefault !== uom.isDefault
			) {
				await uomApi.updateProductUOM(existingUOM.id, {
					barcode: uom.barcode,
					stock: uom.stock,
					isDefault: uom.isDefault,
				});
			}
		} else {
			// Add new UOM
			await uomApi.addProductUOM({
				productId,
				uomCode: uom.uomCode,
				uomName: uom.uomName,
				barcode: uom.barcode,
				conversionFactor: uom.conversionFactor,
				stock: uom.stock,
				isDefault: uom.isDefault,
			});
		}
	}

	// Delete removed UOMs
	for (const existingUOM of existingUOMs) {
		const stillExists = currentUOMs.find(
			(u) => u.uomCode === existingUOM.uomCode,
		);
		if (!stillExists) {
			await uomApi.deleteProductUOM(existingUOM.id);
		}
	}
}

/**
 * Create UOM warehouse locations for new product
 */
export async function createUOMWarehouseLocations(
	uomCodeMap: Map<string, string>,
	createdProductUOMs: ProductUOM[],
	uomWarehouseAllocations: Record<string, UOMWarehouseAllocation[]>,
	productUOMLocationApi: any,
): Promise<void> {
	for (const createdUOM of createdProductUOMs) {
		const tempId = uomCodeMap.get(createdUOM.uomCode);
		if (tempId && uomWarehouseAllocations[tempId]) {
			const allocations = uomWarehouseAllocations[tempId];
			for (const allocation of allocations) {
				try {
					await productUOMLocationApi.create({
						productUOMId: createdUOM.id,
						warehouseId: allocation.warehouseId,
						rack: allocation.rack || null,
						bin: allocation.bin || null,
						zone: allocation.zone || null,
						aisle: allocation.aisle || null,
						quantity: allocation.quantity,
					});
				} catch (locationError) {
					console.error(
						"Failed to create UOM warehouse location:",
						locationError,
					);
				}
			}
		}
	}
}

/**
 * Sync UOM warehouse locations for existing product
 */
export async function syncUOMWarehouseLocations(
	productId: string,
	currentUOMs: ProductUOMWithStock[],
	uomWarehouseAllocations: Record<string, UOMWarehouseAllocation[]>,
	productApi: any,
	productUOMLocationApi: any,
): Promise<void> {
	// Refetch product to get updated UOM IDs
	const updatedProduct = await productApi.getById(productId);

	if (updatedProduct.productUOMs && updatedProduct.productUOMs.length > 0) {
		for (const currentUOM of updatedProduct.productUOMs) {
			// Find the UOM in currentUOMs to get the temp ID
			const matchingUOM = currentUOMs.find(
				(u) => u.uomCode === currentUOM.uomCode,
			);

			if (matchingUOM) {
				const tempId = matchingUOM.id;
				const newAllocations = uomWarehouseAllocations[tempId] || [];

				// Get existing UOM locations
				const existingLocationsResponse =
					await productUOMLocationApi.getByProductUOM(currentUOM.id);
				const existingLocations =
					existingLocationsResponse.locations || [];

				// Delete all existing locations
				for (const existingLocation of existingLocations) {
					try {
						await productUOMLocationApi.delete(existingLocation.id);
					} catch (deleteError) {
						console.error(
							"Failed to delete UOM location:",
							deleteError,
						);
					}
				}

				// Create new locations
				for (const allocation of newAllocations) {
					try {
						await productUOMLocationApi.create({
							productUOMId: currentUOM.id,
							warehouseId: allocation.warehouseId,
							rack: allocation.rack || null,
							bin: allocation.bin || null,
							zone: allocation.zone || null,
							aisle: allocation.aisle || null,
							quantity: allocation.quantity,
						});
					} catch (createError) {
						console.error(
							"Failed to create UOM location:",
							createError,
						);
					}
				}
			}
		}
	}
}

/**
 * Create product warehouse locations for new product
 */
export async function createProductWarehouseLocations(
	productId: string,
	warehouseAllocations: WarehouseAllocation[],
	productLocationApi: any,
): Promise<void> {
	for (const allocation of warehouseAllocations) {
		await productLocationApi.create({
			productId,
			warehouseId: allocation.warehouseId,
			rack: allocation.rack || null,
			bin: allocation.bin || null,
			zone: allocation.zone || null,
			aisle: allocation.aisle || null,
			quantity: allocation.quantity,
		});
	}
}

/**
 * Sync product warehouse locations for existing product
 */
export async function syncProductWarehouseLocations(
	productId: string,
	warehouseAllocations: WarehouseAllocation[],
	existingLocations: any[],
	productLocationApi: any,
): Promise<void> {
	// Create or update allocations
	for (const allocation of warehouseAllocations) {
		const existingLocation = existingLocations.find(
			(loc) => loc.warehouseId === allocation.warehouseId,
		);

		if (existingLocation) {
			// Update existing location
			await productLocationApi.update(existingLocation.id, {
				rack: allocation.rack || null,
				bin: allocation.bin || null,
				zone: allocation.zone || null,
				aisle: allocation.aisle || null,
				quantity: allocation.quantity,
			});
		} else {
			// Create new location
			await productLocationApi.create({
				productId,
				warehouseId: allocation.warehouseId,
				rack: allocation.rack || null,
				bin: allocation.bin || null,
				zone: allocation.zone || null,
				aisle: allocation.aisle || null,
				quantity: allocation.quantity,
			});
		}
	}

	// Delete removed locations
	for (const existingLocation of existingLocations) {
		const stillExists = warehouseAllocations.find(
			(alloc) => alloc.warehouseId === existingLocation.warehouseId,
		);
		if (!stillExists) {
			await productLocationApi.delete(existingLocation.id);
		}
	}
}

/**
 * Validate stock consistency and show detailed error toast
 * Returns true if validation passed, false if failed
 */
export async function validateStockConsistencyWithToast(
	productId: string,
	productApi: any,
	queryClient: any,
	queryKeys: any,
): Promise<boolean> {
	try {
		const validationResult = await productApi.validateStockConsistency(productId);

		if (!validationResult.isValid) {
			// Build detailed error message with per-warehouse breakdown
			const invalidWarehouses =
				validationResult.warehouseValidation.filter((w: any) => !w.isValid);

			let warehouseDetails = "";
			invalidWarehouses.forEach((warehouse: any) => {
				warehouseDetails += `\n\n📦 Warehouse: ${warehouse.warehouseId}\n`;
				warehouseDetails += `  Product Location: ${warehouse.locationStock} ${validationResult.globalSummary.baseUnit}\n`;
				warehouseDetails += `  UOM Locations: ${warehouse.uomStock} ${validationResult.globalSummary.baseUnit}\n`;
				warehouseDetails += `  Difference: ${Math.abs(warehouse.difference)} ${validationResult.globalSummary.baseUnit} (${warehouse.status})\n`;

				// Show UOM breakdown for this warehouse
				if (warehouse.uomBreakdown.length > 0) {
					warehouseDetails += `  UOMs:\n`;
					warehouse.uomBreakdown.forEach((uom: any) => {
						warehouseDetails += `    - ${uom.quantity} × ${uom.uomCode} (${uom.conversionFactor}×) = ${uom.baseUnits} ${validationResult.globalSummary.baseUnit}\n`;
					});
				}
			});

			toast.error("Stock Validation Failed", {
				description:
					`${validationResult.message}\n` +
					`\n📊 Global Summary:\n` +
					`  Total Product Locations: ${validationResult.globalSummary.totalLocationStock} ${validationResult.globalSummary.baseUnit}\n` +
					`  Total UOM Locations: ${validationResult.globalSummary.totalUOMStock} ${validationResult.globalSummary.baseUnit}\n` +
					`  Global Difference: ${Math.abs(validationResult.globalSummary.globalDifference)} ${validationResult.globalSummary.baseUnit}\n` +
					warehouseDetails +
					`\n⚠️ Product was updated, but ${invalidWarehouses.length} warehouse(s) have inconsistent stock. Please fix the warehouse allocations.`,
				duration: 15000,
			});

			// Refresh the product data to show current state
			queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
			queryClient.invalidateQueries({
				queryKey: queryKeys.products.detail(productId),
			});

			return false;
		} else {
			// Validation passed - show brief success message
			console.log("✅ Stock validation passed for all warehouses");
			return true;
		}
	} catch (validationError) {
		console.error("Stock validation check failed:", validationError);
		const errorMessage = validationError instanceof Error
			? validationError.message
			: String(validationError);
		toast.warning("Validation Warning", {
			description: `Product updated successfully, but could not validate stock consistency: ${errorMessage}`,
			duration: 6000,
		});
		return true; // Continue on validation error (non-blocking)
	}
}

/**
 * Get error message from various error types
 */
export function getErrorMessage(error: any): string {
	if (error instanceof Error) {
		return error.message;
	}
	if (typeof error === 'string') {
		return error;
	}
	if (error?.message) {
		return error.message;
	}
	return 'An unknown error occurred';
}
