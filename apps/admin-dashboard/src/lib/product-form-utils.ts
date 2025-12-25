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
 * Ensure a base-unit UOM exists for the product and insert it as the first UOM when missing.
 *
 * If no base-unit UOM is present, a new base UOM is created (using `formValues.baseUnit` or `"PCS"`),
 * assigned a generated id, and placed at the front of the returned list. The created base UOM will be
 * marked as the default if no other default exists. Stock for the created base UOM is set to 0 because
 * stock is managed by the Inventory Service.
 *
 * @param calculateAllocatedPCS - Function returning the number of base-unit pieces allocated from other UOMs
 * @returns The updated list of product UOMs with a base-unit UOM ensured and placed at index 0 if newly created
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
 * Constructs a CreateProductInput payload from ProductFormData, omitting stock fields managed by the Inventory Service.
 *
 * @param formValues - Form values used to populate the product payload
 * @returns The product payload ready for product creation or update; does not include `stock` or `minimumStock`
 */
export function buildProductPayload(formValues: ProductFormData): CreateProductInput {
	return {
		barcode: formValues.barcode,
		name: formValues.name,
		sku: formValues.sku,
		description: formValues.description || undefined,
		categoryId: formValues.categoryId || undefined,
		price: formValues.price,
		// NOTE: stock REMOVED - managed via Product Locations (Inventory Service - DDD)
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
 * Create product UOM records and return a lookup map from UOM code to the UOM's temporary ID.
 *
 * @returns A `Map` that maps each UOM code to its temporary ID (used for later lookups)
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
 * Synchronizes product UOMs by adding new UOMs, updating changed ones, and deleting removed ones.
 *
 * Matches UOMs by `uomCode` and:
 * - Adds UOMs present in `currentUOMs` but not in `existingUOMs`.
 * - Updates barcode, stock, or default flag when those fields differ on an existing UOM.
 * - Deletes UOMs present in `existingUOMs` but not in `currentUOMs`.
 *
 * @param currentUOMs - Desired UOMs (e.g., from the form) to apply to the product
 * @param existingUOMs - Currently persisted UOMs associated with the product
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
			// NOTE: Stock is managed by Inventory Service (DDD), not compared here
			if (
				existingUOM.barcode !== uom.barcode ||
				existingUOM.isDefault !== uom.isDefault
			) {
				await uomApi.updateProductUOM(existingUOM.id, {
					barcode: uom.barcode,
					isDefault: uom.isDefault,
				});
			}
			// TODO: Send stock changes to Inventory Service separately
			// await inventoryApi.adjustStock({
			//   productUOMId: existingUOM.id,
			//   quantity: uom.stock,
			//   reason: 'UOM stock update'
			// });
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
 * Create product UOM physical locations for newly created product UOMs.
 *
 * Maps temporary UOM identifiers to created product UOM records and creates physical location entries (rack/bin/zone/aisle) for each matching allocation; quantity is intentionally not recorded here.
 *
 * @param uomCodeMap - Map from UOM code to the temporary UOM id used in form state
 * @param createdProductUOMs - Newly created product UOM records returned from the Product API
 * @param uomWarehouseAllocations - Record keyed by temporary UOM id containing arrays of warehouse allocation objects
 * @param productUOMLocationApi - API client used to create product UOM location records
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
					// DDD: Product Location API only manages physical location (no quantity)
					await productUOMLocationApi.create({
						productUOMId: createdUOM.id,
						warehouseId: allocation.warehouseId,
						rack: allocation.rack || null,
						bin: allocation.bin || null,
						zone: allocation.zone || null,
						aisle: allocation.aisle || null,
						// NOTE: quantity removed - managed by Inventory Service
					});

					// TODO: Send allocation.quantity to Inventory Service
					// await inventoryApi.adjustStock({
					//   productId: createdUOM.productId,
					//   productUOMId: createdUOM.id,
					//   warehouseId: allocation.warehouseId,
					//   quantity: allocation.quantity,
					//   source: 'warehouse',
					//   reason: 'Initial stock allocation'
					// });
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
 * Replace all UOM-specific physical warehouse locations for a product with the provided allocations.
 *
 * Refetches the product to obtain current productUOM IDs, deletes all existing locations for each UOM, and creates new physical-location records (rack/bin/zone/aisle) based on the provided allocations. Errors during per-location delete/create are logged and do not stop processing other items.
 *
 * @param productId - The ID of the product whose UOM locations will be synchronized
 * @param currentUOMs - The current UOM definitions from the form; used to map temporary IDs to real productUOM entries
 * @param uomWarehouseAllocations - A map from UOM temporary ID to an array of warehouse allocation objects describing physical locations
 * @param productApi - API client with a `getById(productId)` method to retrieve the product and its productUOMs
 * @param productUOMLocationApi - API client with `getByProductUOM(productUOMId)`, `create(location)`, and `delete(locationId)` methods for managing UOM locations
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

				// Diff-based sync: Create or update allocations first
				for (const allocation of newAllocations) {
					const existingLocation = existingLocations.find(
						(loc: any) => loc.warehouseId === allocation.warehouseId,
					);

					try {
						if (existingLocation) {
							// Update existing location if physical attributes differ
							const needsUpdate =
								existingLocation.rack !== (allocation.rack || null) ||
								existingLocation.bin !== (allocation.bin || null) ||
								existingLocation.zone !== (allocation.zone || null) ||
								existingLocation.aisle !== (allocation.aisle || null);

							if (needsUpdate) {
								// DDD: Update physical location only (no quantity)
								await productUOMLocationApi.update(existingLocation.id, {
									rack: allocation.rack || null,
									bin: allocation.bin || null,
									zone: allocation.zone || null,
									aisle: allocation.aisle || null,
									// NOTE: quantity removed - managed by Inventory Service
								});
							}
						} else {
							// Create new location (physical location only)
							// DDD: Product Location API only manages physical location (no quantity)
							await productUOMLocationApi.create({
								productUOMId: currentUOM.id,
								warehouseId: allocation.warehouseId,
								rack: allocation.rack || null,
								bin: allocation.bin || null,
								zone: allocation.zone || null,
								aisle: allocation.aisle || null,
								// NOTE: quantity removed - managed by Inventory Service
							});
						}

						// TODO: Sync allocation.quantity to Inventory Service
						// await inventoryApi.adjustStock({
						//   productId,
						//   productUOMId: currentUOM.id,
						//   warehouseId: allocation.warehouseId,
						//   quantity: allocation.quantity,
						//   source: 'warehouse',
						//   reason: 'Stock sync from location update'
						// });
					} catch (syncError) {
						console.error(
							"Failed to sync UOM warehouse location:",
							syncError,
						);
					}
				}

				// Delete locations that are no longer present
				for (const existingLocation of existingLocations) {
					const stillExists = newAllocations.find(
						(alloc) => alloc.warehouseId === existingLocation.warehouseId,
					);
					if (!stillExists) {
						try {
							await productUOMLocationApi.delete(existingLocation.id);
						} catch (deleteError) {
							console.error(
								"Failed to delete UOM location:",
								deleteError,
							);
						}
					}
				}
			}
		}
	}
}

