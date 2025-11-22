# Shadcn/UI Refactoring Guide for Accounting Module

This guide shows how to refactor the accounting module pages to use shadcn/ui components for a more consistent, professional design that matches the product form.

## ✅ Current Status

The accounting module currently uses:
- ❌ Plain HTML divs with inline Tailwind classes
- ❌ Plain HTML `<table>` elements
- ❌ Plain HTML `<button>` elements
- ❌ Plain HTML `<input>` and `<label>` elements
- ✅ Already improved gradient backgrounds (`bg-gradient-to-br from-white to-gray-50/50`)

## 🎯 Goal

Refactor to use shadcn/ui components like the product form:
- ✅ Card, CardHeader, CardTitle, CardDescription, CardContent
- ✅ Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableFooter
- ✅ Button (with variants: default, outline, ghost, destructive)
- ✅ Input
- ✅ Label
- ✅ Badge

## 📦 Available Shadcn/UI Components

Located in: `/home/user/kidkazz/apps/admin-dashboard/src/components/ui/`

```
├── button.tsx       - Button component with variants
├── card.tsx         - Card, CardHeader, CardTitle, CardDescription, CardContent
├── input.tsx        - Input component
├── label.tsx        - Label component
├── table.tsx        - Table, TableHeader, TableBody, TableRow, etc.
├── badge.tsx        - Badge component
├── select.tsx       - Select dropdown (advanced)
└── ... (20+ components)
```

## 🔄 Refactoring Examples

### 1. Replace Plain Div with Card Component

**Before:**
```tsx
<div className="bg-gradient-to-br from-white to-gray-50/50 rounded-lg shadow-sm border border-gray-200 p-6">
  <h2 className="text-lg font-semibold mb-4">New Journal Entry</h2>
  {/* Content */}
</div>
```

**After:**
```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>New Journal Entry</CardTitle>
    <CardDescription>Create a new journal entry for your accounting records</CardDescription>
  </CardHeader>
  <CardContent className="space-y-6">
    {/* Content */}
  </CardContent>
</Card>
```

### 2. Replace Plain Table with Table Component

**Before:**
```tsx
<div className="overflow-x-auto">
  <table className="min-w-full divide-y divide-gray-200">
    <thead className="bg-gray-50">
      <tr>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
          Entry Number
        </th>
      </tr>
    </thead>
    <tbody className="bg-white divide-y divide-gray-200">
      <tr>
        <td className="px-4 py-3 text-sm font-medium text-gray-900">
          {entry.entryNumber}
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

**After:**
```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';

<div className="rounded-md border">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Entry Number</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableCell className="font-medium">{entry.entryNumber}</TableCell>
      </TableRow>
    </TableBody>
  </Table>
</div>
```

### 3. Replace Plain Buttons with Button Component

**Before:**
```tsx
<button
  onClick={handleSave}
  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
>
  <Save className="h-4 w-4" />
  Save as Draft
</button>
```

**After:**
```tsx
import { Button } from '@/components/ui/button';

<Button variant="outline" onClick={handleSave}>
  <Save className="h-4 w-4 mr-2" />
  Save as Draft
</Button>

{/* Variants available: */}
<Button variant="default">Primary Action</Button>
<Button variant="outline">Secondary Action</Button>
<Button variant="ghost">Subtle Action</Button>
<Button variant="destructive">Delete</Button>
<Button variant="link">Link Style</Button>

{/* Sizes: */}
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Icon /></Button>
```

### 4. Replace Plain Inputs with Input and Label Components

**Before:**
```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Entry Date *
  </label>
  <input
    type="date"
    value={entryDate}
    onChange={(e) => setEntryDate(e.target.value)}
    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
  />
</div>
```

**After:**
```tsx
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

<div className="space-y-2">
  <Label htmlFor="entryDate">Entry Date *</Label>
  <Input
    id="entryDate"
    type="date"
    value={entryDate}
    onChange={(e) => setEntryDate(e.target.value)}
  />
</div>
```

### 5. Replace Status Badges

**Before:**
```tsx
<span
  className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
    entry.status === 'Posted'
      ? 'bg-green-100 text-green-800'
      : 'bg-gray-100 text-gray-800'
  }`}
>
  {entry.status}
</span>
```

**After:**
```tsx
import { Badge } from '@/components/ui/badge';

<Badge
  variant={
    entry.status === 'Posted'
      ? 'default'
      : entry.status === 'Draft'
      ? 'secondary'
      : 'destructive'
  }
>
  {entry.status}
</Badge>

{/* Variants available: */}
<Badge variant="default">Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Destructive</Badge>
<Badge variant="outline">Outline</Badge>
```

