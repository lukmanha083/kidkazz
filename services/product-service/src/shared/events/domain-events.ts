/**
 * Domain Events for Product Service
 * Events represent things that have happened in the domain
 */

import type { ProductId } from '../types';

/**
 * Base Domain Event interface
 */
export interface DomainEvent {
  eventId: string;
  eventType: string;
  aggregateId: ProductId;
  timestamp: number;
  version: number;
}

/**
 * ProductCreated Event
 * Published when a new product is created
 */
export interface ProductCreated extends DomainEvent {
  eventType: 'ProductCreated';
  productId: ProductId;
  name: string;
  sku: string;
  retailPrice: number | null;
  wholesalePrice: number;
  availableForRetail: boolean;
  availableForWholesale: boolean;
}

/**
 * ProductPriceUpdated Event
 * Published when product price changes
 */
export interface ProductPriceUpdated extends DomainEvent {
  eventType: 'ProductPriceUpdated';
  productId: ProductId;
  newPrice: number;
  priceType: 'retail' | 'wholesale';
}

/**
 * ProductAvailabilityChanged Event
 * Published when product availability changes
 */
export interface ProductAvailabilityChanged extends DomainEvent {
  eventType: 'ProductAvailabilityChanged';
  productId: ProductId;
  availableForRetail: boolean;
  availableForWholesale: boolean;
}

/**
 * ProductDiscontinued Event
 * Published when product is discontinued
 */
export interface ProductDiscontinued extends DomainEvent {
  eventType: 'ProductDiscontinued';
  productId: ProductId;
  reason?: string;
}
