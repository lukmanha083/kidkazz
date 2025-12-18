# Base UI Migration Guide

> **Comprehensive guide for migrating from Radix UI to Base UI across all KidKazz applications**
>
> Version: 1.0.0 | Last Updated: December 2025

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
| alert-dialog.tsx | [ ] Pending | |
| avatar.tsx | [ ] Pending | |
| button.tsx | [ ] Pending | Uses Slot for asChild |
| breadcrumb.tsx | [ ] Pending | Uses Slot for asChild |
| checkbox.tsx | [ ] Pending | |
| dialog.tsx | [ ] Pending | |
| dropdown-menu.tsx | [ ] Pending | |
| label.tsx | [ ] Pending | |
| popover.tsx | [ ] Pending | |
| progress.tsx | [ ] Pending | |
| select.tsx | [ ] Pending | |
| separator.tsx | [ ] Pending | |
| tabs.tsx | [ ] Pending | |
| command.tsx | [ ] Pending | Uses Dialog type |

#### Future Apps (POS, E-Commerce, Mobile)

- Use Base UI from the start
- Configure basecn registry in components.json
- Follow the same component patterns

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
