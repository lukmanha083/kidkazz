# Kidkazz Real Time ERP Dashboard Structure

## Overview
This document explains the structure and location of the Kidkazz ERP dashboard components and pages.

## Technology Stack
- **Router**: TanStack Router (file-based routing)
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS
- **Icons**: Lucide React

## Main Files

### 1. Dashboard Layout (Sidebar + Header)
**Location**: `apps/erp-dashboard/src/routes/dashboard.tsx`

This file contains:
- The main layout wrapper for all dashboard pages
- Sidebar navigation (desktop & mobile)
- Header with logo, search bar, and notification bell
- Navigation menu items:
  - Dashboard (`/dashboard`)
  - Products (`/dashboard/products`)
  - Orders (`/dashboard/orders`)
  - Customers (`/dashboard/customers`)
  - Settings (`/dashboard/settings`)
- User profile section at the bottom of sidebar
- Responsive mobile menu

**Key Components Used**:
- `<Logo />` - Custom kidkazz logo component
- `<Button />` - shadcn/ui button
- `<Input />` - shadcn/ui input
- Icons from `lucide-react`

---

### 2. Dashboard Home Page (Main Content)
**Location**: `apps/erp-dashboard/src/routes/dashboard/index.tsx`

This file contains:
- Dashboard homepage content
- Statistics cards showing:
  - Total Revenue ($45,231.89)
  - Orders (+2,350)
  - Products (1,234)
  - Customers (+573)
- Recent orders section with status badges
- Top products section with progress bars
- Quick actions grid

**Key Components Used**:
- `<Card />`, `<CardHeader />`, `<CardContent />`, `<CardTitle />`, `<CardDescription />` - shadcn/ui card components

---

### 3. Root Layout
**Location**: `apps/erp-dashboard/src/routes/__root.tsx`

This is the root wrapper for the entire application. It includes:
- The `<Outlet />` component for rendering child routes
- TanStack Router Devtools (in development mode)

---

## Other Dashboard Pages

### Products Page
**Location**: `apps/erp-dashboard/src/routes/dashboard/products.tsx`
- Manages product inventory
- Product listing and management

### Orders Page
**Location**: `apps/erp-dashboard/src/routes/dashboard/orders.tsx`
- Order management and tracking
- Order details and status updates

### Customers Page
**Location**: `apps/erp-dashboard/src/routes/dashboard/customers.tsx`
- Customer management
- Customer information and history

### Settings Page
**Location**: `apps/erp-dashboard/src/routes/dashboard/settings.tsx`
- Application settings and configuration
- User preferences

---

## Component Library

### UI Components Location
**Path**: `apps/erp-dashboard/src/components/ui/`

Currently available shadcn/ui components:
- `button.tsx` - Button component
- `card.tsx` - Card component
- `input.tsx` - Input field component
- `label.tsx` - Label component
- `table.tsx` - Table component
- `checkbox.tsx` - Checkbox component
- `tabs.tsx` - Tabs component
- `pagination.tsx` - Pagination component

### Custom Components
**Path**: `apps/erp-dashboard/src/components/`

- `Logo.tsx` - Kidkazz brand logo component

---

## Planned Updates

### Missing shadcn/ui Components (To Be Added)
The following components are needed to match the Medusa-style design:

1. **Avatar** - For user profile pictures
   - `avatar.tsx`
   - Includes `<Avatar />`, `<AvatarImage />`, `<AvatarFallback />`

2. **DropdownMenu** - For user profile menu and actions
   - `dropdown-menu.tsx`
   - Includes `<DropdownMenu />`, `<DropdownMenuTrigger />`, `<DropdownMenuContent />`, `<DropdownMenuItem />`

3. **Breadcrumb** - For navigation trails
   - `breadcrumb.tsx`
   - Includes `<Breadcrumb />`, `<BreadcrumbList />`, `<BreadcrumbItem />`, `<BreadcrumbLink />`, `<BreadcrumbPage />`, `<BreadcrumbSeparator />`

### Design Improvements

Based on the Medusa ERP dashboard design, the following improvements are planned:

1. **Sidebar Enhancements**:
   - Add store/brand avatar at the top
   - Add submenu support for navigation items (e.g., Inventory > Reservations)
   - Improve user profile section with avatar and dropdown menu
   - Add keyboard shortcuts display (e.g., `⌘K` for search)

2. **Header/Top Bar**:
   - Add breadcrumb navigation
   - Improve notification bell design
   - Add dark mode toggle

3. **Table Design**:
   - Implement consistent table styling
   - Add inline editing capabilities
   - Improve pagination and filtering

4. **Settings & User Profile**:
   - Add dropdown menu for user actions
   - Improve profile display with avatar
   - Add logout and profile settings options

---

## File Structure

```
apps/erp-dashboard/
├── src/
│   ├── routes/
│   │   ├── __root.tsx                 # Root layout
│   │   ├── index.tsx                  # Landing/Login page
│   │   ├── dashboard.tsx              # Dashboard layout wrapper
│   │   └── dashboard/
│   │       ├── index.tsx              # Dashboard home page
│   │       ├── products.tsx           # Products page
│   │       ├── orders.tsx             # Orders page
│   │       ├── customers.tsx          # Customers page
│   │       └── settings.tsx           # Settings page
│   ├── components/
│   │   ├── ui/                        # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── table.tsx
│   │   │   └── ...
│   │   └── Logo.tsx                   # Custom logo component
│   ├── lib/
│   │   └── utils.ts                   # Utility functions
│   └── main.tsx                       # App entry point
```

---

## How TanStack Router Works

TanStack Router uses file-based routing, where:
- Files in `routes/` directory automatically become routes
- `__root.tsx` is the root layout
- `index.tsx` files represent the index route of their directory
- `dashboard.tsx` creates the `/dashboard` layout route
- `dashboard/index.tsx` creates the `/dashboard` page
- Nested folders create nested routes

Example:
- `routes/dashboard.tsx` → `/dashboard` (layout)
- `routes/dashboard/index.tsx` → `/dashboard` (content)
- `routes/dashboard/products.tsx` → `/dashboard/products`

---

## Next Steps

1. Add missing shadcn/ui components (Avatar, DropdownMenu, Breadcrumb)
2. Update dashboard layout to match Medusa-style design
3. Implement dark mode toggle functionality
4. Add submenu support to navigation
5. Improve table design with inline editing
6. Enhance user profile section with dropdown menu

---

## Notes

- The project uses TanStack Router, which is different from Next.js App Router
- All UI components follow the shadcn/ui pattern
- Styling uses Tailwind CSS with a custom theme
- Icons are from Lucide React library
- The design is responsive and mobile-friendly
