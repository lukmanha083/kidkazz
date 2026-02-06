# Async Validation Pattern

> Real-time uniqueness validation with debouncing and visual feedback

## Overview

This pattern provides real-time validation for fields that need to check uniqueness against the backend (e.g., SKU, barcode, account code). It includes:

- **Debounced requests** (500ms default) to avoid spamming the API
- **Request cancellation** when user types again before previous request completes
- **Visual feedback** with loading spinner, checkmark (valid), or X (invalid)
- **Helper text** that changes based on validation state

## When to Use

Use this pattern when:
- A field value must be unique across the system
- Real-time feedback improves UX (user knows immediately if value is taken)
- The check requires a backend API call

Examples:
- Product barcode/SKU
- Warehouse code
- Account code (COA)
- Batch number
- Employee number

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend                                                    │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Form Component                                         ││
│  │  └── useAsyncValidation(validationApi.checkXXXUnique)   ││
│  │       └── Debounced API call with AbortController       ││
│  └─────────────────────────────────────────────────────────┘│
│                            │                                 │
│                            ▼                                 │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  validation-api.ts                                      ││
│  │  └── checkXXXUnique(value, excludeId?, signal?)         ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  Backend Service                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  GET /api/xxx/validate/yyy?value=...&excludeId=...      ││
│  │  └── Returns { isUnique: boolean }                      ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Implementation Guide

### Step 1: Add Backend Validation Endpoint

Add a validation endpoint to your service routes:

```typescript
// services/xxx-service/src/infrastructure/http/routes/xxx.routes.ts

/**
 * GET /xxx/validate/code - Check if code is unique
 * Returns { isUnique: boolean } for real-time form validation
 */
routes.get('/validate/code', async (c) => {
  const db = c.get('db');
  const code = c.req.query('code');
  const excludeId = c.req.query('excludeId'); // For edit mode

  if (!code) {
    return c.json({ isUnique: true });
  }

  const repository = new Repository(db);
  const exists = await repository.codeExists(code, excludeId);

  return c.json({ isUnique: !exists });
});
```

### Step 2: Add Frontend Validation API Function

Add the validation function to `src/lib/validation-api.ts`:

```typescript
// Add service URL if not already present
const XXX_SERVICE_URL = import.meta.env.VITE_XXX_SERVICE_URL || 'http://localhost:xxxx';

// Update validationRequest to support new service
async function validationRequest(
  endpoint: string,
  params: Record<string, string>,
  service: 'product' | 'inventory' | 'accounting' | 'xxx' = 'product',
  signal?: AbortSignal
): Promise<{ isUnique: boolean }> {
  const baseUrls = {
    product: PRODUCT_SERVICE_URL,
    inventory: INVENTORY_SERVICE_URL,
    accounting: ACCOUNTING_SERVICE_URL,
    xxx: XXX_SERVICE_URL,
  };
  // ... rest of function
}

// Add to validationApi object
export const validationApi = {
  // ... existing functions

  /**
   * Check if XXX code is unique
   */
  checkXXXCodeUnique: async (
    code: string,
    excludeId?: string,
    signal?: AbortSignal
  ): Promise<boolean> => {
    const response = await validationRequest(
      '/api/xxx/validate/code',
      { code, excludeId: excludeId || '' },
      'xxx',
      signal
    );
    return response.isUnique;
  },
};
```

### Step 3: Use in Form Component

```typescript
import { useAsyncValidation } from '@/hooks/useAsyncValidation';
import { validationApi } from '@/lib/validation-api';
import { Check, Loader2, X } from 'lucide-react';

function MyForm() {
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');

  // Initialize async validation
  const codeValidation = useAsyncValidation(validationApi.checkXXXCodeUnique);

  // Reset validation when form opens
  const handleOpenForm = () => {
    form.reset();
    codeValidation.reset();
  };

  return (
    <form.Field name="code">
      {(field) => {
        const hasError = field.state.meta.isTouched && field.state.meta.errors.length > 0;
        const showUniqueError = formMode === 'add' && codeValidation.isValid === false;
        const showUniqueSuccess = formMode === 'add' && codeValidation.isValid === true;

        return (
          <div className="space-y-2">
            <Label className={hasError || showUniqueError ? 'text-destructive' : ''}>
              Code *
            </Label>
            <div className="relative">
              <Input
                value={field.state.value}
                onChange={(e) => {
                  field.handleChange(e.target.value);
                  // Trigger validation only in add mode
                  if (formMode === 'add' && e.target.value.length >= 4) {
                    codeValidation.validate(e.target.value);
                  } else {
                    codeValidation.reset();
                  }
                }}
                disabled={formMode === 'edit'}
                className={`pr-10 ${
                  showUniqueError
                    ? 'border-destructive'
                    : showUniqueSuccess
                      ? 'border-green-500'
                      : ''
                }`}
              />
              {/* Validation status icon */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {codeValidation.isValidating && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {showUniqueSuccess && <Check className="h-4 w-4 text-green-500" />}
                {showUniqueError && <X className="h-4 w-4 text-destructive" />}
              </div>
            </div>
            {/* Dynamic helper text */}
            {showUniqueError ? (
              <p className="text-sm text-destructive">Code already exists</p>
            ) : showUniqueSuccess ? (
              <p className="text-sm text-green-600">Code is available</p>
            ) : (
              <p className="text-xs text-muted-foreground">Enter a unique code</p>
            )}
          </div>
        );
      }}
    </form.Field>
  );
}
```

## Key Files

| File | Purpose |
|------|---------|
| `src/hooks/useAsyncValidation.ts` | Reusable hook for debounced async validation |
| `src/lib/validation-api.ts` | API functions for uniqueness checks |
| Backend `routes/xxx.routes.ts` | Validation endpoints returning `{ isUnique: boolean }` |

## Existing Implementations

| Field | Form | Service | Endpoint |
|-------|------|---------|----------|
| Barcode | Product Form | Product Service | `/api/validation/barcode` |
| SKU | Product Form | Product Service | `/api/validation/sku` |
| Warehouse Code | Warehouse Form | Product Service | `/api/validation/warehouse-code` |
| Batch Number | Batch Form | Inventory Service | `/api/validation/batch-number` |
| Account Code | COA Form | Accounting Service | `/api/accounts/validate/code` |

## useAsyncValidation Hook API

```typescript
const {
  isValidating, // boolean - true while API request is pending
  isValid,      // boolean | null - true=unique, false=exists, null=idle
  error,        // string | null - error message if validation failed
  validate,     // (value, excludeId?) => void - trigger validation
  reset,        // () => void - reset to idle state
} = useAsyncValidation(validationFn, debounceMs);
```

## Best Practices

1. **Only validate in add mode** - In edit mode, the current record's value is valid
2. **Use excludeId for edit mode** - If you do validate in edit mode, exclude current record
3. **Reset on form open** - Always call `validation.reset()` when opening the form
4. **Debounce appropriately** - Default 500ms works well for most cases
5. **Show all states** - Loading, success, error, and idle states improve UX
6. **Combine with schema validation** - Async validation complements, not replaces, Zod validation

---

**Created**: 2026-02-06
**Related**: `src/hooks/useAsyncValidation.ts`, `src/lib/validation-api.ts`
