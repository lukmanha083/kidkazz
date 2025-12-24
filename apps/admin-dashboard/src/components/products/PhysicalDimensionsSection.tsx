import type { SimpleFormApi } from '@/types';
import type { ProductFormData } from '@/lib/form-schemas';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface PhysicalDimensionsSectionProps {
	form: SimpleFormApi<ProductFormData>;
}

export function PhysicalDimensionsSection({ form }: PhysicalDimensionsSectionProps) {
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
							placeholder="0.5"
							value={field.state.value || ''}
							onChange={(e) => field.handleChange(parseFloat(e.target.value) || null)}
							onBlur={field.handleBlur}
						/>
						{field.state.meta.errors.length > 0 && (
							<p className="text-sm text-destructive">
								{field.state.meta.errors.join(', ')}
							</p>
						)}
					</div>
				)}
			</form.Field>

			<div className="grid grid-cols-3 gap-3">
				<form.Field name="length">
					{(field) => (
						<div className="space-y-2">
							<Label htmlFor={field.name}>Length (cm)</Label>
							<Input
								id={field.name}
								type="number"
								step="0.1"
								placeholder="10"
								value={field.state.value || ''}
								onChange={(e) => field.handleChange(parseFloat(e.target.value) || null)}
								onBlur={field.handleBlur}
							/>
							{field.state.meta.errors.length > 0 && (
								<p className="text-sm text-destructive">
									{field.state.meta.errors.join(', ')}
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
								placeholder="10"
								value={field.state.value || ''}
								onChange={(e) => field.handleChange(parseFloat(e.target.value) || null)}
								onBlur={field.handleBlur}
							/>
							{field.state.meta.errors.length > 0 && (
								<p className="text-sm text-destructive">
									{field.state.meta.errors.join(', ')}
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
								placeholder="10"
								value={field.state.value || ''}
								onChange={(e) => field.handleChange(parseFloat(e.target.value) || null)}
								onBlur={field.handleBlur}
							/>
							{field.state.meta.errors.length > 0 && (
								<p className="text-sm text-destructive">
									{field.state.meta.errors.join(', ')}
								</p>
							)}
						</div>
					)}
				</form.Field>
			</div>
		</div>
	);
}
