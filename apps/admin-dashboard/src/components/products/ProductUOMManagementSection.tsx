import type { SimpleFormApi } from '@/types';
import type { ProductFormData } from '@/lib/form-schemas';
import type { UOM } from '@/lib/api';
import type { Warehouse } from '@/lib/api';
import type { useUOMManagement } from '@/hooks/useUOMManagement';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ProductUOMWarehouseAllocation } from './ProductUOMWarehouseAllocation';

interface ProductUOMManagementSectionProps {
	form: SimpleFormApi<ProductFormData>;
	uomManagement: ReturnType<typeof useUOMManagement>;
	warehouses: Warehouse[];
	availableUOMs: UOM[];
	onRemoveUOM: (uom: any) => void;
	onSetDefaultUOM: (uomId: string) => void;
	onUOMAllocationsChange: (uomId: string, allocations: any[]) => void;
	generateUniqueBarcode: () => string;
	isBarcodeUnique: (barcode: string, excludeId?: string) => boolean;
	formMode: 'add' | 'edit';
	selectedProductId?: string;
}

/**
 * Render the UOM management section for a product, showing stock allocation, added UOMs with per-warehouse allocations, and a form to add new UOMs.
 *
 * @param form - Form API for the product used to read values like `baseUnit` and the main product `barcode`.
 * @param uomManagement - State and helpers from `useUOMManagement` that track selected UOM, inputs, product UOM list, and warehouse allocations.
 * @param warehouses - Available warehouses used when editing per-UOM allocations.
 * @param availableUOMs - List of all UOM definitions available for selection when adding a new UOM.
 * @param onRemoveUOM - Callback invoked with a UOM object when the user removes an existing UOM.
 * @param onSetDefaultUOM - Callback invoked with a UOM `id` to mark that UOM as the product's default.
 * @param onUOMAllocationsChange - Callback invoked with a UOM `id` and its updated allocations when allocations are edited.
 * @param generateUniqueBarcode - Function that returns a generated unique barcode string for use with a new UOM.
 * @param isBarcodeUnique - Function that checks barcode uniqueness; accepts a barcode and an optional exclude id.
 * @param formMode - Current form mode, either `"add"` or `"edit"`, used to determine barcode uniqueness exclusions.
 * @param selectedProductId - Optional id of the product being edited; used when constructing new UOM entries and uniqueness checks.
 * @returns The rendered JSX element for the Product UOM management UI.
 */
