# KidKazz Real Time ERP Dashboard

Simple ERP dashboard to test all microservices in the KidKazz e-commerce platform.

## Features

- 📊 **Service Status** - Monitor all 7 microservices
- 🔐 **Authentication** - Test user registration and login with JWT
- 📦 **Products** - Create and list products (retail + wholesale)
- 🛒 **Orders** - Create and manage orders
- 🚚 **Shipping** - Get shipping rates with JET API integration

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Open http://localhost:5173
```

## Prerequisites

Make sure all backend services are running:

- API Gateway (port 8787)
- Product Service (port 8788)
- User Service (port 8791)
- Order Service (port 8789)
- Payment Service (port 8790)
- Inventory Service (port 8792)
- Shipping Service (port 8793)

## Usage

1. **Check Service Status** - Verify all services are healthy
2. **Register/Login** - Create an admin user and get JWT token
3. **Create Products** - Add products with dual pricing (retail + wholesale)
4. **Test Shipping** - Calculate shipping rates
5. **Create Orders** - Place test orders

## Tech Stack

- React 18 + TypeScript + Vite
- TanStack (Router, Query, Table, Form)
- ShadCN UI Components
- Zod (validation schemas)
- Tailwind CSS

## Form Validation Pattern

We use `createFormValidator` wrapper instead of the deprecated `zodValidator()` adapter:

```typescript
// ✅ CORRECT - Use createFormValidator
import { createFormValidator, customerFormSchema } from '@/lib/form-schemas';

const form = useForm({
  defaultValues: { name: '', email: '' },
  validators: {
    onChange: createFormValidator(customerFormSchema),
  },
});

// ❌ WRONG - Don't use deprecated zodValidator adapter
import { zodValidator } from '@tanstack/zod-form-adapter'; // DEPRECATED
```

**Why**: `zodValidator()` is deprecated in Zod 3.24.0+, and Zod schemas with `.refine()` cause type inference issues. The `createFormValidator` wrapper in `lib/form-schemas.ts` handles this cleanly.

## Image Cropping Component

For image uploads that need cropping (product images, employee documents):

```typescript
import { ImageCropper } from '@/components/ImageCropper';

// Show cropper for images
{showCropper && cropImageUrl && (
  <ImageCropper
    imageUrl={cropImageUrl}
    onCropComplete={handleCropComplete}
    onCancel={handleCropCancel}
    aspectRatio={1.586}  // Optional: KTP aspect ratio
  />
)}
```

**Features**:
- Drag to reposition crop area
- Resize from corners (nw, ne, sw, se)
- Optional aspect ratio constraint
- Real-time size preview

**Usage in DocumentUpload**:
The `DocumentUpload` component automatically shows the cropper for image files (JPEG, PNG) before upload. PDFs bypass cropping.

## API Proxy

All `/api/*` requests are proxied to backend services
