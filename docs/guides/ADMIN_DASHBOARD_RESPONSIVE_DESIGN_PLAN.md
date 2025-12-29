# Admin Dashboard Responsive Design Plan

> Refactoring Kidkazz Admin Dashboard for Desktop, Tablet, and Mobile

---

## Overview

This document outlines the comprehensive plan to refactor the admin dashboard to be fully responsive across three primary breakpoints: Desktop, Tablet, and Mobile. The goal is to provide an optimal user experience for administrators accessing the dashboard from any device.

**Current State:**
- Dashboard has basic mobile sidebar support (`lg:hidden` toggle)
- Fixed sidebar width (w-56 = 224px)
- Data tables not optimized for smaller screens
- Forms use fixed grid layouts
- No tablet-specific optimizations

**Target State:**
- Fully responsive across all breakpoints
- Collapsible sidebar with icons-only mode
- Mobile-first data table patterns (cards, horizontal scroll)
- Adaptive form layouts
- Touch-optimized interactions for tablet/mobile

---

## Breakpoint Definitions

### Tailwind CSS Breakpoint Strategy

```javascript
// tailwind.config.js - Custom Breakpoints
theme: {
  screens: {
    'mobile': '320px',     // Mobile phones (320px - 767px)
    'tablet': '768px',     // Tablets (768px - 1023px)
    'desktop': '1024px',   // Desktop (1024px+)
    'wide': '1280px',      // Wide desktop (1280px+)
    '2xl': '1536px',       // Extra wide (1536px+)
  }
}
```

### Device Categories

| Breakpoint | Width Range | Devices | Sidebar Behavior |
|------------|-------------|---------|------------------|
| **Mobile** | 320px - 767px | iPhone, Android phones | Hidden (hamburger menu) |
| **Tablet** | 768px - 1023px | iPad, Android tablets | Collapsed (icons only) |
| **Desktop** | 1024px+ | Laptops, desktops | Full sidebar |

---

## Layout Architecture

### Current Layout Structure

```
┌─────────────────────────────────────────────────────┐
│ Sidebar (fixed w-56)  │  Main Content              │
│ - Logo                │  - Top Bar (h-14)          │
│ - Navigation          │  - Page Content            │
│ - User Profile        │                            │
└─────────────────────────────────────────────────────┘
```

### Target Responsive Layout

#### Desktop (1024px+)
```
┌─────────────────────────────────────────────────────┐
│ Sidebar (w-56)        │  Main Content              │
│ - Logo + Text         │  - Top Bar                 │
│ - Full nav labels     │  - Breadcrumb visible      │
│ - User profile        │  - Full page content       │
└─────────────────────────────────────────────────────┘
```

#### Tablet (768px - 1023px)
```
┌─────────────────────────────────────────────────────┐
│ Sidebar   │  Main Content                          │
│ (w-16)    │  - Top Bar (with hamburger)            │
│ - Logo    │  - Breadcrumb (simplified)             │
│ - Icons   │  - Page content (adjusted)             │
│ only      │                                        │
└─────────────────────────────────────────────────────┘
```

#### Mobile (320px - 767px)
```
┌─────────────────────────────────────────────────────┐
│  Top Bar (sticky)                                   │
│  - Hamburger │ Logo │ Actions                       │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Page Content (full width)                          │
│  - Stacked layouts                                  │
│  - Card-based data views                            │
│                                                     │
├─────────────────────────────────────────────────────┤
│  Bottom Navigation (optional)                       │
│  Dashboard │ Orders │ Products │ More               │
└─────────────────────────────────────────────────────┘

Drawer Menu (overlay):
┌──────────────┐
│ Logo         │
│ Navigation   │
│ User Profile │
└──────────────┘
```

---

## Component Refactoring Plan

### Phase 1: Core Layout Components

#### 1.1 Sidebar Component

**File:** `src/routes/dashboard.tsx`

**Current Issues:**
- Fixed width (`w-56`) on all screen sizes
- Mobile menu is a separate component with duplicated code
- No tablet optimization

