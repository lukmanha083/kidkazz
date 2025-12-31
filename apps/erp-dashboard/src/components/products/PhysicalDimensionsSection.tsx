import type { SimpleFormApi } from "@/types";
import type { ProductFormData } from "@/lib/form-schemas";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

/**
 * Extract error message from TanStack Form / Zod validation errors.
 * Handles both string errors and Zod error objects with message property.
 */
function getErrorMessage(error: unknown): string {
	if (typeof error === "string") return error;
	if (error && typeof error === "object" && "message" in error) {
		return (error as { message: string }).message;
	}
	return String(error);
}

interface PhysicalDimensionsSectionProps {
	form: SimpleFormApi<ProductFormData>;
}

/**
 * Render a form section for optional product physical dimensions used to calculate shipping costs.
 *
 * Binds inputs for weight (kg) and length/width/height (cm) to the provided form API, displays placeholders,
 * step values, and validation errors for each field.
 *
 * @param form - The form API instance used to register and manage the `weight`, `length`, `width`, and `height` fields
 * @returns The JSX element for the physical dimensions section
 */
export function PhysicalDimensionsSection({
	form,
}: PhysicalDimensionsSectionProps) {
	return (
		<div className="space-y-4 border rounded-lg p-4 bg-muted/20">
			<div>
				<Label className="text-base font-semibold">
					Physical Dimensions (Optional)
				</Label>
				<p className="text-xs text-muted-foreground mt-1">
					Product dimensions for shipping cost calculation
				</p>
			</div>

			<form.Field name="weight">
				{(field) => (
					<div className="space-y-2">
						<Label htmlFor={field.name}>Weight (kg)</Label>
						<Input
							id={field.name}
							type="number"
							step="0.01"
							min="0"
							placeholder="0.5"
							value={
								field.state.value !== null && field.state.value !== undefined
									? String(field.state.value)
									: ""
							}
							onChange={(e) => {
								const value = e.target.value;
								if (value === "") {
									field.handleChange(null);
								} else {
									const parsed = parseFloat(value);
									field.handleChange(Number.isFinite(parsed) ? parsed : null);
								}
							}}
							onBlur={field.handleBlur}
						/>
						{field.state.meta.errors.length > 0 && (
							<p className="text-sm text-destructive">
								{field.state.meta.errors.map(getErrorMessage).join(", ")}
							</p>
						)}
					</div>
				)}
			</form.Field>

			<div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-3">
				<form.Field name="length">
					{(field) => (
						<div className="space-y-2">
							<Label htmlFor={field.name}>Length (cm)</Label>
							<Input
								id={field.name}
								type="number"
								step="0.1"
								min="0"
								placeholder="10"
								value={
									field.state.value !== null && field.state.value !== undefined
										? String(field.state.value)
										: ""
								}
								onChange={(e) => {
									const value = e.target.value;
									if (value === "") {
										field.handleChange(null);
									} else {
										const parsed = parseFloat(value);
										field.handleChange(Number.isFinite(parsed) ? parsed : null);
									}
								}}
								onBlur={field.handleBlur}
							/>
							{field.state.meta.errors.length > 0 && (
								<p className="text-sm text-destructive">
									{field.state.meta.errors.map(getErrorMessage).join(", ")}
								</p>
							)}
						</div>
					)}
				</form.Field>
				<form.Field name="width">
					{(field) => (
						<div className="space-y-2">
							<Label htmlFor={field.name}>Width (cm)</Label>
							<Input
								id={field.name}
								type="number"
								step="0.1"
								min="0"
								placeholder="10"
								value={
									field.state.value !== null && field.state.value !== undefined
										? String(field.state.value)
										: ""
								}
								onChange={(e) => {
									const value = e.target.value;
									if (value === "") {
										field.handleChange(null);
									} else {
										const parsed = parseFloat(value);
										field.handleChange(Number.isFinite(parsed) ? parsed : null);
									}
								}}
								onBlur={field.handleBlur}
							/>
							{field.state.meta.errors.length > 0 && (
								<p className="text-sm text-destructive">
									{field.state.meta.errors.map(getErrorMessage).join(", ")}
								</p>
							)}
						</div>
					)}
				</form.Field>
				<form.Field name="height">
					{(field) => (
						<div className="space-y-2">
							<Label htmlFor={field.name}>Height (cm)</Label>
							<Input
								id={field.name}
								type="number"
								step="0.1"
								min="0"
								placeholder="10"
								value={
									field.state.value !== null && field.state.value !== undefined
										? String(field.state.value)
										: ""
								}
								onChange={(e) => {
									const value = e.target.value;
									if (value === "") {
										field.handleChange(null);
									} else {
										const parsed = parseFloat(value);
										field.handleChange(Number.isFinite(parsed) ? parsed : null);
									}
								}}
								onBlur={field.handleBlur}
							/>
							{field.state.meta.errors.length > 0 && (
								<p className="text-sm text-destructive">
									{field.state.meta.errors.map(getErrorMessage).join(", ")}
								</p>
							)}
						</div>
					)}
				</form.Field>
			</div>
		</div>
	);
}