/**
 * Create product warehouse locations for new product
 *
 * DDD COMPLIANCE: Product Locations are quantity-less
 * - Product Service manages physical locations (rack, bin, zone, aisle) ONLY
 * - Inventory Service manages stock quantities (single source of truth)
 * - Quantities from UI should be sent to Inventory API separately
 */
export async function createProductWarehouseLocations(
	productId: string,
	warehouseAllocations: WarehouseAllocation[],
	productLocationApi: any,
): Promise<void> {
	for (const allocation of warehouseAllocations) {
		// DDD: Product Location API only manages physical location (no quantity)
		await productLocationApi.create({
			productId,
			warehouseId: allocation.warehouseId,
			rack: allocation.rack || null,
			bin: allocation.bin || null,
			zone: allocation.zone || null,
			aisle: allocation.aisle || null,
			// NOTE: quantity removed - managed by Inventory Service
		});

		// TODO: Send allocation.quantity to Inventory Service
		// await inventoryApi.adjustStock({
		//   productId,
		//   warehouseId: allocation.warehouseId,
		//   quantity: allocation.quantity,
		//   source: 'warehouse',
		//   reason: 'Initial stock allocation'
		// });
	}
}

/**
 * Sync product warehouse locations for existing product
 *
 * DDD COMPLIANCE: Product Locations are quantity-less
 * - Only manages physical location attributes (rack, bin, zone, aisle)
 * - Stock quantities should be synced via Inventory Service separately
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
			// DDD: Update physical location only (no quantity)
			await productLocationApi.update(existingLocation.id, {
				rack: allocation.rack || null,
				bin: allocation.bin || null,
				zone: allocation.zone || null,
				aisle: allocation.aisle || null,
				// NOTE: quantity removed - managed by Inventory Service
			});
		} else {
			// DDD: Create physical location only (no quantity)
			await productLocationApi.create({
				productId,
				warehouseId: allocation.warehouseId,
				rack: allocation.rack || null,
				bin: allocation.bin || null,
				zone: allocation.zone || null,
				aisle: allocation.aisle || null,
				// NOTE: quantity removed - managed by Inventory Service
			});
		}

		// TODO: Sync allocation.quantity to Inventory Service
		// await inventoryApi.adjustStock({
		//   productId,
		//   warehouseId: allocation.warehouseId,
		//   quantity: allocation.quantity,
		//   source: 'warehouse',
		//   reason: 'Stock sync from location update'
		// });
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
 * Validate product stock consistency across warehouses and display a detailed error toast when inconsistencies are found.
 *
 * Calls the product API to validate per-warehouse stock. If validation fails, shows a detailed error toast with a per-warehouse
 * breakdown, invalidates product queries to refresh UI state, and returns `false`. If validation passes, returns `true`.
 * If the validation call itself throws an error, shows a warning toast and returns `true` to allow non-blocking continuation.
 *
 * @returns `true` if validation passed or could not be completed due to an error (non-blocking), `false` if validation ran and found inconsistencies.
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
 * Extracts a human-readable message from an error-like value.
 *
 * @returns The error's message string if available; otherwise `'An unknown error occurred'`.
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