**Proposed Changes:**

```tsx
// New Sidebar Component Structure
<Sidebar>
  {/* Desktop: Full sidebar */}
  <div className="hidden desktop:flex desktop:w-56 desktop:flex-col">
    <SidebarFull />
  </div>

  {/* Tablet: Collapsed sidebar (icons only) */}
  <div className="hidden tablet:flex tablet:w-16 desktop:hidden flex-col">
    <SidebarCollapsed />
  </div>

  {/* Mobile: Drawer overlay */}
  <div className="tablet:hidden">
    <MobileDrawer />
  </div>
</Sidebar>
```

**Implementation Details:**

| Feature | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Sidebar Width | Hidden (drawer) | 64px (icons) | 224px (full) |
| Logo | Text only in drawer | Icon only | Icon + Text |
| Nav Labels | Full text in drawer | Tooltip on hover | Full text |
| Submenu | Accordion in drawer | Popover on hover | Inline expand |
| User Profile | Bottom of drawer | Avatar only | Avatar + Email |

#### 1.2 Top Bar Component

**File:** `src/routes/dashboard.tsx` (extract to `src/components/layout/TopBar.tsx`)

**Proposed Structure:**

```tsx
<TopBar>
  {/* Mobile: Hamburger + Logo + Actions */}
  <div className="tablet:hidden flex items-center justify-between">
    <HamburgerButton />
    <Logo size="sm" />
    <MobileActions /> {/* Notifications only */}
  </div>

  {/* Tablet/Desktop: Breadcrumb + Actions */}
  <div className="hidden tablet:flex items-center justify-between">
    <Breadcrumb />
    <DesktopActions /> {/* System Status, Notifications, Theme Toggle */}
  </div>
</TopBar>
```

**Responsive Behavior:**

| Element | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Hamburger | Visible | Hidden | Hidden |
| Logo | Centered | Hidden (in sidebar) | Hidden (in sidebar) |
| Breadcrumb | Hidden | Simplified | Full path |
| System Status | Hidden | Icon only | Icon + Text |
| Notifications | Icon | Icon | Icon + Badge |
| Theme Toggle | Hidden (in menu) | Visible | Visible |

#### 1.3 Main Content Area

**Proposed Changes:**

```tsx
<main className={cn(
  "flex-1 overflow-auto",
  "p-4 mobile:p-4 tablet:p-5 desktop:p-6", // Responsive padding
  "pb-20 tablet:pb-6" // Extra padding for mobile bottom nav
)}>
  <Outlet />
</main>
```

---

### Phase 2: Navigation Components

#### 2.1 Mobile Bottom Navigation (New Component)

**File:** `src/components/layout/BottomNav.tsx`

**Purpose:** Quick access to primary sections on mobile

```tsx
const bottomNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: ShoppingCart, label: 'Orders', href: '/dashboard/orders' },
  { icon: Package, label: 'Products', href: '/dashboard/products' },
  { icon: Menu, label: 'More', action: 'openDrawer' },
];

<nav className="fixed bottom-0 left-0 right-0 tablet:hidden bg-card border-t">
  <div className="flex justify-around py-2">
    {bottomNavItems.map(item => (
      <BottomNavItem key={item.label} {...item} />
    ))}
  </div>
</nav>
```

#### 2.2 Collapsible Sidebar Navigation

**File:** `src/components/layout/SidebarNav.tsx`

**Features:**
- Icons-only mode for tablet
- Tooltip labels on hover (tablet)
- Submenu as popover (tablet) vs inline (desktop)

```tsx
// Tablet: Popover submenu
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon">
            <Package className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent side="right" className="w-48 p-2">
          {submenuItems.map(item => <Link ... />)}
        </PopoverContent>
      </Popover>
    </TooltipTrigger>
    <TooltipContent side="right">Products</TooltipContent>
  </Tooltip>
</TooltipProvider>
```

---

### Phase 3: Data Table Responsive Patterns

#### 3.1 Data Table Component

