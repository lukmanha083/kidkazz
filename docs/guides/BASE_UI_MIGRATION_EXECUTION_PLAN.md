# Base UI Migration Execution Plan

> **Phased migration from Radix UI to Base UI for Kidkazz Admin Dashboard**
>
> Status: Planning Complete | Execution: Pending
> Last Updated: December 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Pre-requisites](#pre-requisites)
3. [Phase 1: Setup & Simple Components](#phase-1-setup--simple-components)
4. [Phase 2: Button & Slot Pattern](#phase-2-button--slot-pattern)
5. [Phase 3: Tabs & Toast](#phase-3-tabs--toast)
6. [Phase 4: Dialog & AlertDialog](#phase-4-dialog--alertdialog)
7. [Phase 5: Select Component](#phase-5-select-component)
8. [Phase 6: Popover Component](#phase-6-popover-component)
9. [Phase 7: Dropdown Menu](#phase-7-dropdown-menu)
10. [Phase 8: Command & Combobox](#phase-8-command--combobox)
11. [Phase 9: Data Table Ecosystem](#phase-9-data-table-ecosystem)
12. [Phase 10: Cleanup & Optimization](#phase-10-cleanup--optimization)
13. [Rollback Procedures](#rollback-procedures)
14. [Success Criteria](#success-criteria)

---

## Overview

### Migration Summary

| Metric | Value |
|--------|-------|
| Total Components | 14 UI components + 7 data-table files |
| Total Phases | 10 |
| Radix Packages to Remove | 13 |
| Estimated Sessions | 10 (one per phase) |

### Execution Model

- **One phase per session** with validation between phases
- **Radix packages retained** until Phase 10 (enables rollback)
- **Feature branch** for all migration work
- **Test after each component** migration

### Current Radix UI Packages (13)

```
@radix-ui/react-alert-dialog    @radix-ui/react-popover
@radix-ui/react-avatar          @radix-ui/react-progress
@radix-ui/react-checkbox        @radix-ui/react-select
@radix-ui/react-dialog          @radix-ui/react-separator
@radix-ui/react-dropdown-menu   @radix-ui/react-slot
@radix-ui/react-label           @radix-ui/react-tabs
@radix-ui/react-toast
```

---

## Pre-requisites

### 1. Configure basecn Registry

**File**: `apps/admin-dashboard/components.json`

Add the basecn registry configuration:

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

### 2. Install Base UI Package

```bash
cd apps/admin-dashboard
pnpm add @base-ui/react
```

### 3. Create Feature Branch

```bash
git checkout -b feat/base-ui-migration
```

---

## Phase 1: Setup & Simple Components

### Status: [ ] Not Started

### Goal
Set up infrastructure and migrate isolated components with 0 internal dependencies.

### Components

| Component | File | Usage Count | Complexity |
|-----------|------|-------------|------------|
| Progress | `progress.tsx` | 1 file | Low |
| Avatar | `avatar.tsx` | 1 file | Low |
| Separator | `separator.tsx` | 7 files | Low |
| Label | `label.tsx` | 13 files | Low |
| Checkbox | `checkbox.tsx` | 1 file | Low |

### Commands

```bash
cd apps/admin-dashboard

# Install basecn components
npx shadcn@latest add @basecn/progress --overwrite
npx shadcn@latest add @basecn/avatar --overwrite
npx shadcn@latest add @basecn/separator --overwrite
npx shadcn@latest add @basecn/label --overwrite
npx shadcn@latest add @basecn/checkbox --overwrite
```

### Files Modified

- `src/components/ui/progress.tsx`
- `src/components/ui/avatar.tsx`
- `src/components/ui/separator.tsx`
- `src/components/ui/label.tsx`
- `src/components/ui/checkbox.tsx`

### Validation Checklist

- [ ] Progress bar renders correctly
- [ ] Avatar displays image and fallback
- [ ] Separator renders horizontal/vertical
- [ ] Label associates with form inputs
- [ ] Checkbox toggles correctly
- [ ] App runs without errors
- [ ] No console warnings

### Commit Message
```
feat(ui): migrate progress, avatar, separator, label, checkbox to Base UI

Phase 1 of Base UI migration. Migrates simple isolated components
with no internal dependencies.

Components migrated:
- progress.tsx
- avatar.tsx
- separator.tsx
- label.tsx
- checkbox.tsx
```

---

## Phase 2: Button & Slot Pattern

### Status: [ ] Not Started

### Goal
Migrate the most-used component (Button) and update `asChild` → `render` prop pattern.

### Components

| Component | File | Usage Count | Complexity |
|-----------|------|-------------|------------|
| Button | `button.tsx` | 22 files | Medium |
| Breadcrumb | `breadcrumb.tsx` | 1 file | Low |

### Key API Change

**Before (Radix - `asChild` prop)**:
```tsx
<Button asChild>
  <a href="/contact">Contact</a>
</Button>
```

**After (Base UI - `render` prop)**:
```tsx
<Button render={<a href="/contact" />}>
  Contact
</Button>
```

### Commands

```bash
npx shadcn@latest add @basecn/button --overwrite
```

### Manual Updates Required

Search and replace all `asChild` usage:

```bash
# Find all asChild usages
grep -r "asChild" apps/admin-dashboard/src/routes/
grep -r "asChild" apps/admin-dashboard/src/components/
```

### Files Modified

- `src/components/ui/button.tsx`
- `src/components/ui/breadcrumb.tsx`
- All files using `<Button asChild>` pattern (~22 files)

### Validation Checklist

- [ ] Button variants work (default, secondary, outline, ghost, destructive)
- [ ] Button sizes work (sm, default, lg, icon)
- [ ] Link buttons render as `<a>` tags
- [ ] Polymorphic buttons work with `render` prop
- [ ] Keyboard navigation works
- [ ] Loading states work (if applicable)

### Commit Message
```
feat(ui): migrate button and breadcrumb to Base UI

Phase 2 of Base UI migration. Updates asChild prop to render prop pattern.

Breaking change: asChild prop replaced with render prop
- <Button asChild><a>Link</a></Button>
+ <Button render={<a />}>Link</Button>
```

---

## Phase 3: Tabs & Toast

### Status: [ ] Not Started

### Goal
Migrate self-contained navigation and notification components.

### Components

| Component | File | Usage Count | Complexity |
|-----------|------|-------------|------------|
| Tabs | `tabs.tsx` | 2 files | Low |
| Sonner/Toast | `sonner.tsx` | 1 file | Low |

### Key API Changes

**Tabs Component Names**:
- `Tabs.Trigger` → `Tabs.Tab`
- `Tabs.Content` → `Tabs.Panel`

**Data Attributes**:
- `data-[state=active]` → `data-[selected]`

### Commands

```bash
npx shadcn@latest add @basecn/tabs --overwrite
```

### Files Modified

- `src/components/ui/tabs.tsx`
- Files using tabs (update data attributes in className)

### Validation Checklist

- [ ] Tab switching works
- [ ] Keyboard navigation (Arrow keys, Tab)
- [ ] Active tab styling
- [ ] Tab content displays correctly
- [ ] Toast notifications work
- [ ] Toast variants work (success, error, info)

### Commit Message
```
feat(ui): migrate tabs and sonner to Base UI

Phase 3 of Base UI migration.

API changes:
- TabsTrigger → TabsTab
- TabsContent → TabsPanel
- data-[state=active] → data-[selected]
```

---

## Phase 4: Dialog & AlertDialog

### Status: [ ] Not Started

### Goal
Migrate modal components.

### Components

| Component | File | Usage Count | Complexity |
|-----------|------|-------------|------------|
| Dialog | `dialog.tsx` | 7+ files | Medium |
| AlertDialog | `alert-dialog.tsx` | 1 file | Medium |

### Key API Changes

**Component Names**:
- `DialogOverlay` → `DialogBackdrop`
- `DialogContent` → `DialogPopup`
- `asChild` triggers → `render` prop

**Structure Change**:
```tsx
// Before (Radix)
<Dialog.Portal>
  <Dialog.Overlay />
  <Dialog.Content>...</Dialog.Content>
</Dialog.Portal>

// After (Base UI)
<Dialog.Portal>
  <Dialog.Backdrop />
  <Dialog.Popup>...</Dialog.Popup>
</Dialog.Portal>
```

### Commands

```bash
npx shadcn@latest add @basecn/dialog --overwrite
npx shadcn@latest add @basecn/alert-dialog --overwrite
```

### Files Modified

- `src/components/ui/dialog.tsx`
- `src/components/ui/alert-dialog.tsx`
- All files using Dialog/AlertDialog

### Validation Checklist

- [ ] Dialog opens on trigger click
- [ ] Dialog closes on backdrop click
- [ ] Dialog closes on Escape key
- [ ] Focus trapped inside dialog
- [ ] Focus returns to trigger on close
- [ ] AlertDialog blocks interaction
- [ ] AlertDialog action buttons work
- [ ] Animations work (enter/exit)

### Commit Message
```
feat(ui): migrate dialog and alert-dialog to Base UI

Phase 4 of Base UI migration.

API changes:
- DialogOverlay → DialogBackdrop
- DialogContent → DialogPopup
- asChild triggers → render prop
```

---

## Phase 5: Select Component

### Status: [ ] Not Started

### Goal
Migrate select with new multi-select capability.

### Components

| Component | File | Usage Count | Complexity |
|-----------|------|-------------|------------|
| Select | `select.tsx` | 1+ files | Medium |

### Key API Changes

**Structure Change** - Add Positioner:
```tsx
// Before (Radix)
<Select.Portal>
  <Select.Content side="bottom" align="start">
    ...
  </Select.Content>
</Select.Portal>

// After (Base UI)
<Select.Portal>
  <Select.Positioner side="bottom" align="start">
    <Select.Popup>
      ...
    </Select.Popup>
  </Select.Positioner>
</Select.Portal>
```

**NEW Feature - Multi-select**:
```tsx
<Select.Root multiple>
  <Select.Trigger>
    <Select.Value placeholder="Select items" />
  </Select.Trigger>
  ...
</Select.Root>
```

### Commands

```bash
npx shadcn@latest add @basecn/select --overwrite
```

### Files Modified

- `src/components/ui/select.tsx`
- `src/components/ui/data-table/data-table-pagination.tsx`

### Validation Checklist

- [ ] Select opens dropdown
- [ ] Items can be selected
- [ ] Selected value displays
- [ ] Keyboard navigation works
- [ ] Scroll buttons work (if many items)
- [ ] Positioning is correct
- [ ] Multi-select works (if implemented)

### Commit Message
```
feat(ui): migrate select to Base UI

Phase 5 of Base UI migration.

API changes:
- Added Positioner wrapper for positioning props
- SelectContent → SelectPopup
- NEW: multiple prop available for multi-select
```

---

## Phase 6: Popover Component

### Status: [ ] Not Started

### Goal
Migrate popover (critical for data-table filters).

### Components

| Component | File | Usage Count | Complexity |
|-----------|------|-------------|------------|
| Popover | `popover.tsx` | 5+ files | Medium |

### Key API Changes

**Structure Change** - Add Positioner:
```tsx
// Before (Radix)
<Popover.Portal>
  <Popover.Content side="bottom" align="start" sideOffset={5}>
    ...
  </Popover.Content>
</Popover.Portal>

// After (Base UI)
<Popover.Portal>
  <Popover.Positioner side="bottom" align="start" sideOffset={5}>
    <Popover.Popup>
      ...
    </Popover.Popup>
  </Popover.Positioner>
</Popover.Portal>
```

### Commands

```bash
npx shadcn@latest add @basecn/popover --overwrite
```

### Files Modified

- `src/components/ui/popover.tsx`
- `src/components/ui/date-picker.tsx`
- `src/components/ui/combobox.tsx`
- `src/components/ui/data-table/data-table-faceted-filter.tsx`

### Validation Checklist

- [ ] Popover opens on trigger
- [ ] Popover positions correctly
- [ ] Popover closes on click outside
- [ ] Popover closes on Escape
- [ ] DatePicker still works
- [ ] Data table filters work
- [ ] Focus management correct

### Commit Message
```
feat(ui): migrate popover to Base UI

Phase 6 of Base UI migration.

API changes:
- Added Positioner wrapper
- PopoverContent → PopoverPopup
- Positioning props moved to Positioner
```

---

## Phase 7: Dropdown Menu

### Status: [ ] Not Started

### Goal
Migrate dropdown menus (used in data-table actions).

### Components

| Component | File | Usage Count | Complexity |
|-----------|------|-------------|------------|
| DropdownMenu | `dropdown-menu.tsx` | 5+ files | High |

### Key API Changes

**Component Renaming**:
- `DropdownMenu` → `Menu`
- `DropdownMenuContent` → `Menu.Popup`
- `DropdownMenuItem` → `Menu.Item`

**Structure Change** - Labels in Group:
```tsx
// Before (Radix)
<DropdownMenu.Content>
  <DropdownMenu.Label>My Account</DropdownMenu.Label>
  <DropdownMenu.Item>Profile</DropdownMenu.Item>
</DropdownMenu.Content>

// After (Base UI)
<Menu.Positioner>
  <Menu.Popup>
    <Menu.Group>
      <Menu.GroupLabel>My Account</Menu.GroupLabel>
      <Menu.Item>Profile</Menu.Item>
    </Menu.Group>
  </Menu.Popup>
</Menu.Positioner>
```

### Commands

```bash
npx shadcn@latest add @basecn/dropdown-menu --overwrite
```

### Files Modified

- `src/components/ui/dropdown-menu.tsx`
- `src/components/ui/data-table/data-table-toolbar.tsx`
- `src/components/ui/data-table/data-table-row-actions.tsx`

### Validation Checklist

- [ ] Menu opens on trigger
- [ ] Menu items clickable
- [ ] Submenu works
- [ ] Keyboard navigation works
- [ ] Menu closes on selection
- [ ] Menu closes on click outside
- [ ] Data table row actions work
- [ ] Data table toolbar menu works

### Commit Message
```
feat(ui): migrate dropdown-menu to Base UI

Phase 7 of Base UI migration.

API changes:
- DropdownMenu → Menu
- Added Positioner wrapper
- Labels must be in Menu.Group
```

---

## Phase 8: Command & Combobox

### Status: [ ] Not Started

### Goal
Migrate command palette and combobox components (most complex).

### Components

| Component | File | Usage Count | Complexity |
|-----------|------|-------------|------------|
| Command | `command.tsx` | 3+ files | High |
| Combobox | `combobox.tsx` | 3 files | High |

### Key Considerations

- Command currently uses `cmdk` library + Dialog
- Base UI has built-in Combobox/Autocomplete
- Evaluate if `cmdk` is still needed

### Commands

```bash
npx shadcn@latest add @basecn/command --overwrite
npx shadcn@latest add @basecn/combobox --overwrite
```

### Files Modified

- `src/components/ui/command.tsx`
- `src/components/ui/combobox.tsx`
- `src/components/ui/data-table/data-table-faceted-filter.tsx`

### Validation Checklist

- [ ] Command palette opens
- [ ] Search/filter works
- [ ] Items can be selected
- [ ] Keyboard navigation works
- [ ] Command dialog works
- [ ] Combobox search works
- [ ] Combobox selection works
- [ ] Data table faceted filter works

### Commit Message
```
feat(ui): migrate command and combobox to Base UI

Phase 8 of Base UI migration.

Most complex phase - handles command palette and combobox
which are used in data table faceted filters.
```

---

## Phase 9: Data Table Ecosystem

### Status: [ ] Not Started

### Goal
Ensure all data-table components work with migrated UI components.

### Components

| Component | File | Dependencies |
|-----------|------|--------------|
| DataTableFacetedFilter | `data-table-faceted-filter.tsx` | Popover + Command |
| DataTableToolbar | `data-table-toolbar.tsx` | DropdownMenu |
| DataTableRowActions | `data-table-row-actions.tsx` | DropdownMenu |
| DataTablePagination | `data-table-pagination.tsx` | Button + Select |
| DataTableViewOptions | `data-table-view-options.tsx` | DropdownMenu |

### Files to Update

```
apps/admin-dashboard/src/components/ui/data-table/
├── data-table.tsx
├── data-table-column-header.tsx
├── data-table-faceted-filter.tsx  ← CRITICAL (Popover + Command)
├── data-table-pagination.tsx
├── data-table-row-actions.tsx
├── data-table-toolbar.tsx
└── data-table-view-options.tsx
```

### Validation Checklist

- [ ] Table renders correctly
- [ ] Sorting works
- [ ] Filtering works
- [ ] Faceted filtering works
- [ ] Row actions dropdown works
- [ ] Pagination works
- [ ] View options menu works
- [ ] Column header sorting works
- [ ] Virtual scrolling works (if applicable)

### Commit Message
```
feat(ui): update data-table ecosystem for Base UI

Phase 9 of Base UI migration.

Ensures all data-table components work with
migrated UI components from phases 1-8.
```

---

## Phase 10: Cleanup & Optimization

### Status: [ ] Not Started

### Goal
Remove Radix UI packages and finalize migration.

### Tasks

1. Remove all @radix-ui/* packages
2. Update components.json
3. Run full test suite
4. Update documentation
5. Performance validation

### Commands

```bash
cd apps/admin-dashboard

# Remove all Radix UI packages
pnpm remove \
  @radix-ui/react-alert-dialog \
  @radix-ui/react-avatar \
  @radix-ui/react-checkbox \
  @radix-ui/react-dialog \
  @radix-ui/react-dropdown-menu \
  @radix-ui/react-label \
  @radix-ui/react-popover \
  @radix-ui/react-progress \
  @radix-ui/react-select \
  @radix-ui/react-separator \
  @radix-ui/react-slot \
  @radix-ui/react-tabs \
  @radix-ui/react-toast
```

### Verification Commands

```bash
# Verify no Radix imports remain
grep -r "@radix-ui" apps/admin-dashboard/src/

# Should return no results
```

### Validation Checklist

- [ ] No @radix-ui/* packages in package.json
- [ ] No @radix-ui imports in source code
- [ ] All components render correctly
- [ ] All functionality works
- [ ] No console errors/warnings
- [ ] Bundle size acceptable
- [ ] Performance acceptable

### Final Commit Message
```
feat(ui): complete Base UI migration, remove Radix UI

Phase 10 (Final) of Base UI migration.

- Removed all @radix-ui/* packages (13 total)
- Migrated 14 UI components to Base UI
- Updated 7 data-table components
- Verified all functionality

Breaking changes documented in BASE_UI_MIGRATION_GUIDE.md
```

---

## Rollback Procedures

### Phase-level Rollback

If a phase fails, revert the specific component:

```bash
# Revert specific file changes
git checkout HEAD~1 -- src/components/ui/<component>.tsx

# Or reset entire phase
git reset --hard HEAD~1
```

### Full Rollback

If migration needs to be abandoned:

```bash
# Return to main branch
git checkout main

# Delete migration branch
git branch -D feat/base-ui-migration

# Reinstall dependencies
pnpm install
```

---

## Success Criteria

### Technical Criteria

- [ ] All 14 UI components migrated to Base UI
- [ ] All 7 data-table components working
- [ ] No @radix-ui/* imports remaining
- [ ] No @radix-ui/* packages in dependencies
- [ ] All existing functionality preserved
- [ ] No regression in features

### Quality Criteria

- [ ] Keyboard navigation working
- [ ] Screen reader accessibility maintained
- [ ] Focus management correct
- [ ] Animations smooth
- [ ] Dark mode working
- [ ] Responsive design intact

### Performance Criteria

- [ ] Bundle size not significantly increased
- [ ] No performance regressions
- [ ] Component render times acceptable

---

## Progress Tracking

| Phase | Status | Date Started | Date Completed | Notes |
|-------|--------|--------------|----------------|-------|
| Pre-req | [ ] | | | |
| Phase 1 | [ ] | | | |
| Phase 2 | [ ] | | | |
| Phase 3 | [ ] | | | |
| Phase 4 | [ ] | | | |
| Phase 5 | [ ] | | | |
| Phase 6 | [ ] | | | |
| Phase 7 | [ ] | | | |
| Phase 8 | [ ] | | | |
| Phase 9 | [ ] | | | |
| Phase 10 | [ ] | | | |

---

## Related Documentation

- [Base UI Migration Guide](./BASE_UI_MIGRATION_GUIDE.md) - Comprehensive migration reference
- [UI Design Guideline](./UI_DESIGN_GUIDELINE.md) - Design system principles
- [shadcn/UI Refactoring Guide](./SHADCN_UI_REFACTORING_GUIDE.md) - Component usage patterns

---

**Document Version**: 1.0.0
**Last Updated**: December 2025
**Maintained by**: KidKazz Engineering Team
