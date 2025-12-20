# Base UI Migration Guide

> **Comprehensive guide for migrating from Radix UI to Base UI across all KidKazz applications**
>
> Version: 2.0.0 | Last Updated: 2025-12-19
>
> **Status**: ✅ **COMPLETE** - Admin Dashboard migrated successfully (88.2% coverage)

---

## 🎉 Migration Status

**Admin Dashboard**: ✅ **COMPLETE** (2025-12-19)
- **Coverage**: 15/17 components (88.2%)
- **Migrated to Base UI**: 14 components
- **Migrated to Sonner**: 1 component (Toast)
- **Keeping**: 2 components (Drawer, Slot - waiting for Base UI support)

**Other Apps**: ⏸️ Pending
- Point of Sale (POS)
- E-Commerce Retail
- E-Commerce Wholesale
- Mobile Admin App

📋 **See**: [Migration Complete Report](./BASE_UI_MIGRATION_COMPLETE.md)

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Current UI Stack Analysis](#2-current-ui-stack-analysis)
3. [Base UI vs Radix UI Comparison](#3-base-ui-vs-radix-ui-comparison)
4. [Migration Strategy](#4-migration-strategy)
5. [Component Migration Reference](#5-component-migration-reference)
6. [Code Examples](#6-code-examples)
7. [Testing & Validation](#7-testing--validation)
8. [Implementation Checklist](#8-implementation-checklist)
9. [Resources](#9-resources)

---

## 1. Introduction

### What is Base UI?

Base UI is a library of unstyled, accessible React components created as a joint venture by the maintainers of **Radix UI**, **Material UI**, and **Floating UI**. Released as v1.0 stable in December 2025, it provides:

- **Unstyled components**: Full control over styling with Tailwind, CSS Modules, or any CSS solution
- **Accessibility first**: WAI-ARIA compliant, tested across browsers and screen readers
- **Modern React patterns**: Uses render props instead of `asChild` for composition
- **Unified package**: Single `@base-ui/react` dependency instead of multiple packages

### Why Migrate from Radix UI?

| Aspect | Radix UI | Base UI |
|--------|----------|---------|
| **Package Structure** | 13+ separate packages | Single `@base-ui/react` package |
| **Composition Pattern** | `asChild` prop | `render` prop (more explicit) |
| **Maintenance** | Community reports slow bug fixes | Active development, responsive maintainers |
| **Features** | Basic primitives | Additional features (multi-select, non-dialog combobox) |
| **shadcn/ui Support** | Default (current) | Supported via basecn registry |

### Benefits of Migration

1. **Simplified Dependencies**: One package to install, update, and maintain
2. **Explicit Composition**: `render` prop makes component composition clearer
3. **Enhanced Features**: Built-in multi-select, autocomplete, and more
4. **Future-Proof**: Active development with MUI backing
5. **Same Philosophy**: Maintains shadcn/ui's copy-paste, own-your-code approach

---

## 2. Current UI Stack Analysis

### Radix UI Packages in Use (admin-dashboard)

```json
{
  "@radix-ui/react-alert-dialog": "^1.1.15",
  "@radix-ui/react-avatar": "^1.1.11",
  "@radix-ui/react-checkbox": "^1.3.3",
  "@radix-ui/react-dialog": "^1.1.15",
  "@radix-ui/react-dropdown-menu": "^2.1.16",
  "@radix-ui/react-label": "^2.0.2",
  "@radix-ui/react-popover": "^1.1.15",
  "@radix-ui/react-progress": "^1.1.8",
  "@radix-ui/react-select": "^2.2.6",
  "@radix-ui/react-separator": "^1.1.8",
  "@radix-ui/react-slot": "^1.2.4",
  "@radix-ui/react-tabs": "^1.1.13",
  "@radix-ui/react-toast": "^1.1.5"
}
```

**Total: 13 Radix UI packages**

### Component Inventory

Located in: `apps/admin-dashboard/src/components/ui/`

| Component | Uses Radix UI | Notes |
|-----------|---------------|-------|
| alert-dialog.tsx | Yes | @radix-ui/react-alert-dialog |
| avatar.tsx | Yes | @radix-ui/react-avatar |
| button.tsx | Yes | @radix-ui/react-slot (for asChild) |
| breadcrumb.tsx | Yes | @radix-ui/react-slot (for asChild) |
| checkbox.tsx | Yes | @radix-ui/react-checkbox |
| dialog.tsx | Yes | @radix-ui/react-dialog |
| dropdown-menu.tsx | Yes | @radix-ui/react-dropdown-menu |
| label.tsx | Yes | @radix-ui/react-label |
| popover.tsx | Yes | @radix-ui/react-popover |
| progress.tsx | Yes | @radix-ui/react-progress |
| select.tsx | Yes | @radix-ui/react-select |
| separator.tsx | Yes | @radix-ui/react-separator |
| tabs.tsx | Yes | @radix-ui/react-tabs |
| command.tsx | Partial | Uses Dialog type from Radix |
| card.tsx | No | Pure HTML/Tailwind |
| input.tsx | No | Pure HTML/Tailwind |
| table.tsx | No | Custom/TanStack Table |
| badge.tsx | No | Pure HTML/Tailwind |
| calendar.tsx | No | react-day-picker |
| drawer.tsx | No | vaul library |

### shadcn-ui Configuration

**File**: `apps/admin-dashboard/components.json`

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "app/styles/globals.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

---

## 3. Base UI vs Radix UI Comparison

### Architecture Differences

#### Package Structure

**Radix UI** (13 packages):
```bash
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-tabs @radix-ui/react-popover @radix-ui/react-checkbox @radix-ui/react-avatar @radix-ui/react-progress @radix-ui/react-separator @radix-ui/react-label @radix-ui/react-alert-dialog @radix-ui/react-toast @radix-ui/react-slot
```

**Base UI** (1 package):
```bash
npm install @base-ui/react
```

#### Import Pattern

**Radix UI**:
```typescript
import * as Dialog from "@radix-ui/react-dialog"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { Slot } from "@radix-ui/react-slot"
```

**Base UI**:
```typescript
import { Dialog, Menu, Select } from "@base-ui/react"
```

### API Differences

#### Composition: `asChild` vs `render`

**Radix UI** (`asChild` prop):
```tsx
// Radix: asChild merges props onto child element
<Dialog.Trigger asChild>
  <button className="custom-button">Open</button>
</Dialog.Trigger>

<Button asChild>
  <a href="/contact">Contact</a>
</Button>
```

**Base UI** (`render` prop):
```tsx
// Base UI: render prop for explicit composition
<Dialog.Trigger render={<button className="custom-button" />}>
  Open
</Dialog.Trigger>

<Button render={<a href="/contact" />}>
  Contact
</Button>
```

#### Popup Positioning: Content vs Positioner

**Radix UI** (positioning on Content):
```tsx
<DropdownMenu.Content
  side="left"
  align="start"
  sideOffset={5}
>
  {/* Menu items */}
</DropdownMenu.Content>
```

**Base UI** (dedicated Positioner):
```tsx
<DropdownMenu.Positioner
  side="left"
  align="start"
  sideOffset={5}
>
  <DropdownMenu.Popup>
    {/* Menu items */}
  </DropdownMenu.Popup>
</DropdownMenu.Positioner>
```

#### Labels in Popups

**Radix UI** (labels anywhere):
```tsx
<DropdownMenu.Content>
  <DropdownMenu.Label>My Account</DropdownMenu.Label>
  <DropdownMenu.Item>Profile</DropdownMenu.Item>
</DropdownMenu.Content>
```

**Base UI** (labels must be in Group):
```tsx
<DropdownMenu.Popup>
  <DropdownMenu.Group>
    <DropdownMenu.GroupLabel>My Account</DropdownMenu.GroupLabel>
    <DropdownMenu.Item>Profile</DropdownMenu.Item>
  </DropdownMenu.Group>
</DropdownMenu.Popup>
```

### Feature Comparison

| Feature | Radix UI | Base UI |
|---------|----------|---------|
| Dialog | Yes | Yes |
| Alert Dialog | Yes | Yes |
| Dropdown Menu | Yes | Yes (Menu) |
| Context Menu | Yes | Yes |
| Select | Single only | Single + **Multiple** |
| Combobox | No (needs cmdk) | **Yes (built-in)** |
| Autocomplete | No | **Yes** |
| Tabs | Yes | Yes |
| Accordion | Yes | Yes |
| Popover | Yes | Yes |
| Tooltip | Yes | Yes |
| Checkbox | Yes | Yes |
| Radio Group | Yes | Yes |
| Switch | Yes | Yes |
| Slider | Yes | Yes |
| Progress | Yes | Yes |
| Avatar | Yes | Yes |
| Separator | Yes | Yes |
| Scroll Area | Yes | Yes |
| Navigation Menu | Yes | Yes |
| Toast | Yes | Yes (Sonner recommended) |

---

## 4. Migration Strategy

### Using basecn Registry

[basecn](https://basecn.dev/) provides pre-built shadcn/ui-style components built on Base UI. This is the recommended approach for migration.

#### Step 1: Configure Namespaced Registry

Add basecn to your `components.json`:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "app/styles/globals.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  },
  "registries": {
    "@basecn": "https://basecn.dev/r/{name}.json"
  }
}
```

#### Step 2: Install Base UI Package

```bash
pnpm add @base-ui/react
```

#### Step 3: Install Components from basecn

```bash
# Install individual components
npx shadcn@latest add @basecn/dialog
npx shadcn@latest add @basecn/dropdown-menu
npx shadcn@latest add @basecn/select
npx shadcn@latest add @basecn/tabs
npx shadcn@latest add @basecn/popover
npx shadcn@latest add @basecn/checkbox
npx shadcn@latest add @basecn/avatar
npx shadcn@latest add @basecn/progress
npx shadcn@latest add @basecn/separator
```

---

### 🚀 Preset Approach for New Projects

For **NEW projects** starting with Base UI (not migrations), use the shadcn preset URL approach. This section provides guidance for creating future KidKazz frontend applications (POS, E-Commerce, Mobile Apps) with pre-configured Base UI setups.

**Important**: This section is for **new project creation only**. For migrating existing projects like admin-dashboard, continue with the manual migration approach documented in this guide.

---

#### Option 1: Create with Preset (Try First)

Use the `shadcn create --preset` command with a pre-configured URL:

**Example: New POS System**
```bash
pnpm dlx shadcn@latest create --preset "https://ui.shadcn.com/init?base=base&style=mira&baseColor=zinc&theme=zinc&iconLibrary=lucide&font=inter&menuAccent=bold&menuColor=default&radius=medium&template=vite" kidkazz-pos
```

**What This Does**:
1. Creates a new Vite project in `kidkazz-pos/` directory
2. Installs Base UI dependencies (`@base-ui/react`, `tailwindcss-animate`, etc.)
3. Generates `components.json` with basecn registry pre-configured
4. Sets up Tailwind CSS with specified colors and fonts
5. Configures preset styles (mira = compact, touch-friendly)

**⚠️ Known Issues (December 2025)**:

The `shadcn create --preset` command has active bugs (GitHub Issues #9043, #9064, #9081):
- **Registry 400 errors** with pnpm (use npm or yarn as workaround)
- **Windows EPERM errors** (run from C:\temp or use WSL)
- **--src-dir flag failures** (avoid using --src-dir with presets)

**Recommendation**: Always have **Option 2 (Manual Setup)** ready as fallback. See complete troubleshooting in [SHADCN_PRESET_SETUP_GUIDE.md](./SHADCN_PRESET_SETUP_GUIDE.md#troubleshooting).

---

#### Option 2: Manual Setup (Recommended Fallback)

If the preset command fails (or for guaranteed success), use manual setup:

**Step 1: Create Project**
```bash
# Create Vite project
pnpm create vite kidkazz-pos --template react-ts
cd kidkazz-pos
```

**Step 2: Install Dependencies**
```bash
# Install Base UI and utilities
pnpm add @base-ui/react tailwindcss-animate class-variance-authority clsx tailwind-merge lucide-react

# Install dev dependencies
pnpm add -D tailwindcss postcss autoprefixer
```

**Step 3: Initialize Tailwind CSS**
```bash
npx tailwindcss init -p
```

**Step 4: Create components.json**

Create `components.json` at project root (copy from preset template or use admin-dashboard as reference):

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  },
  "registries": {
    "@basecn": "https://basecn.dev/r/{name}.json"
  }
}
```

**Step 5: Configure Tailwind CSS**

Update `tailwind.config.js` (see [SHADCN_PRESET_SETUP_GUIDE.md](./SHADCN_PRESET_SETUP_GUIDE.md#cli-command-examples) for complete configuration).

**Step 6: Add Global CSS**

Create `src/index.css` with Tailwind directives and CSS variables (see complete example in preset guide).

**Step 7: Install Base UI Components**
```bash
pnpm dlx shadcn@latest add @basecn/button @basecn/card @basecn/input @basecn/label @basecn/dialog @basecn/select
```

**Manual Setup Time**: 10-15 minutes (reliable, no dependency on buggy preset command)

---

#### Preset Templates by App Type

For complete preset URLs and configurations, see **[SHADCN_PRESET_SETUP_GUIDE.md](./SHADCN_PRESET_SETUP_GUIDE.md)**:

| App Type | Style | Base Color | Theme | Font | Radius | Template | Use Case |
|----------|-------|------------|-------|------|--------|----------|----------|
| **Admin Dashboard** | default | slate | slate | inter | small | vite | Internal staff, data-focused |
| **POS System** | mira | zinc | zinc | inter | medium | vite | Store cashiers, touch-friendly |
| **Retail E-Commerce** | nova | slate | purple | nunito | large | next | Parents (B2C), SEO-optimized |
| **Wholesale E-Commerce** | default | slate | blue | inter | small | next | Business buyers (B2B) |
| **Mobile Admin** | mira | slate | slate | inter | medium | expo | Managers on-the-go |

**Style Descriptions**:
- **default**: Classic shadcn, professional, traditional
- **mira**: **Compact, dense** - ideal for data-heavy interfaces and small screens
- **nova**: **Spacious, modern** - ideal for browsing and consumer-facing apps

**Radius Mapping**:
- **small** (0.5rem): Compact, data-focused layouts
- **medium** (1rem): Balanced, touch-friendly
- **large** (1.5rem): Soft, playful, approachable

---

#### Workflow for New Project Creation

**1. Choose Preset Template**

Select appropriate preset from [SHADCN_PRESET_SETUP_GUIDE.md](./SHADCN_PRESET_SETUP_GUIDE.md#kidkazz-preset-templates) based on:
- Target audience (internal staff, parents, business buyers)
- Design priority (professional, playful, efficient)
- Framework needs (SEO with Next.js, SPA with Vite, native with Expo)

**2. Attempt Preset Command**
```bash
pnpm dlx shadcn@latest create --preset "<PRESET_URL>" project-name
```

**3. If Preset Fails → Manual Setup**

Use Option 2 fallback (10-15 minutes, guaranteed success).

**4. Configure basecn Registry**

Ensure `components.json` has basecn registry:
```json
{
  "registries": {
    "@basecn": "https://basecn.dev/r/{name}.json"
  }
}
```

**5. Install Base UI Components**
```bash
pnpm dlx shadcn@latest add @basecn/button @basecn/card @basecn/dialog @basecn/select @basecn/input @basecn/label @basecn/tabs @basecn/popover
```

**6. Apply KidKazz Brand Customization**

Add custom colors to `src/index.css` (per [UI_DESIGN_GUIDELINE.md](./UI_DESIGN_GUIDELINE.md)):
```css
:root {
  /* KidKazz Brand Colors */
  --primary: 262.1 83.3% 57.8%;        /* #8B5CF6 - Purple */
  --secondary: 199 89% 48%;             /* #0EA5E9 - Sky Blue */
  --accent-pink: 330 81% 60%;          /* #F472B6 */
  --accent-yellow: 48 96% 53%;         /* #FACC15 */
  --accent-green: 142 71% 45%;         /* #22C55E */
}
```

**7. Follow UI Design Guidelines**

Implement typography, spacing, and component patterns per UI_DESIGN_GUIDELINE.md.

**8. Test & Validate**
- [ ] Components render correctly
- [ ] Accessibility (keyboard navigation, ARIA attributes)
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Brand colors applied
- [ ] No console errors

---

#### Quick Reference: Preset Parameters

| Parameter | Options | Purpose | KidKazz Standard |
|-----------|---------|---------|------------------|
| `base` | radix \| **base** | Component library | **base** (always) |
| `style` | default \| **mira** \| nova \| vega \| lyra \| maia | Visual style | default or mira |
| `baseColor` | **slate** \| gray \| zinc \| neutral \| stone | Neutral palette | slate or zinc |
| `theme` | slate \| **purple** \| blue \| zinc \| (any) | Brand color | Varies by app |
| `iconLibrary` | **lucide** \| tabler \| hugeicons | Icon set | **lucide** (always) |
| `font` | **inter** \| nunito \| figtree \| (many) | Typography | inter or nunito |
| `menuAccent` | **subtle** \| bold | Menu emphasis | subtle or bold |
| `radius` | **small** \| medium \| large \| default \| none | Border radius | Varies by app |
| `template` | **vite** \| next \| remix \| expo | Framework | vite or next |

---

#### Example: Creating POS System

**Full Command**:
```bash
pnpm dlx shadcn@latest create --preset "https://ui.shadcn.com/init?base=base&style=mira&baseColor=zinc&theme=zinc&iconLibrary=lucide&font=inter&menuAccent=bold&menuColor=default&radius=medium&template=vite" kidkazz-pos
```

**If Command Fails → Manual Setup**:
```bash
pnpm create vite kidkazz-pos --template react-ts
cd kidkazz-pos
pnpm add @base-ui/react tailwindcss-animate class-variance-authority clsx tailwind-merge lucide-react
# Configure components.json, tailwind.config.js, src/index.css (see preset guide)
pnpm dlx shadcn@latest add @basecn/button @basecn/card
```

**Rationale**:
- **mira style**: Compact layouts for efficient POS interface
- **zinc theme**: Neutral, non-distracting for fast transactions
- **medium radius**: Touch-friendly targets for touchscreen
- **bold menu accent**: Quick visual scanning
- **vite template**: Fast dev, offline PWA capability

---

### Component-by-Component Mapping

| Radix Component | basecn Component | Command |
|-----------------|------------------|---------|
| alert-dialog | @basecn/alert-dialog | `npx shadcn@latest add @basecn/alert-dialog` |
| avatar | @basecn/avatar | `npx shadcn@latest add @basecn/avatar` |
| checkbox | @basecn/checkbox | `npx shadcn@latest add @basecn/checkbox` |
| dialog | @basecn/dialog | `npx shadcn@latest add @basecn/dialog` |
| dropdown-menu | @basecn/dropdown-menu | `npx shadcn@latest add @basecn/dropdown-menu` |
| label | @basecn/label | `npx shadcn@latest add @basecn/label` |
| popover | @basecn/popover | `npx shadcn@latest add @basecn/popover` |
| progress | @basecn/progress | `npx shadcn@latest add @basecn/progress` |
| select | @basecn/select | `npx shadcn@latest add @basecn/select` |
| separator | @basecn/separator | `npx shadcn@latest add @basecn/separator` |
| tabs | @basecn/tabs | `npx shadcn@latest add @basecn/tabs` |

### Migration Approach

#### Option A: Gradual Migration (Recommended)

1. Keep both Radix UI and Base UI packages temporarily
2. Migrate one component at a time
3. Test each component after migration
4. Remove Radix packages once all components are migrated

```bash
# Example: Migrate dialog first
npx shadcn@latest add @basecn/dialog --overwrite

# Test thoroughly, then proceed to next component
npx shadcn@latest add @basecn/dropdown-menu --overwrite
```

#### Option B: Full Migration

1. Install all basecn components at once
2. Update all imports across the codebase
3. Remove all Radix packages
4. Comprehensive testing

```bash
# Install all components
npx shadcn@latest add @basecn/dialog @basecn/dropdown-menu @basecn/select @basecn/tabs @basecn/popover @basecn/checkbox @basecn/avatar @basecn/progress @basecn/separator @basecn/alert-dialog @basecn/label --overwrite
```

---

## 5. Component Migration Reference

### Dialog / AlertDialog

#### Radix UI (Current)
```tsx
import * as AlertDialog from "@radix-ui/react-alert-dialog"

<AlertDialog.Root>
  <AlertDialog.Trigger asChild>
    <Button variant="outline">Delete</Button>
  </AlertDialog.Trigger>
  <AlertDialog.Portal>
    <AlertDialog.Overlay className="fixed inset-0 bg-black/50" />
    <AlertDialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg">
      <AlertDialog.Title>Are you sure?</AlertDialog.Title>
      <AlertDialog.Description>
        This action cannot be undone.
      </AlertDialog.Description>
      <AlertDialog.Cancel asChild>
        <Button variant="outline">Cancel</Button>
      </AlertDialog.Cancel>
      <AlertDialog.Action asChild>
        <Button variant="destructive">Delete</Button>
      </AlertDialog.Action>
    </AlertDialog.Content>
  </AlertDialog.Portal>
</AlertDialog.Root>
```

#### Base UI (Target)
```tsx
import { AlertDialog } from "@base-ui/react"

<AlertDialog.Root>
  <AlertDialog.Trigger render={<Button variant="outline" />}>
    Delete
  </AlertDialog.Trigger>
  <AlertDialog.Portal>
    <AlertDialog.Backdrop className="fixed inset-0 bg-black/50" />
    <AlertDialog.Popup className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg">
      <AlertDialog.Title>Are you sure?</AlertDialog.Title>
      <AlertDialog.Description>
        This action cannot be undone.
      </AlertDialog.Description>
      <AlertDialog.Close render={<Button variant="outline" />}>
        Cancel
      </AlertDialog.Close>
      <AlertDialog.Close render={<Button variant="destructive" />}>
        Delete
      </AlertDialog.Close>
    </AlertDialog.Popup>
  </AlertDialog.Portal>
</AlertDialog.Root>
```

### DropdownMenu

#### Radix UI (Current)
```tsx
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"

<DropdownMenu.Root>
  <DropdownMenu.Trigger asChild>
    <Button variant="outline">Options</Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Portal>
    <DropdownMenu.Content
      className="min-w-[200px] bg-white rounded-md shadow-lg p-1"
      sideOffset={5}
    >
      <DropdownMenu.Label className="px-2 py-1.5 text-sm font-semibold">
        My Account
      </DropdownMenu.Label>
      <DropdownMenu.Separator className="h-px bg-gray-200 my-1" />
      <DropdownMenu.Item className="px-2 py-1.5 text-sm cursor-pointer hover:bg-gray-100 rounded">
        Profile
      </DropdownMenu.Item>
      <DropdownMenu.Item className="px-2 py-1.5 text-sm cursor-pointer hover:bg-gray-100 rounded">
        Settings
      </DropdownMenu.Item>
      <DropdownMenu.Sub>
        <DropdownMenu.SubTrigger className="px-2 py-1.5 text-sm cursor-pointer hover:bg-gray-100 rounded">
          More
        </DropdownMenu.SubTrigger>
        <DropdownMenu.SubContent>
          {/* Sub items */}
        </DropdownMenu.SubContent>
      </DropdownMenu.Sub>
    </DropdownMenu.Content>
  </DropdownMenu.Portal>
</DropdownMenu.Root>
```

#### Base UI (Target)
```tsx
import { Menu } from "@base-ui/react"

<Menu.Root>
  <Menu.Trigger render={<Button variant="outline" />}>
    Options
  </Menu.Trigger>
  <Menu.Portal>
    <Menu.Positioner sideOffset={5}>
      <Menu.Popup className="min-w-[200px] bg-white rounded-md shadow-lg p-1">
        <Menu.Group>
          <Menu.GroupLabel className="px-2 py-1.5 text-sm font-semibold">
            My Account
          </Menu.GroupLabel>
          <Menu.Separator className="h-px bg-gray-200 my-1" />
          <Menu.Item className="px-2 py-1.5 text-sm cursor-pointer hover:bg-gray-100 rounded">
            Profile
          </Menu.Item>
          <Menu.Item className="px-2 py-1.5 text-sm cursor-pointer hover:bg-gray-100 rounded">
            Settings
          </Menu.Item>
        </Menu.Group>
        <Menu.Submenu>
          <Menu.SubmenuTrigger className="px-2 py-1.5 text-sm cursor-pointer hover:bg-gray-100 rounded">
            More
          </Menu.SubmenuTrigger>
          <Menu.Portal>
            <Menu.Positioner>
              <Menu.Popup>
                {/* Sub items */}
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Submenu>
      </Menu.Popup>
    </Menu.Positioner>
  </Menu.Portal>
</Menu.Root>
```

### Select

#### Radix UI (Current)
```tsx
import * as Select from "@radix-ui/react-select"

<Select.Root>
  <Select.Trigger className="flex items-center justify-between px-3 py-2 border rounded-md">
    <Select.Value placeholder="Select option" />
    <Select.Icon>
      <ChevronDown className="h-4 w-4" />
    </Select.Icon>
  </Select.Trigger>
  <Select.Portal>
    <Select.Content className="bg-white rounded-md shadow-lg">
      <Select.ScrollUpButton />
      <Select.Viewport>
        <Select.Group>
          <Select.Label>Fruits</Select.Label>
          <Select.Item value="apple">
            <Select.ItemText>Apple</Select.ItemText>
            <Select.ItemIndicator>
              <Check className="h-4 w-4" />
            </Select.ItemIndicator>
          </Select.Item>
        </Select.Group>
      </Select.Viewport>
      <Select.ScrollDownButton />
    </Select.Content>
  </Select.Portal>
</Select.Root>
```

#### Base UI (Target)
```tsx
import { Select } from "@base-ui/react"

<Select.Root>
  <Select.Trigger className="flex items-center justify-between px-3 py-2 border rounded-md">
    <Select.Value placeholder="Select option" />
    <Select.Icon>
      <ChevronDown className="h-4 w-4" />
    </Select.Icon>
  </Select.Trigger>
  <Select.Portal>
    <Select.Positioner>
      <Select.Popup className="bg-white rounded-md shadow-lg">
        <Select.Group>
          <Select.GroupLabel>Fruits</Select.GroupLabel>
          <Select.Item value="apple">
            <Select.ItemText>Apple</Select.ItemText>
            <Select.ItemIndicator>
              <Check className="h-4 w-4" />
            </Select.ItemIndicator>
          </Select.Item>
        </Select.Group>
      </Select.Popup>
    </Select.Positioner>
  </Select.Portal>
</Select.Root>

{/* NEW: Multi-select (not available in Radix) */}
<Select.Root multiple>
  <Select.Trigger>
    <Select.Value placeholder="Select fruits" />
  </Select.Trigger>
  {/* Same structure, supports multiple selection */}
</Select.Root>
```

### Tabs

#### Radix UI (Current)
```tsx
import * as Tabs from "@radix-ui/react-tabs"

<Tabs.Root defaultValue="tab1">
  <Tabs.List className="flex border-b">
    <Tabs.Trigger
      value="tab1"
      className="px-4 py-2 data-[state=active]:border-b-2 data-[state=active]:border-primary"
    >
      Account
    </Tabs.Trigger>
    <Tabs.Trigger
      value="tab2"
      className="px-4 py-2 data-[state=active]:border-b-2 data-[state=active]:border-primary"
    >
      Settings
    </Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="tab1" className="p-4">
    Account content
  </Tabs.Content>
  <Tabs.Content value="tab2" className="p-4">
    Settings content
  </Tabs.Content>
</Tabs.Root>
```

#### Base UI (Target)
```tsx
import { Tabs } from "@base-ui/react"

<Tabs.Root defaultValue="tab1">
  <Tabs.List className="flex border-b">
    <Tabs.Tab
      value="tab1"
      className="px-4 py-2 data-[selected]:border-b-2 data-[selected]:border-primary"
    >
      Account
    </Tabs.Tab>
    <Tabs.Tab
      value="tab2"
      className="px-4 py-2 data-[selected]:border-b-2 data-[selected]:border-primary"
    >
      Settings
    </Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel value="tab1" className="p-4">
    Account content
  </Tabs.Panel>
  <Tabs.Panel value="tab2" className="p-4">
    Settings content
  </Tabs.Panel>
</Tabs.Root>
```

### Button with Polymorphism

#### Radix UI (Current - using Slot)
```tsx
import { Slot } from "@radix-ui/react-slot"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp className={cn(buttonVariants(), className)} ref={ref} {...props} />
    )
  }
)

// Usage
<Button asChild>
  <a href="/contact">Contact</a>
</Button>
```

#### Base UI (Target - using render prop)
```tsx
import { useRender } from "@base-ui/react"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  render?: React.ReactElement
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, render, children, ...props }, ref) => {
    const { renderElement } = useRender()

    return renderElement(
      render ?? <button />,
      { className: cn(buttonVariants(), className), ref, ...props },
      children
    )
  }
)

// Usage
<Button render={<a href="/contact" />}>
  Contact
</Button>
```

---

## 6. Code Examples

### Prop Name Changes Quick Reference

| Radix UI | Base UI | Notes |
|----------|---------|-------|
| `asChild` | `render={<Element />}` | Polymorphism pattern |
| `Content` | `Popup` | Popup content wrapper |
| `Overlay` | `Backdrop` | Modal backdrop |
| `Trigger` | `Trigger` | Same name |
| `data-[state=open]` | `data-[open]` | State attribute |
| `data-[state=active]` | `data-[selected]` | Tabs active state |
| `sideOffset` on Content | `sideOffset` on Positioner | Moved to Positioner |
| `side` on Content | `side` on Positioner | Moved to Positioner |
| `align` on Content | `align` on Positioner | Moved to Positioner |

### Data Attribute Changes

```css
/* Radix UI */
[data-state="open"] { /* ... */ }
[data-state="closed"] { /* ... */ }
[data-state="active"] { /* ... */ }
[data-disabled] { /* ... */ }

/* Base UI */
[data-open] { /* ... */ }
[data-closed] { /* ... */ }
[data-selected] { /* ... */ }
[data-disabled] { /* ... */ }
```

### Tailwind Class Updates

```tsx
// Radix UI classes
className="data-[state=open]:animate-in data-[state=closed]:animate-out"

// Base UI classes
className="data-[open]:animate-in data-[closed]:animate-out"
```

---

## 7. Testing & Validation

### Visual Regression Testing

After migrating each component, verify:

1. **Appearance**: Component looks identical to the Radix version
2. **Animations**: Enter/exit animations work correctly
3. **Dark mode**: Theme switching works properly
4. **Responsive**: Component adapts to different screen sizes

### Accessibility Testing

Use these tools to verify accessibility:

1. **axe DevTools**: Chrome extension for automated a11y testing
2. **Keyboard navigation**: Test Tab, Enter, Escape, Arrow keys
3. **Screen reader**: Test with VoiceOver (Mac) or NVDA (Windows)

Checklist:
- [ ] Focus management works correctly
- [ ] ARIA attributes are present
- [ ] Keyboard shortcuts work
- [ ] Screen reader announces component state

### Functional Testing

For each component:

1. **Open/Close**: Triggers work correctly
2. **Selection**: Items can be selected
3. **State management**: Controlled/uncontrolled modes work
4. **Events**: onOpenChange, onValueChange, etc. fire correctly

### Test Script Example

```typescript
// tests/components/dialog.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { Dialog } from '@/components/ui/dialog'

describe('Dialog (Base UI)', () => {
  it('opens when trigger is clicked', () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Test Dialog</DialogTitle>
        </DialogContent>
      </Dialog>
    )

    fireEvent.click(screen.getByText('Open'))
    expect(screen.getByText('Test Dialog')).toBeVisible()
  })

  it('closes on escape key', () => {
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogTitle>Test Dialog</DialogTitle>
        </DialogContent>
      </Dialog>
    )

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByText('Test Dialog')).not.toBeVisible()
  })
})
```

---

## 8. Implementation Checklist

### Pre-Migration

- [ ] Audit current Radix UI usage (complete - see Section 2)
- [ ] Document custom modifications to shadcn components
- [ ] Create migration branch
- [ ] Set up visual regression testing (optional)

### Per-App Migration Checklist

#### admin-dashboard

| Component | Status | Notes |
|-----------|--------|-------|
| alert-dialog.tsx | [x] Complete | Migrated to Base UI |
| avatar.tsx | [x] Complete | Migrated to Base UI |
| button.tsx | [x] Complete | Migrated to Base UI |
| breadcrumb.tsx | [x] Complete | Uses Base UI useRender hook |
| checkbox.tsx | [x] Complete | Migrated to Base UI |
| dialog.tsx | [x] Complete | Migrated to Base UI |
| dropdown-menu.tsx | [x] Complete | Migrated to Base UI Menu |
| label.tsx | [x] Complete | Native HTML implementation |
| popover.tsx | [x] Complete | Migrated to Base UI |
| progress.tsx | [x] Complete | Migrated to Base UI |
| select.tsx | [x] Complete | Migrated to Base UI |
| separator.tsx | [x] Complete | Migrated to Base UI |
| tabs.tsx | [x] Complete | Migrated to Base UI |
| command.tsx | [x] Complete | Updated to use Base UI Dialog types |
| toast.tsx | [x] Complete | Using Sonner (shadcn recommended) |

#### ✨ New Projects (POS, E-Commerce, Mobile Apps)

For new projects starting with Base UI, follow this comprehensive setup checklist:

**Before Starting**:
- [ ] Review [SHADCN_PRESET_SETUP_GUIDE.md](./SHADCN_PRESET_SETUP_GUIDE.md) for complete preset templates
- [ ] Select appropriate preset URL for app type (POS, Retail, Wholesale, Mobile)
- [ ] Verify Base UI compatibility requirements
- [ ] Check for latest shadcn CLI known issues (GitHub)

**Setup Process**:
- [ ] Attempt `shadcn create --preset` command with chosen preset URL
- [ ] If create command fails (400 errors, EPERM), use manual setup fallback
- [ ] Configure basecn registry in components.json: `"@basecn": "https://basecn.dev/r/{name}.json"`
- [ ] Install @base-ui/react package
- [ ] Install Base UI components from @basecn registry
- [ ] Apply KidKazz brand colors (purple, sky blue, accent colors) to CSS variables
- [ ] Configure fonts (Inter for admin/B2B, Nunito for retail/B2C)
- [ ] Follow UI_DESIGN_GUIDELINE.md for typography, spacing, and component patterns
- [ ] Test component rendering and functionality
- [ ] Set up Tailwind CSS with correct content paths
- [ ] Verify CSS variables are defined in globals.css
- [ ] Test responsive design (mobile, tablet, desktop)
- [ ] Validate accessibility (keyboard nav, screen readers, ARIA)
- [ ] Configure ESLint + Prettier for code quality

**Post-Setup Validation**:
- [ ] Dev server runs without errors
- [ ] All installed components render correctly
- [ ] No console errors/warnings
- [ ] Brand colors match UI_DESIGN_GUIDELINE.md
- [ ] Typography hierarchy correct
- [ ] Accessibility audit passing (WCAG 2.1 AA)

**Recommended First Components**:
```bash
pnpm dlx shadcn@latest add @basecn/button @basecn/card @basecn/input @basecn/label @basecn/dialog @basecn/select @basecn/tabs @basecn/popover
```

### Post-Migration

- [ ] Remove all @radix-ui/* packages from package.json
- [ ] Run full test suite
- [ ] Update documentation
- [ ] Performance benchmark comparison

### Rollout Strategy

1. **Phase 1**: Migrate non-critical components (avatar, separator, progress)
2. **Phase 2**: Migrate form components (checkbox, select, label)
3. **Phase 3**: Migrate complex components (dialog, dropdown-menu)
4. **Phase 4**: Migrate all remaining components
5. **Phase 5**: Remove Radix dependencies, final testing

---

## 9. Resources

### Official Documentation

- **Base UI**: https://base-ui.com/
- **basecn (shadcn + Base UI)**: https://basecn.dev/
- **shadcn/ui**: https://ui.shadcn.com/
- **shadcn/ui Changelog**: https://ui.shadcn.com/docs/changelog

### Migration Guides

- **basecn Migration Guide**: https://basecn.dev/docs/get-started/migrating-from-radix-ui
- **GitHub Discussion**: https://github.com/shadcn-ui/ui/discussions/6248

### Source Code

- **basecn GitHub**: https://github.com/akash3444/basecn
- **Base UI GitHub**: https://github.com/mui/base-ui

### Community

- **shadcn/ui Discord**: https://discord.gg/shadcn-ui
- **Base UI Issues**: https://github.com/mui/base-ui/issues

---

## Appendix: Quick Decision Guide

### Should We Migrate?

**Migrate NOW if:**
- Starting a new app/project
- Experiencing Radix UI bugs with no fixes
- Need multi-select or built-in combobox
- Want to simplify dependencies

**Wait to Migrate if:**
- Current app is stable and working
- No immediate need for Base UI features
- Limited testing resources
- Major release deadline approaching

### basecn vs Manual Migration

**Use basecn if:**
- Want pre-styled components matching shadcn aesthetic
- Prefer copy-paste workflow
- Need quick migration with minimal changes

**Manual Migration if:**
- Have heavily customized components
- Need specific Base UI features not in basecn
- Want full control over implementation

---

**Document Version**: 1.0.0
**Last Updated**: December 2025
**Maintained by**: KidKazz Engineering Team

---

## Related Documentation

- [UI Design Guideline](./UI_DESIGN_GUIDELINE.md) - Design system principles
- [shadcn/UI Refactoring Guide](./SHADCN_UI_REFACTORING_GUIDE.md) - Component usage patterns