export function ProductUOMManagementSection({
	form,
	uomManagement,
	warehouses,
	availableUOMs,
	onRemoveUOM,
	onSetDefaultUOM,
	onUOMAllocationsChange,
	generateUniqueBarcode,
	isBarcodeUnique,
	formMode,
	selectedProductId,
}: ProductUOMManagementSectionProps) {
	const handleAddUOM = () => {
		if (!uomManagement.selectedUOM || !uomManagement.uomBarcode || !uomManagement.uomStock) {
			toast.error("Missing UOM information", {
				description: "Please fill in UOM, barcode, and stock quantity",
			});
			return;
		}

		const uom = availableUOMs.find((u) => u.code === uomManagement.selectedUOM);
		if (!uom) return;

		if (uomManagement.hasUOM(uomManagement.selectedUOM)) {
			toast.error("UOM already added", {
				description: "This UOM has already been added to the product",
			});
			return;
		}

		const excludeId = formMode === "edit" ? selectedProductId : undefined;
		if (!isBarcodeUnique(uomManagement.uomBarcode, excludeId)) {
			toast.error("Barcode already exists", {
				description:
					"This barcode is already used by another product or UOM. Please click the refresh button to generate a new barcode.",
			});
			return;
		}

		if (uomManagement.uomBarcode === form.state.values.barcode && uom.code !== "PCS") {
			toast.error("Duplicate barcode", {
				description:
					"This barcode is the same as the main product barcode. Please use a different barcode for additional UOMs.",
			});
			return;
		}

		const newUOM = {
			id: `uom-temp-${Date.now()}`,
			productId: selectedProductId || "",
			uomCode: uom.code,
			uomName: uom.name,
			barcode: uomManagement.uomBarcode,
			conversionFactor: uom.conversionFactor,
			stock: parseInt(uomManagement.uomStock, 10),
			isDefault: false,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		uomManagement.addUOM(newUOM);
		uomManagement.resetUOMInputs();
		toast.success("UOM added", {
			description: `${uom.name} has been added successfully`,
		});
	};

	return (
		<div className="space-y-4 border rounded-lg p-4 bg-muted/20">
			<div>
				<Label className="text-base font-semibold">
					Product UOMs (Units of Measure)
				</Label>
				<p className="text-xs text-muted-foreground mt-1">
					Define alternative units for selling this product (e.g., Box, Carton)
				</p>
			</div>

			{/* Stock Allocation Summary */}
			<div className="grid grid-cols-3 gap-3 p-3 bg-background border rounded">
				<div className="text-sm">
					<span className="font-medium text-foreground">
						Total Stock:{" "}
					</span>
					<span className="text-muted-foreground">
						0 {form.state.values.baseUnit || "PCS"} (managed via Inventory)
					</span>
				</div>
				<div className="text-sm">
					<span className="font-medium text-foreground">
						Allocated:{" "}
					</span>
					<span className="text-muted-foreground">
						{uomManagement.calculateAllocatedPCS()}{" "}
						{form.state.values.baseUnit || "PCS"}
					</span>
				</div>
				<div className="text-sm">
					<span className="font-medium text-foreground">
						Available:{" "}
					</span>
					<span className="text-primary font-bold">
						{uomManagement.getRemainingPCS(0)} {form.state.values.baseUnit || "PCS"}
					</span>
				</div>
			</div>

			{/* Existing UOMs List */}
			{uomManagement.productUOMs.length > 0 && (
				<div className="space-y-2">
					<Label className="text-sm font-medium">Added UOMs</Label>
					<div className="space-y-3">
						{uomManagement.productUOMs.map((uom) => (
							<div
								key={uom.id}
								className="border rounded bg-background"
							>
								<div className="flex items-start justify-between gap-3 p-3">
									<div className="flex-1 min-w-0 space-y-1">
										<div className="flex items-center gap-2 flex-wrap">
											<span className="font-medium break-words">
												{uom.uomName} ({uom.uomCode})
											</span>
											{uom.isDefault && (
												<Badge
													variant="outline"
													className="text-xs bg-green-50 text-green-700 border-green-200"
												>
													Default
												</Badge>
											)}
										</div>
										<div className="text-xs text-muted-foreground space-y-0.5">
											<div>Barcode: {uom.barcode}</div>
											<div>
												Conversion: 1 {uom.uomCode} = {uom.conversionFactor}{" "}
												{form.state.values.baseUnit || "PCS"}
											</div>
											<div>Stock: {uom.stock} {uom.uomCode}</div>
										</div>
									</div>

									<div className="flex items-center gap-2">
										<div className="flex items-center gap-1">
											<input
												type="checkbox"
												id={`default-${uom.id}`}
												checked={uom.isDefault}
												onChange={() => onSetDefaultUOM(uom.id)}
												className="h-4 w-4 cursor-pointer"
											/>
											<label
												htmlFor={`default-${uom.id}`}
												className="text-xs cursor-pointer whitespace-nowrap"
											>
												Default
											</label>
										</div>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											onClick={() => onRemoveUOM(uom)}
											className="h-8 w-8"
										>
											<Trash2 className="h-4 w-4 text-destructive" />
										</Button>
									</div>
								</div>

								{/* UOM Warehouse Allocations */}
								<div className="px-3 pb-3 pt-2 border-t bg-muted/10">
									<ProductUOMWarehouseAllocation
										warehouses={warehouses}
										allocations={uomManagement.uomWarehouseAllocations[uom.id] || []}
										onAllocationsChange={(allocations) =>
											onUOMAllocationsChange(uom.id, allocations)
										}
										uomCode={uom.uomCode}
										uomName={uom.uomName}
										totalStock={uom.stock}
										readOnly={false}
									/>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Add UOM Form */}
			<div className="space-y-4 border-t pt-4">
				<Label className="text-sm font-medium">Add New UOM</Label>
				<div className="grid grid-cols-3 gap-3">
					<div className="space-y-2">
						<Label htmlFor="uom-select" className="text-xs">
							UOM Type
						</Label>
						<select
							id="uom-select"
							value={uomManagement.selectedUOM}
							onChange={(e) => uomManagement.setSelectedUOM(e.target.value)}
							className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
						>
							<option value="">Select UOM...</option>
							{availableUOMs
								.filter(
									(u) =>
										!u.isBaseUnit &&
										u.baseUnitCode === (form.state.values.baseUnit || "PCS"),
								)
								.map((uom) => (
									<option key={uom.id} value={uom.code}>
										{uom.name} (1 = {uom.conversionFactor}{" "}
										{form.state.values.baseUnit || "PCS"})
									</option>
								))}
						</select>
					</div>

					<div className="space-y-2">
						<Label htmlFor="uom-barcode" className="text-xs">
							Barcode
						</Label>
						<div className="flex gap-2">
							<Input
								id="uom-barcode"
								placeholder="UOM Barcode"
								value={uomManagement.uomBarcode}
								onChange={(e) => uomManagement.setUomBarcode(e.target.value)}
								className="flex-1"
							/>
							<Button
								type="button"
								variant="outline"
								size="icon"
								onClick={() => {
									const newBarcode = generateUniqueBarcode();
									if (newBarcode) {
										uomManagement.setUomBarcode(newBarcode);
										toast.success("Barcode generated");
									}
								}}
								title="Generate unique barcode"
								className="h-9 w-9"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
									<path d="M21 3v5h-5" />
								</svg>
							</Button>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="uom-stock" className="text-xs">
							Stock Quantity
						</Label>
						<Input
							id="uom-stock"
							type="number"
							placeholder="Stock"
							value={uomManagement.uomStock}
							onChange={(e) => uomManagement.setUomStock(e.target.value)}
						/>
					</div>
				</div>

				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={handleAddUOM}
					className="w-full"
				>
					<Plus className="h-4 w-4 mr-2" />
					Add UOM
				</Button>
			</div>
		</div>
	);
}