**File:** `src/components/ui/data-table/data-table.tsx`

**Current Issues:**
- Fixed column widths
- No horizontal scroll wrapper
- No mobile card view alternative

**Proposed Patterns:**

##### Pattern A: Horizontal Scroll (Default)

```tsx
<div className="overflow-x-auto -mx-4 tablet:mx-0">
  <div className="inline-block min-w-full align-middle">
    <Table>...</Table>
  </div>
</div>
```

##### Pattern B: Responsive Column Visibility

```tsx
// Column definition with responsive visibility
const columns = [
  {
    accessorKey: "name",
    header: "Name",
    meta: { responsive: "always" }, // Always visible
  },
  {
    accessorKey: "sku",
    header: "SKU",
    meta: { responsive: "tablet" }, // Hidden on mobile
  },
  {
    accessorKey: "description",
    header: "Description",
    meta: { responsive: "desktop" }, // Hidden on mobile/tablet
  },
];

// Auto-hide columns based on breakpoint
const visibleColumns = useResponsiveColumns(columns);
```

##### Pattern C: Card View for Mobile

```tsx
<div className="tablet:hidden space-y-3">
  {data.map(row => (
    <Card key={row.id}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-medium">{row.name}</h4>
            <p className="text-sm text-muted-foreground">{row.sku}</p>
          </div>
          <RowActions row={row} />
        </div>
        <div className="mt-3 flex gap-2">
          <Badge>{row.status}</Badge>
          <span className="text-sm">{row.price}</span>
        </div>
      </CardContent>
    </Card>
  ))}
</div>

<div className="hidden tablet:block">
  <Table>...</Table>
</div>
```

#### 3.2 Data Table Toolbar

**File:** `src/components/ui/data-table/data-table-toolbar.tsx`

**Responsive Behavior:**

| Element | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Search Input | Full width | 200px | 250px |
| Filters | Drawer/Sheet | Dropdown | Inline |
| Column Toggle | Hidden | Dropdown | Dropdown |
| View Toggle | Card/List | Hidden | Hidden |
| Add Button | FAB (bottom right) | Button | Button |

```tsx
<div className="flex flex-col tablet:flex-row gap-3 tablet:items-center tablet:justify-between">
  {/* Search - Full width on mobile */}
  <Input
    placeholder="Search..."
    className="w-full tablet:w-[200px] desktop:w-[250px]"
  />

  {/* Filters - Sheet on mobile, inline on desktop */}
  <div className="flex gap-2">
    <Sheet className="tablet:hidden">
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh]">
        <FilterContent />
      </SheetContent>
    </Sheet>

    <div className="hidden tablet:flex gap-2">
      <FacetedFilter ... />
      <ColumnToggle ... />
    </div>
  </div>
</div>
```

#### 3.3 Data Table Pagination

**File:** `src/components/ui/data-table/data-table-pagination.tsx`

**Responsive Layout:**

```tsx
<div className="flex flex-col tablet:flex-row items-center gap-4 tablet:justify-between">
  {/* Row count - Hidden on mobile */}
  <div className="hidden tablet:block text-sm text-muted-foreground">
    {selectedRows} of {totalRows} row(s) selected.
  </div>

  {/* Pagination controls */}
  <div className="flex items-center gap-2">
    {/* Rows per page - Hidden on mobile */}
    <Select className="hidden tablet:flex" ... />

    {/* Page navigation */}
    <div className="flex items-center gap-1">
      <Button size="icon" variant="outline" className="h-8 w-8">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm px-2">
        {currentPage} / {totalPages}
      </span>
      <Button size="icon" variant="outline" className="h-8 w-8">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  </div>
</div>
```

---

### Phase 4: Form Layouts

#### 4.1 Form Grid System

**Pattern: Responsive Grid**

```tsx
<div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-4">
  <FormField name="field1" ... />
  <FormField name="field2" ... />
  <FormField name="field3" ... />
</div>
```

#### 4.2 Form Sections

