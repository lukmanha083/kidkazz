import type { SimpleFormApi } from '@/types';
import type { ProductFormData } from '@/lib/form-schemas';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';

interface ProductExpirationSectionProps {
	form: SimpleFormApi<ProductFormData>;
}

export function ProductExpirationSection({ form }: ProductExpirationSectionProps) {
	return (
		<div className="space-y-4 border rounded-lg p-4 bg-muted/20">
			<div>
				<Label className="text-base font-semibold">
					Product Expiration &amp; Alert
				</Label>
				<p className="text-xs text-muted-foreground mt-1">
					Set expiration date and alert date for product lifecycle management
				</p>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<form.Field name="alertDate">
					{(field) => (
						<div className="space-y-2">
							<Label htmlFor={field.name}>Alert Date</Label>
							<DatePicker
								date={
									field.state.value
										? new Date(field.state.value)
										: undefined
								}
								onDateChange={(date) => {
									const alertDate = date
										? date.toISOString().split("T")[0]
										: null;
									field.handleChange(alertDate);
								}}
								placeholder="Select alert date"
							/>
							<p className="text-xs text-muted-foreground">
								Date to receive notification before expiration
							</p>
							{field.state.meta.errors.length > 0 && (
								<p className="text-sm text-destructive">
									{field.state.meta.errors.join(", ")}
								</p>
							)}
						</div>
					)}
				</form.Field>

				<form.Field name="expirationDate">
					{(field) => (
						<div className="space-y-2">
							<Label htmlFor={field.name}>Expiration Date</Label>
							<DatePicker
								date={
									field.state.value
										? new Date(field.state.value)
										: undefined
								}
								onDateChange={(date) => {
									const expirationDate = date
										? date.toISOString().split("T")[0]
										: null;
									field.handleChange(expirationDate);
								}}
								placeholder="Select expiration date"
							/>
							<p className="text-xs text-muted-foreground">
								Date when product expires or should be removed
							</p>
							{field.state.meta.errors.length > 0 && (
								<p className="text-sm text-destructive">
									{field.state.meta.errors.join(", ")}
								</p>
							)}
						</div>
					)}
				</form.Field>
			</div>
		</div>
	);
}