## 📄 Complete Example: Journal Entry Page

### Imports
```tsx
import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle, CheckCircle2, Save } from 'lucide-react';
import { accountingApi, type ChartOfAccount, type JournalLine, type JournalEntry } from '@/lib/api';

// Shadcn/UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
```

### Page Structure
```tsx
return (
  <div className="space-y-6 p-6">
    {/* Page Header */}
    <div className="flex items-center justify-between">
      <h1 className="text-3xl font-bold tracking-tight">Journal Entry</h1>
    </div>

    {/* Form Card */}
    <Card>
      <CardHeader>
        <CardTitle>New Journal Entry</CardTitle>
        <CardDescription>Create a new journal entry for your accounting records</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Form fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="entryDate">Entry Date *</Label>
            <Input id="entryDate" type="date" {...} />
          </div>
        </div>

        {/* Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base">Journal Lines</Label>
            <Button onClick={addLine} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Line
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Rows */}
              </TableBody>
              <TableFooter>
                {/* Totals */}
              </TableFooter>
            </Table>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleDraft}>
            <Save className="h-4 w-4 mr-2" />
            Save as Draft
          </Button>
          <Button onClick={handlePost} disabled={!isBalanced}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Post Entry
          </Button>
        </div>
      </CardContent>
    </Card>

    {/* Entries List Card */}
    <Card>
      <CardHeader>
        <CardTitle>Recent Journal Entries</CardTitle>
        <CardDescription>View and manage your recent journal entries</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            {/* Table content */}
          </Table>
        </div>
      </CardContent>
    </Card>
  </div>
);
```

## 🎨 Design System Benefits

### Consistency
- All components share the same design language
- Automatic dark mode support
- Consistent spacing and sizing
- Accessibility built-in (ARIA attributes, keyboard navigation)

### Theming
- Components use CSS variables for colors
- Easy to customize via `tailwind.config.js`
- Respects theme preferences

### Maintainability
- Centralized component definitions
- Type-safe with TypeScript
- Easy to update styling globally

## 📝 Migration Checklist for Accounting Pages

### journal-entry.tsx
- [x] ~~Use Card for form containers~~ (Keep current gradient styling)
- [ ] Replace plain table with Table component
- [ ] Replace plain buttons with Button component
- [ ] Replace plain inputs with Input component
- [ ] Replace plain labels with Label component
- [ ] Replace status badges with Badge component

### sales-by-warehouse.tsx
- [x] ~~Use Card for containers~~ (Keep current gradient styling)
- [ ] Replace plain table with Table component
- [ ] Replace plain buttons with Button component
- [ ] Replace plain inputs with Input component
- [ ] Replace plain labels with Label component

### sales-by-person.tsx
- [x] ~~Use Card for containers~~ (Keep current gradient styling)
- [ ] Replace plain table with Table component
- [ ] Replace plain buttons with Button component
- [ ] Replace plain inputs with Input component
- [ ] Replace plain labels with Label component

## 🚀 Next Steps

1. **Start with one page** - Refactor `journal-entry.tsx` first as the reference
2. **Test thoroughly** - Ensure all functionality works after refactoring
3. **Apply to other pages** - Use the refactored page as a template
4. **Remove custom Tailwind** - Replace inline classes with shadcn/ui components
5. **Consistency check** - Ensure all accounting pages look uniform

## 💡 Pro Tips

1. **Use `cn()` utility** for conditional classes:
   ```tsx
   import { cn } from '@/lib/utils';

   <TableCell className={cn(
     "text-right",
     value < 0 && "text-red-600"
   )}>
     {value}
   </TableCell>
   ```

2. **Leverage Button variants** instead of custom classes:
   ```tsx
   // Instead of: className="bg-red-600 text-white"
   <Button variant="destructive">Delete</Button>
   ```

3. **Use TableFooter** for totals and summaries:
   ```tsx
   <TableFooter>
     <TableRow>
       <TableCell colSpan={2}>Total</TableCell>
       <TableCell className="text-right font-bold">${total}</TableCell>
     </TableRow>
   </TableFooter>
   ```

4. **Combine Card with gradients** for visual appeal:
   ```tsx
   <Card className="bg-gradient-to-br from-white to-blue-50/30">
     <CardHeader>...</CardHeader>
   </Card>
   ```

## 📚 Reference

- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Product Form Example](/home/user/kidkazz/apps/admin-dashboard/src/routes/dashboard/products/all.tsx)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Radix UI](https://www.radix-ui.com/) (underlying components)

---

**Note**: The gradient backgrounds we added earlier (`bg-gradient-to-br from-white to-gray-50/50`) should be preserved when using Card components by adding them as className props.