**File:** `src/components/products/PhysicalDimensionsSection.tsx` (example)

```tsx
<Card>
  <CardHeader>
    <CardTitle>Physical Dimensions</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="grid grid-cols-2 tablet:grid-cols-4 gap-4">
      <FormField name="weight" ... />
      <FormField name="length" ... />
      <FormField name="width" ... />
      <FormField name="height" ... />
    </div>
  </CardContent>
</Card>
```

#### 4.3 Form Actions

```tsx
<div className={cn(
  "flex gap-3",
  "flex-col tablet:flex-row tablet:justify-end",
  // Sticky on mobile
  "fixed bottom-0 left-0 right-0 p-4 bg-background border-t tablet:static tablet:p-0 tablet:border-0"
)}>
  <Button variant="outline" className="tablet:w-auto w-full">
    Cancel
  </Button>
  <Button className="tablet:w-auto w-full">
    Save
  </Button>
</div>
```

---

### Phase 5: Drawer/Modal Optimization

#### 5.1 Drawer Component

**File:** `src/components/ui/drawer.tsx`

**Responsive Behavior:**

| Property | Mobile | Tablet | Desktop |
|----------|--------|--------|---------|
| Width | 100% | 540px | 540px |
| Position | Bottom sheet | Right side | Right side |
| Close Button | Swipe down | X button | X button |

```tsx
<Drawer>
  <DrawerContent
    side={isMobile ? "bottom" : "right"}
    className={cn(
      isMobile ? "h-[90vh] rounded-t-xl" : "w-[540px]"
    )}
  >
    ...
  </DrawerContent>
</Drawer>
```

#### 5.2 Dialog Component

**File:** `src/components/ui/dialog.tsx`

**Responsive Behavior:**

```tsx
<Dialog>
  <DialogContent className={cn(
    "w-[95vw] max-w-lg",
    "tablet:w-full tablet:max-w-lg",
    "mobile:rounded-t-xl mobile:bottom-0 mobile:top-auto mobile:translate-y-0"
  )}>
    ...
  </DialogContent>
</Dialog>
```

---

### Phase 6: Touch Optimization

#### 6.1 Touch Targets

**Minimum Sizes:**

```css
/* Mobile touch targets */
.touch-target {
  min-height: 44px;
  min-width: 44px;
}

/* Tailwind classes */
.btn-touch {
  @apply h-11 min-w-[44px] tablet:h-9 tablet:min-w-0;
}
```

#### 6.2 Swipe Gestures

**Mobile Drawer:**
- Swipe down to close bottom sheet
- Swipe left on table row for quick actions

**Implementation:** Use `@use-gesture/react` or native touch events

#### 6.3 Pull to Refresh

**Mobile List Views:**

