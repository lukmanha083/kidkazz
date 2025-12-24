/**
 * Validation API Functions
 *
 * Real-time uniqueness checks for SKU, barcode, warehouse codes, and batch numbers
 * Used by async validation hooks for debounced validation with visual feedback
 *
 * @see Phase 5: Async Validation with Debouncing
 */

// API base URLs for microservices
const PRODUCT_SERVICE_URL = import.meta.env.VITE_PRODUCT_SERVICE_URL || 'http://localhost:8788';
const INVENTORY_SERVICE_URL = import.meta.env.VITE_INVENTORY_SERVICE_URL || 'http://localhost:8792';

/**
 * Send a validation GET request to the selected service and return the parsed uniqueness result.
 *
 * @param endpoint - Path to append to the service base URL (should start with `/`)
 * @param params - Query parameters to include; falsy values are omitted
 * @param service - Which service base URL to use: `'product'` or `'inventory'` (defaults to `'product'`)
 * @returns An object with `isUnique: boolean` where `isUnique` is `true` if the value is unique, `false` otherwise
 * @throws Error when the HTTP response is not OK; the error message includes the response status text
 */
async function validationRequest(
	endpoint: string,
	params: Record<string, string>,
	service: 'product' | 'inventory' = 'product'
): Promise<{ isUnique: boolean }> {
	const baseUrls = {
		product: PRODUCT_SERVICE_URL,
		inventory: INVENTORY_SERVICE_URL,
	};

	const url = new URL(`${baseUrls[service]}${endpoint}`);
	Object.entries(params).forEach(([key, value]) => {
		if (value) {
			url.searchParams.append(key, value);
		}
	});

	const response = await fetch(url.toString(), {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
		},
	});

	if (!response.ok) {
		throw new Error(`Validation request failed: ${response.statusText}`);
	}

	return response.json();
}

export const validationApi = {
	/**
	 * Check if SKU is unique
	 * @param sku - The SKU to validate
	 * @param productId - Optional product ID to exclude from check (for edit mode)
	 */
	checkSKUUnique: async (sku: string, productId?: string): Promise<boolean> => {
		const response = await validationRequest(
			'/api/validation/sku',
			{ sku, excludeId: productId || '' },
			'product'
		);
		return response.isUnique;
	},

	/**
	 * Check if barcode is unique
	 * @param barcode - The barcode to validate
	 * @param productId - Optional product ID to exclude from check (for edit mode)
	 */
	checkBarcodeUnique: async (barcode: string, productId?: string): Promise<boolean> => {
		const response = await validationRequest(
			'/api/validation/barcode',
			{ barcode, excludeId: productId || '' },
			'product'
		);
		return response.isUnique;
	},

	/**
	 * Check if warehouse code is unique
	 * @param code - The warehouse code to validate
	 * @param warehouseId - Optional warehouse ID to exclude from check (for edit mode)
	 */
	checkWarehouseCodeUnique: async (code: string, warehouseId?: string): Promise<boolean> => {
		const response = await validationRequest(
			'/api/validation/warehouse-code',
			{ code, excludeId: warehouseId || '' },
			'product'
		);
		return response.isUnique;
	},

	/**
	 * Check if batch number is unique within warehouse and product
	 * @param batchNumber - The batch number to validate
	 * @param warehouseId - The warehouse ID (required for scoping)
	 * @param productId - The product ID (required for scoping)
	 * @param batchId - Optional batch ID to exclude from check (for edit mode)
	 */
	checkBatchNumberUnique: async (
		batchNumber: string,
		warehouseId: string,
		productId: string,
		batchId?: string
	): Promise<boolean> => {
		const response = await validationRequest(
			'/api/validation/batch-number',
			{
				batchNumber,
				warehouseId,
				productId,
				excludeId: batchId || '',
			},
			'inventory'
		);
		return response.isUnique;
	},
};