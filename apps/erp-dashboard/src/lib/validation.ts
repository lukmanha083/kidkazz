/**
 * Validation Utilities for Business Rules
 * Maps backend errors to user-friendly messages
 */

export interface ValidationError {
  field?: string;
  message: string;
  type: 'error' | 'warning' | 'info';
}

/**
 * Parse API error response into user-friendly validation errors
 */
export function parseApiError(error: any): ValidationError[] {
  if (!error) return [];

  // Handle string errors
  if (typeof error === 'string') {
    return [{ message: error, type: 'error' }];
  }

  // Handle error objects
  if (error.message) {
    return parseErrorMessage(error.message);
  }

  // Handle response errors
  if (error.response?.data?.message) {
    return parseErrorMessage(error.response.data.message);
  }

  // Handle error arrays
  if (error.response?.data?.errors) {
    return error.response.data.errors.map((err: any) => ({
      field: err.field,
      message: err.message,
      type: 'error' as const,
    }));
  }

  return [{ message: 'An unexpected error occurred', type: 'error' }];
}

/**
 * Parse error message and provide user-friendly explanation
 */
function parseErrorMessage(message: string): ValidationError[] {
  const errors: ValidationError[] = [];

  // Business rule: Insufficient stock (Warehouse operations)
  if (message.includes('Insufficient stock')) {
    errors.push({
      field: 'quantity',
      message:
        'Insufficient stock for warehouse adjustment. Warehouse operations cannot create negative stock.',
      type: 'error',
    });
    errors.push({
      message: 'Note: Only POS sales can create negative stock (first-pay-first-served rule).',
      type: 'info',
    });
    return errors;
  }

  // Business rule: Unique SKU
  if (message.includes('SKU') && message.includes('already exists')) {
    errors.push({
      field: 'sku',
      message: 'This SKU is already in use. Product SKUs must be unique.',
      type: 'error',
    });
    return errors;
  }

  // Business rule: Cannot change price of discontinued product
  if (message.includes('discontinued') && message.includes('price')) {
    errors.push({
      field: 'price',
      message: 'Cannot change price of discontinued product. Please reactivate the product first.',
      type: 'error',
    });
    return errors;
  }

  // Business rule: Weight/dimension validation
  if (message.includes('Weight') || message.includes('weight')) {
    errors.push({
      field: 'weight',
      message: message,
      type: 'error',
    });
    return errors;
  }

  if (message.includes('Dimensions') || message.includes('dimension')) {
    errors.push({
      field: 'dimensions',
      message: message,
      type: 'error',
    });
    return errors;
  }

  // Generic error
  errors.push({
    message,
    type: 'error',
  });

  return errors;
}

/**
 * Format validation errors for display
 */
export function formatValidationError(error: ValidationError): string {
  if (error.field) {
    return `${error.field}: ${error.message}`;
  }
  return error.message;
}

/**
 * Get all error messages as a single string
 */
export function getErrorMessages(errors: ValidationError[]): string {
  return errors.map(formatValidationError).join('\n');
}

/**
 * Check if form data is valid based on business rules
 */
export const businessRules = {
  product: {
    validateSKU: (sku: string): ValidationError | null => {
      if (!sku || sku.trim() === '') {
        return { field: 'sku', message: 'SKU is required', type: 'error' };
      }
      if (sku.length < 3) {
        return { field: 'sku', message: 'SKU must be at least 3 characters', type: 'error' };
      }
      return null;
    },

    validatePrice: (price: number): ValidationError | null => {
      if (price < 0) {
        return { field: 'price', message: 'Price cannot be negative', type: 'error' };
      }
      if (price === 0) {
        return { field: 'price', message: 'Price should not be zero', type: 'warning' };
      }
      return null;
    },

    validatePhysicalAttributes: (attrs: {
      weight?: number;
      length?: number;
      width?: number;
      height?: number;
    }): ValidationError[] => {
      const errors: ValidationError[] = [];

      if (attrs.weight !== undefined) {
        if (attrs.weight < 0) {
          errors.push({ field: 'weight', message: 'Weight cannot be negative', type: 'error' });
        }
        if (attrs.weight > 100) {
          errors.push({ field: 'weight', message: 'Weight cannot exceed 100kg', type: 'error' });
        }
      }

      if (attrs.length !== undefined && attrs.width !== undefined && attrs.height !== undefined) {
        if (attrs.length <= 0 || attrs.width <= 0 || attrs.height <= 0) {
          errors.push({
            field: 'dimensions',
            message: 'Dimensions must be positive',
            type: 'error',
          });
        }
        if (attrs.length > 200 || attrs.width > 200 || attrs.height > 200) {
          errors.push({
            field: 'dimensions',
            message: 'Dimensions cannot exceed 200cm per side',
            type: 'error',
          });
        }
      }

      return errors;
    },
  },

  inventory: {
    validateAdjustment: (
      quantity: number,
      movementType: 'in' | 'out' | 'adjustment',
      currentStock: number,
      source: 'warehouse' | 'pos' = 'warehouse'
    ): ValidationError[] => {
      const errors: ValidationError[] = [];

      if (quantity <= 0) {
        errors.push({ field: 'quantity', message: 'Quantity must be positive', type: 'error' });
      }

      // Business rule: Warehouse operations cannot create negative stock
      if (movementType === 'out' && source === 'warehouse' && currentStock < quantity) {
        errors.push({
          field: 'quantity',
          message: `Insufficient stock. Available: ${currentStock}, Requested: ${quantity}`,
          type: 'error',
        });
        errors.push({
          message: 'Warehouse operations cannot create negative stock. Only POS sales can.',
          type: 'info',
        });
      }

      return errors;
    },

    validateMinimumStock: (minimumStock: number): ValidationError | null => {
      if (minimumStock < 0) {
        return {
          field: 'minimumStock',
          message: 'Minimum stock cannot be negative',
          type: 'error',
        };
      }
      return null;
    },
  },

  warehouse: {
    validateCode: (code: string): ValidationError | null => {
      if (!code || code.trim() === '') {
        return { field: 'code', message: 'Warehouse code is required', type: 'error' };
      }
      if (!/^[A-Z0-9-]+$/.test(code)) {
        return {
          field: 'code',
          message: 'Code must contain only uppercase letters, numbers, and hyphens',
          type: 'error',
        };
      }
      return null;
    },

    validateLocation: (location: {
      addressLine1: string;
      city: string;
      province: string;
      postalCode: string;
    }): ValidationError[] => {
      const errors: ValidationError[] = [];

      if (!location.addressLine1) {
        errors.push({ field: 'addressLine1', message: 'Address is required', type: 'error' });
      }
      if (!location.city) {
        errors.push({ field: 'city', message: 'City is required', type: 'error' });
      }
      if (!location.province) {
        errors.push({ field: 'province', message: 'Province is required', type: 'error' });
      }
      if (!location.postalCode) {
        errors.push({ field: 'postalCode', message: 'Postal code is required', type: 'error' });
      }

      return errors;
    },
  },
};