```tsx
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

function ProductList() {
  const { pullProps, isRefreshing } = usePullToRefresh({
    onRefresh: () => refetchProducts(),
  });

  return (
    <div {...pullProps}>
      {isRefreshing && <RefreshIndicator />}
      <ProductCards />
    </div>
  );
}
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Tasks:**
1. [ ] Update `tailwind.config.js` with custom breakpoints
2. [ ] Create responsive utility hooks
   - `useBreakpoint()` - Current breakpoint
   - `useIsMobile()` - Boolean for mobile
   - `useResponsiveValue()` - Return value based on breakpoint
3. [ ] Extract layout components
   - `src/components/layout/Sidebar.tsx`
   - `src/components/layout/TopBar.tsx`
   - `src/components/layout/BottomNav.tsx`
4. [ ] Implement collapsible sidebar (desktop → tablet transition)

**Deliverables:**
- Responsive layout shell
- Collapsible sidebar with icons-only mode
- Mobile drawer navigation

### Phase 2: Navigation (Week 2-3)

**Tasks:**
1. [ ] Implement tablet sidebar with popover submenus
2. [ ] Create mobile bottom navigation
3. [ ] Add mobile drawer with full navigation
4. [ ] Implement breadcrumb responsive behavior
5. [ ] Add mobile-friendly user menu

**Deliverables:**
- Complete navigation for all breakpoints
- Touch-optimized mobile menu

### Phase 3: Data Tables (Week 3-4)

**Tasks:**
1. [ ] Create `useResponsiveColumns()` hook
2. [ ] Implement horizontal scroll wrapper
3. [ ] Create mobile card view alternative
4. [ ] Responsive toolbar (search, filters)
5. [ ] Mobile-friendly pagination
6. [ ] Apply to all existing data tables:
   - Products table
   - Orders table
   - Customers table
   - Inventory tables
   - Accounting tables

**Deliverables:**
- Responsive DataTable component
- All tables adapted for mobile/tablet

### Phase 4: Forms (Week 4-5)

**Tasks:**
1. [ ] Create responsive form grid component
2. [ ] Update product form (largest form)
3. [ ] Update warehouse form
4. [ ] Update category form
5. [ ] Implement sticky form actions on mobile
6. [ ] Optimize drawer forms for mobile

**Deliverables:**
- All forms responsive
- Mobile-optimized input experience

### Phase 5: Touch & Polish (Week 5-6)

**Tasks:**
1. [ ] Implement swipe gestures
2. [ ] Add pull-to-refresh
3. [ ] Optimize touch targets
4. [ ] Performance testing on mobile devices
5. [ ] Accessibility audit (focus, ARIA)
6. [ ] Cross-browser testing

**Deliverables:**
- Touch-optimized experience
- Performance benchmarks
- Accessibility compliance

---

## File Structure

### New Files to Create

```
src/
├── components/
│   └── layout/
│       ├── Sidebar.tsx           # Main sidebar container
│       ├── SidebarFull.tsx       # Desktop full sidebar
│       ├── SidebarCollapsed.tsx  # Tablet icons-only sidebar
│       ├── MobileDrawer.tsx      # Mobile navigation drawer
│       ├── TopBar.tsx            # Responsive top bar
│       ├── BottomNav.tsx         # Mobile bottom navigation
│       └── index.ts              # Exports
├── hooks/
│   ├── useBreakpoint.ts          # Current breakpoint detection
│   ├── useIsMobile.ts            # Mobile detection
│   ├── useResponsiveValue.ts     # Value by breakpoint
│   ├── useResponsiveColumns.ts   # Table column visibility
│   └── usePullToRefresh.ts       # Pull to refresh gesture
└── styles/
    └── responsive.css            # Responsive utility classes
```

### Files to Modify

```
src/
├── routes/
│   └── dashboard.tsx             # Main layout refactor
├── components/
│   └── ui/
│       ├── data-table/
│       │   ├── data-table.tsx           # Add responsive patterns
│       │   ├── data-table-toolbar.tsx   # Responsive toolbar
│       │   └── data-table-pagination.tsx # Responsive pagination
│       ├── drawer.tsx            # Responsive drawer
│       ├── dialog.tsx            # Responsive dialog
│       └── card.tsx              # Touch optimization
└── tailwind.config.js            # Custom breakpoints
```

---

## Responsive Utilities

### useBreakpoint Hook

```tsx
// src/hooks/useBreakpoint.ts
import { useState, useEffect } from 'react';

type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'wide';

const breakpoints = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
  wide: 1280,
};

export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width >= breakpoints.wide) setBreakpoint('wide');
      else if (width >= breakpoints.desktop) setBreakpoint('desktop');
      else if (width >= breakpoints.tablet) setBreakpoint('tablet');
      else setBreakpoint('mobile');
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return breakpoint;
}

export function useIsMobile(): boolean {
  const breakpoint = useBreakpoint();
  return breakpoint === 'mobile';
}

export function useIsTablet(): boolean {
  const breakpoint = useBreakpoint();
  return breakpoint === 'tablet';
}

export function useIsDesktop(): boolean {
  const breakpoint = useBreakpoint();
  return breakpoint === 'desktop' || breakpoint === 'wide';
}
```

### useResponsiveValue Hook

```tsx
// src/hooks/useResponsiveValue.ts
import { useBreakpoint } from './useBreakpoint';

