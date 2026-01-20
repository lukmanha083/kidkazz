import { Product } from '../../domain/entities/Product';
import type { IProductRepository } from '../../domain/repositories/IProductRepository';
import type { EventPublisher } from '../../infrastructure/events/EventPublisher';

interface CreateProductInput {
  barcode: string;
  name: string;
  sku: string;
  description?: string;
  image?: string;
  categoryId?: string;
  price: number;
  retailPrice?: number;
  wholesalePrice?: number;
  baseUnit: string;
  wholesaleThreshold?: number;
  minimumOrderQuantity?: number;
  minimumStock?: number;
  availableForRetail?: boolean;
  availableForWholesale?: boolean;
  createdBy?: string;
}

interface CreateProductOutput {
  id: string;
  sku: string;
  name: string;
}

/**
 * Use Case: Create Product
 * Validates business rules and creates a new product
 */
export class CreateProduct {
  constructor(
    private repository: IProductRepository,
    private eventPublisher: EventPublisher
  ) {}

  async execute(input: CreateProductInput): Promise<CreateProductOutput> {
    // Business validation: Check if SKU already exists
    const existingBySKU = await this.repository.findBySKU(input.sku);
    if (existingBySKU) {
      throw new Error(`Product with SKU ${input.sku} already exists`);
    }

    // Business validation: Check if barcode already exists
    const existingByBarcode = await this.repository.findByBarcode(input.barcode);
    if (existingByBarcode) {
      throw new Error(`Product with barcode ${input.barcode} already exists`);
    }

    // Create domain entity
    const product = Product.create(input);

    // Persist
    await this.repository.save(product);

    // Publish domain events
    await this.eventPublisher.publishAll(product.getDomainEvents());
    product.clearDomainEvents();

    return {
      id: product.getId(),
      sku: product.getSKU(),
      name: product.getName(),
    };
  }
}