interface ResponsiveValues<T> {
  mobile?: T;
  tablet?: T;
  desktop?: T;
  wide?: T;
  default: T;
}

export function useResponsiveValue<T>(values: ResponsiveValues<T>): T {
  const breakpoint = useBreakpoint();

  return values[breakpoint] ?? values.default;
}

// Usage:
const sidebarWidth = useResponsiveValue({
  mobile: 0,
  tablet: 64,
  desktop: 224,
  default: 224,
});
```

---

## Testing Strategy

### Device Testing Matrix

| Device Category | Devices | Screen Sizes |
|-----------------|---------|--------------|
| Mobile | iPhone SE, iPhone 14, Pixel 7 | 375px, 390px, 412px |
| Tablet | iPad Mini, iPad Pro 11" | 768px, 834px |
| Desktop | MacBook 13", Desktop 1080p | 1280px, 1920px |

### Testing Checklist

#### Layout Tests
- [ ] Sidebar collapses correctly at tablet breakpoint
- [ ] Sidebar hides at mobile breakpoint
- [ ] Mobile drawer opens/closes correctly
- [ ] Bottom navigation visible only on mobile
- [ ] Top bar adapts to each breakpoint
- [ ] Content padding adjusts per breakpoint

#### Data Table Tests
- [ ] Tables scroll horizontally on mobile
- [ ] Columns hide based on responsive settings
- [ ] Card view displays on mobile
- [ ] Pagination simplified on mobile
- [ ] Toolbar filters in sheet on mobile

#### Form Tests
- [ ] Form grids stack on mobile
- [ ] Form actions sticky on mobile
- [ ] Input fields full width on mobile
- [ ] Drawer forms scroll correctly

#### Interaction Tests
- [ ] Touch targets minimum 44px
- [ ] Swipe gestures work correctly
- [ ] Pull to refresh triggers reload
- [ ] Modals position correctly on mobile

### Accessibility Testing

- [ ] Focus management across breakpoints
- [ ] Screen reader navigation
- [ ] Keyboard navigation (desktop)
- [ ] Color contrast on all themes
- [ ] ARIA labels on mobile navigation

---

## Performance Considerations

### Code Splitting

```tsx
// Lazy load mobile-specific components
const MobileDrawer = lazy(() => import('./layout/MobileDrawer'));
const BottomNav = lazy(() => import('./layout/BottomNav'));
```

### CSS Optimization

- Use Tailwind's responsive classes (compiled at build time)
- Avoid runtime breakpoint detection for styling
- Use CSS Container Queries for component-level responsiveness

### Image Optimization

```tsx
// Responsive images
<img
  srcSet="image-320.webp 320w, image-768.webp 768w, image-1024.webp 1024w"
  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
  loading="lazy"
/>
```

---

## Success Metrics

### Performance Targets

| Metric | Mobile | Tablet | Desktop |
|--------|--------|--------|---------|
| FCP (First Contentful Paint) | < 1.5s | < 1.2s | < 1.0s |
| LCP (Largest Contentful Paint) | < 2.5s | < 2.0s | < 1.5s |
| CLS (Cumulative Layout Shift) | < 0.1 | < 0.1 | < 0.1 |
| TTI (Time to Interactive) | < 3.0s | < 2.5s | < 2.0s |

### Usability Targets

- Task completion rate: > 95% across all devices
- Error rate: < 5% on mobile forms
- User satisfaction: > 4.0/5.0 rating

---

## Related Documentation

- [UI_DESIGN_GUIDELINE.md](./UI_DESIGN_GUIDELINE.md) - Design system reference (includes component library status)
- [SHADCN_PRESET_SETUP_GUIDE.md](./SHADCN_PRESET_SETUP_GUIDE.md) - Component setup

---

**Document Version:** 1.0.0
**Created:** December 27, 2025
**Status:** Planning
**Maintained by:** KidKazz Development Team
