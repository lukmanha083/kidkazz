# Kidkazz UI Design Guideline

> Real-Time Omnichannel ERP
>
> Omnichannel through E-Commerce, POS and Mobile App

---

## Brand and Tagline
Kidkazz
Best Price Excellent Service

## 🎯 Design Philosophy

**Target Audience:**
- **Primary:** Parents (25-45 years old) - Decision makers, value quality and safety
- **Secondary:** Children (0-12 years old) - End users, attracted to playful elements
- **B2B:** Wholesale buyers - Need professional, efficient interface

**Core Values:**
- **Trust & Safety:** Parents trust us with their children's products
- **Playful & Fun:** Children-friendly without being childish
- **Professional:** Serious business platform for wholesale
- **Accessible:** Easy to use for all ages and abilities

---

## 🎨 Color Palette

### Primary Colors
```css
/* Soft Purple - Trust, imagination, royalty */
--primary: 262.1 83.3% 57.8%;        /* #8B5CF6 */
--primary-light: 262.1 83.3% 70%;    /* #A78BFA */
--primary-dark: 262.1 83.3% 45%;     /* #7C3AED */

/* Sky Blue - Calm, trust, safety */
--secondary: 199 89% 48%;             /* #0EA5E9 */
--secondary-light: 199 89% 60%;       /* #38BDF8 */
--secondary-dark: 199 89% 35%;        /* #0284C7 */
```

### Accent Colors (Children-Friendly)
```css
/* Playful accents for children's attention */
--accent-pink: 330 81% 60%;          /* #F472B6 - Toys, Girls */
--accent-yellow: 48 96% 53%;         /* #FACC15 - Energy, Fun */
--accent-green: 142 71% 45%;         /* #22C55E - Nature, Health */
--accent-orange: 25 95% 53%;         /* #FB923C - Warmth, Friendly */
```

### Neutral Colors
```css
/* Professional, clean backgrounds */
--background: 0 0% 100%;              /* #FFFFFF */
--background-soft: 240 10% 98%;       /* #F8F9FA */
--foreground: 222.2 84% 4.9%;        /* #0F172A */
--muted: 210 40% 96.1%;              /* #F1F5F9 */
--muted-foreground: 215.4 16.3% 46.9%; /* #64748B */
```

### Semantic Colors
```css
/* Status and feedback */
--success: 142 71% 45%;               /* #22C55E - Safe, Approved */
--warning: 48 96% 53%;                /* #FACC15 - Caution */
--error: 0 84.2% 60.2%;              /* #EF4444 - Danger, Alert */
--info: 199 89% 48%;                 /* #0EA5E9 - Information */
```

### Color Usage Guidelines

**For Parents (Primary Interface):**
- Use soft purple and sky blue for trust and professionalism
- Muted backgrounds for easy reading
- High contrast for important actions

**For Children (Secondary Elements):**
- Bright accent colors for interactive elements
- Soft pastels for backgrounds
- Colorful illustrations and icons

**For Wholesale (B2B Interface):**
- Professional grays and blues
- Purple accents for brand consistency
- High contrast for data tables

---

## 🖤 Admin Dashboard - Black & White Theme

### Overview
The admin dashboard uses a **professional black and white theme** leveraging shadcn/ui's ready-made components. This monochrome approach ensures:
- **Focus on data:** No color distractions from analytics and content
- **Professional appearance:** Clean, modern, corporate-friendly
- **Accessibility:** Maximum contrast for readability
- **Consistency:** All shadcn/ui components work seamlessly

### Color Palette (Admin Only)

```css
/* Base Colors */
--background: 0 0% 100%;           /* #FFFFFF - White background */
--foreground: 0 0% 3.9%;           /* #0A0A0A - Almost black text */

/* Card & Elevated Surfaces */
--card: 0 0% 100%;                 /* #FFFFFF - White cards */
--card-foreground: 0 0% 3.9%;      /* #0A0A0A - Card text */

/* Borders & Dividers */
--border: 0 0% 89.8%;              /* #E5E5E5 - Light gray borders */
--input: 0 0% 89.8%;               /* #E5E5E5 - Input borders */

/* Primary Actions (Black) */
--primary: 0 0% 9%;                /* #171717 - Black buttons */
--primary-foreground: 0 0% 98%;    /* #FAFAFA - White text on black */

/* Secondary Actions (Gray) */
--secondary: 0 0% 96.1%;           /* #F5F5F5 - Light gray */
--secondary-foreground: 0 0% 9%;   /* #171717 - Dark text */

/* Muted / Subtle Elements */
--muted: 0 0% 96.1%;               /* #F5F5F5 - Muted background */
--muted-foreground: 0 0% 45.1%;    /* #737373 - Muted text */

/* Accent (Minimal use) */
--accent: 0 0% 96.1%;              /* #F5F5F5 - Subtle accent */
--accent-foreground: 0 0% 9%;      /* #171717 - Accent text */

/* Destructive Actions */
--destructive: 0 0% 9%;            /* #171717 - Black for delete */
--destructive-foreground: 0 0% 98%; /* #FAFAFA - White text */

/* Focus Ring */
--ring: 0 0% 3.9%;                 /* #0A0A0A - Black focus ring */
```

### Component Styling (shadcn/ui)

**Buttons:**
```tsx
// Primary action - Black with white text
<Button variant="default">Save Changes</Button>

// Secondary action - Light gray with dark text
<Button variant="secondary">Cancel</Button>

// Outline - White with border
<Button variant="outline">Edit</Button>

// Ghost - Transparent hover
<Button variant="ghost">Delete</Button>
```

**Cards:**
```tsx
<Card className="border shadow-sm">
  <CardHeader>
    <CardTitle>Dashboard Stats</CardTitle>
    <CardDescription className="text-muted-foreground">
      Overview of key metrics
    </CardDescription>
  </CardHeader>
  <CardContent>
    {/* White background, black text, gray borders */}
  </CardContent>
</Card>
```

**Tables:**
```tsx
<Table>
  <TableHeader>
    <TableRow className="border-b">
      <TableHead className="font-medium">Product</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow className="hover:bg-muted/50">
      <TableCell>Baby Bottle</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

**Forms:**
```tsx
<div className="space-y-2">
  <Label>Product Name</Label>
  <Input
    placeholder="Enter name..."
    className="border-input focus:ring-ring"
  />
</div>
```

### Design Principles

1. **Hierarchy through typography** - Use font weight and size, not color
2. **Spacing for clarity** - Generous whitespace between sections
3. **Subtle shadows** - Minimal elevation for cards and dropdowns
4. **Consistent borders** - Use `border` color for all dividers
5. **Hover states** - Light gray backgrounds (`muted`) on interaction

### Typography Contrast

```tsx
// Page titles - Large, bold, black
<h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

// Section headings - Medium, semibold
<h2 className="text-xl font-semibold">Recent Orders</h2>

// Labels - Small, medium weight
<p className="text-sm font-medium">Status</p>

// Body text - Regular, foreground
<p className="text-base text-foreground">Product description</p>

// Muted text - Regular, muted-foreground
<p className="text-sm text-muted-foreground">Last updated 2 hours ago</p>
```

### Layout Components

**Sidebar:**
```tsx
<aside className="w-64 border-r bg-card">
  {/* Navigation links with hover:bg-muted */}
</aside>
```

**Header:**
```tsx
<header className="border-b bg-card">
  {/* Logo, search, user menu */}
</header>
```

**Main Content:**
```tsx
<main className="flex-1 bg-background p-6">
  {/* White background with cards */}
</main>
```

---

## 📝 Typography

### Font Families

#### Primary Font: **Inter** (Modern, Clean, Professional)
```css
/* For UI, body text, and professional content */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```
- **Use for:** Admin dashboard, forms, data tables, wholesale interface
- **Weights:** 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)
- **Why:** Excellent readability, professional appearance, web-optimized

#### Secondary Font: **Nunito** (Friendly, Rounded, Approachable)
```css
/* For headings, CTAs, and parent-facing content */
font-family: 'Nunito', 'Quicksand', sans-serif;
```
- **Use for:** Headings, marketing copy, customer-facing pages
- **Weights:** 600 (Semibold), 700 (Bold), 800 (Extra Bold)
- **Why:** Rounded letterforms feel friendly and approachable for parents

#### Accent Font: **Fredoka** (Playful, Children-Friendly)
```css
/* For children-oriented elements and playful touches */
font-family: 'Fredoka', 'Comic Neue', cursive;
```
- **Use for:** Children's section labels, fun badges, playful notifications
- **Weights:** 400 (Regular), 600 (Semibold)
- **Why:** Rounded, friendly, appeals to children without being unprofessional

### Typography Scale

```css
/* Headings - Use Nunito */
--text-h1: 3rem;      /* 48px - Hero headings */
--text-h2: 2.25rem;   /* 36px - Page titles */
--text-h3: 1.875rem;  /* 30px - Section headings */
--text-h4: 1.5rem;    /* 24px - Card titles */
--text-h5: 1.25rem;   /* 20px - Sub-headings */
--text-h6: 1rem;      /* 16px - Small headings */

/* Body - Use Inter */
--text-base: 1rem;     /* 16px - Default body */
--text-sm: 0.875rem;   /* 14px - Small text */
--text-xs: 0.75rem;    /* 12px - Labels, captions */

/* Display - Use Fredoka for special occasions */
--text-display: 4rem;  /* 64px - Hero sections */
```

### Typography Usage

**Admin Dashboard:**
```tsx
<h1 className="font-nunito text-h2 font-bold">Dashboard Title</h1>
<p className="font-inter text-base">Professional body text</p>
```

**Children-Friendly Elements:**
```tsx
<span className="font-fredoka text-lg text-accent-pink">New Toys! 🎁</span>
```

**Data Tables:**
```tsx
<td className="font-inter text-sm text-muted-foreground">Product SKU</td>
```

---

## 🎭 Icons & Visual Elements

### Icon Library: **Lucide React**
Already installed: `lucide-react@^0.309.0`

### Icon Style Guide

**For Parents (Professional):**
```tsx
import { ShoppingCart, User, Heart, Package } from 'lucide-react'

// Stroke width: 2 (default)
// Size: 20-24px for UI, 32-40px for features
// Color: Muted foreground for inactive, Primary for active
```

**For Children (Playful):**
```tsx
import { Baby, Smile, Star, Gift, Sparkles } from 'lucide-react'

// Stroke width: 2.5-3 (bolder)
// Size: 24-32px minimum (easier to see)
// Color: Bright accent colors (pink, yellow, green)
// Add subtle animations on hover
```

### Custom Icon Set for KidKazz

**Baby & Children Categories:**
- 👶 Baby (0-12 months): `Baby` icon
- 🧸 Toddler (1-3 years): `Smile` icon with toy
- 🎒 Kids (4-7 years): `Backpack` icon
- 🎨 Tweens (8-12 years): `Palette` icon

**Product Types:**
- 🍼 Feeding: `Milk` + `Utensils` icons
- 👕 Clothing: `Shirt` icon
- 🧸 Toys: `GameController2` icon
- 📚 Education: `BookOpen` icon
- 🛏️ Furniture: `Bed` icon
- 🚗 Transport: `Car` icon

### Illustrations

**Style:**
- Flat, minimalist illustrations
- Rounded corners (border-radius: 16px)
- Soft shadows for depth
- Pastel color palette

**Sources:**
- **unDraw** (customizable, free)
- **Storyset** (animated, children-friendly)
- **Freepik** (premium quality)

### Example Icon Usage

```tsx
// Professional (Admin/B2B)
<ShoppingCart className="w-5 h-5 text-muted-foreground" strokeWidth={2} />

// Parent-facing
<Heart className="w-6 h-6 text-accent-pink" strokeWidth={2.5} />

// Children-friendly
<Star className="w-8 h-8 text-accent-yellow animate-pulse" strokeWidth={3} />
```

---

## 🎬 Animations & Interactions

### Animation Principles

1. **Delightful, not distracting** - Enhance UX, don't slow it down
2. **Purposeful** - Every animation has a reason
3. **Playful for children** - More dynamic for kid-oriented elements
4. **Professional for B2B** - Subtle, efficient for wholesale

### Timing & Easing

```css
/* Fast - UI feedback (100-200ms) */
--duration-fast: 150ms;
--easing-fast: cubic-bezier(0.4, 0, 0.2, 1);

/* Normal - Most animations (200-300ms) */
--duration-normal: 250ms;
--easing-normal: cubic-bezier(0.4, 0, 0.2, 1);

/* Slow - Page transitions (300-500ms) */
--duration-slow: 400ms;
--easing-slow: cubic-bezier(0.4, 0, 0.2, 1);

/* Bouncy - Playful elements for children */
--easing-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

### Button Interactions

**Professional Buttons (Admin/B2B):**
```tsx
<Button className="transition-colors duration-150 hover:bg-primary/90">
  Click Me
</Button>
```

**Parent-Facing Buttons:**
```tsx
<Button className="transition-all duration-200 hover:scale-105 hover:shadow-lg">
  Add to Cart
</Button>
```

**Children-Friendly Buttons:**
```tsx
<Button className="transition-all duration-300 hover:scale-110 hover:rotate-2 active:scale-95">
  Play Now! 🎮
</Button>
```

### Micro-Animations

**Loading States:**
```tsx
// Spinner for professional
<Loader2 className="animate-spin" />

// Bouncing dots for children
<div className="flex gap-1">
  <div className="w-2 h-2 bg-accent-pink rounded-full animate-bounce" />
  <div className="w-2 h-2 bg-accent-yellow rounded-full animate-bounce delay-100" />
  <div className="w-2 h-2 bg-accent-green rounded-full animate-bounce delay-200" />
</div>
```

**Success Feedback:**
```tsx
// Checkmark animation
<Check className="animate-in zoom-in duration-300" />

// Confetti for children (use react-confetti)
<Confetti numberOfPieces={50} recycle={false} />
```

**Hover Effects:**
```tsx
// Product cards
className="transition-transform duration-200 hover:-translate-y-1 hover:shadow-xl"

// Icon buttons
className="transition-colors duration-150 hover:text-primary"
```

### Page Transitions

```tsx
// Fade in content
className="animate-in fade-in duration-300"

// Slide up cards
className="animate-in slide-in-from-bottom duration-500"

// Stagger children
{items.map((item, i) => (
  <div
    key={item.id}
    style={{ animationDelay: `${i * 50}ms` }}
    className="animate-in fade-in slide-in-from-left"
  >
    {item.content}
  </div>
))}
```

### Playful Animations (Children-Oriented)

**Wobble on hover:**
```css
@keyframes wobble {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-5deg); }
  75% { transform: rotate(5deg); }
}

.wobble-hover:hover {
  animation: wobble 0.5s ease-in-out;
}
```

**Bounce notification:**
```tsx
<div className="animate-bounce bg-accent-yellow rounded-full p-2">
  <Gift className="w-6 h-6" />
</div>
```

**Rainbow gradient text:**
```css
.rainbow-text {
  background: linear-gradient(90deg, #F472B6, #FACC15, #22C55E, #0EA5E9);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: rainbow 3s linear infinite;
}

@keyframes rainbow {
  0%, 100% { filter: hue-rotate(0deg); }
  50% { filter: hue-rotate(360deg); }
}
```

---

## 🧩 Component Design Patterns

### Cards

**Professional Cards (Admin/B2B):**
```tsx
<Card className="border shadow-sm hover:shadow-md transition-shadow">
  <CardHeader>
    <CardTitle className="font-nunito text-xl">Product Details</CardTitle>
    <CardDescription>SKU: TOY-001</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

**Parent-Facing Cards:**
```tsx
<Card className="border-2 border-purple-100 shadow-lg hover:shadow-xl hover:scale-105 transition-all rounded-2xl">
  <div className="relative">
    {/* New badge */}
    <div className="absolute top-2 right-2 bg-accent-pink text-white px-3 py-1 rounded-full text-sm font-fredoka">
      New! ✨
    </div>
    <img src="product.jpg" className="rounded-t-2xl" />
  </div>
  <CardContent className="space-y-2">
    <h3 className="font-nunito font-bold text-lg">Cute Baby Bottle</h3>
    <p className="text-accent-green font-bold text-2xl">$24.99</p>
  </CardContent>
</Card>
```

### Buttons

**Size Variants:**
```tsx
// Small - Compact actions
<Button size="sm">Edit</Button>

// Default - Standard actions
<Button>Add to Cart</Button>

// Large - Primary CTAs
<Button size="lg" className="font-nunito font-bold">
  Shop Now
</Button>
```

**Style Variants:**
```tsx
// Primary - Main actions
<Button variant="default">Continue</Button>

// Secondary - Alternative actions
<Button variant="secondary">Cancel</Button>

// Outline - Tertiary actions
<Button variant="outline">View Details</Button>

// Playful - Children-oriented
<Button className="bg-gradient-to-r from-accent-pink to-accent-yellow text-white font-fredoka">
  Let's Play! 🎉
</Button>
```

### Form Inputs

**Professional Forms:**
```tsx
<div className="space-y-2">
  <Label htmlFor="sku" className="font-inter text-sm font-medium">
    Product SKU
  </Label>
  <Input
    id="sku"
    placeholder="TOY-001"
    className="font-inter"
  />
</div>
```

**Parent-Friendly Forms:**
```tsx
<div className="space-y-2">
  <Label className="font-nunito text-base font-semibold text-primary">
    Your Email 📧
  </Label>
  <Input
    type="email"
    placeholder="parent@example.com"
    className="border-2 focus:border-primary rounded-lg h-12 text-base"
  />
</div>
```

### Tables (TanStack Table)

**Admin/B2B Tables:**
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead className="font-inter font-semibold">Product</TableHead>
      <TableHead className="font-inter font-semibold">SKU</TableHead>
      <TableHead className="font-inter font-semibold">Price</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow className="hover:bg-muted/50 transition-colors">
      <TableCell className="font-inter">Baby Bottle</TableCell>
      <TableCell className="font-mono text-sm text-muted-foreground">TOY-001</TableCell>
      <TableCell className="font-inter font-semibold">$24.99</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

---

## 📱 Responsive Design Patterns

> **IMPORTANT:** This section defines mandatory responsive patterns for all new features, especially frontend development. Always follow these guidelines when creating new UI components.

### Standard Tailwind Breakpoints

**Use standard Tailwind breakpoints for content components (tables, cards, forms, etc.).**

| Breakpoint | Size | Usage |
|------------|------|-------|
| **base** (default) | < 640px | Mobile phones (1 column layouts, essential info only) |
| **sm:** | ≥ 640px | Large phones / Small tablets (2 columns possible) |
| **md:** | ≥ 768px | Tablets (show more columns/info) |
| **lg:** | ≥ 1024px | Desktop (show all columns, full layout) |
| **xl:** | ≥ 1280px | Large desktop (optimal viewing experience) |
| **2xl:** | ≥ 1536px | Extra large displays |

**Exception:** Kidkazz uses custom breakpoints (`tablet:`, `desktop:`) ONLY for dashboard layout (sidebar behavior). See [Custom Breakpoints](#-custom-breakpoints-kidkazz-specific) section for details.

```tsx
// ❌ WRONG - Custom breakpoints in content components
className="hidden desktop:table-cell tablet:w-auto"

// ✅ CORRECT - Standard Tailwind breakpoints for content
className="hidden lg:table-cell md:w-auto"

// ✅ ALSO CORRECT - Custom breakpoints for dashboard layout only
className="hidden desktop:flex desktop:w-48"  // Sidebar
```

---

### Button Responsive Patterns

#### Page Header Buttons (Add/Create Actions)

**Pattern:** Buttons should be compact on mobile, positioned strategically based on screen size.

```tsx
{/* Page Header */}
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
  <div>
    <h1 className="text-3xl font-bold tracking-tight">Page Title</h1>
    <p className="text-muted-foreground mt-1">Page description</p>
  </div>
  <Button onClick={handleAdd} className="gap-2 self-start sm:self-auto">
    <Plus className="h-4 w-4" />
    Add Item
  </Button>
</div>
```

**Responsive Behavior:**

| Screen Size | Layout | Button Width | Button Position |
|-------------|--------|--------------|-----------------|
| **Mobile** (< 640px) | Stacked vertical | Auto-width (compact) | Left-aligned (`self-start`) |
| **Tablet+** (≥ 640px) | Horizontal | Auto-width | Right-aligned (via `justify-between`) |

**Key Classes:**
- `flex flex-col sm:flex-row` - Stacks on mobile, horizontal on tablet+
- `sm:items-center sm:justify-between` - Align items horizontally on larger screens
- `gap-4` - Consistent spacing
- `self-start sm:self-auto` - Left-align button on mobile

---

#### View Drawer Footer Buttons

**Pattern:** Action buttons in view/detail drawers stack on mobile, horizontal on tablet+.

```tsx
<DrawerFooter>
  <div className="flex flex-col sm:flex-row gap-2 w-full">
    <Button onClick={() => handleEdit(selectedItem)} className="w-full sm:w-auto">
      <Edit className="h-4 w-4 mr-2" />
      Edit
    </Button>
    <DrawerClose asChild>
      <Button variant="outline" className="w-full sm:w-auto">Close</Button>
    </DrawerClose>
  </div>
</DrawerFooter>
```

**Responsive Behavior:**

| Screen Size | Layout | Button Width |
|-------------|--------|--------------|
| **Mobile** (< 640px) | Stacked vertical | Full-width |
| **Tablet+** (≥ 640px) | Side-by-side horizontal | Auto-width |

---

#### Form Drawer Footer Buttons

**Pattern:** Submit and cancel buttons follow the same responsive pattern as view drawers.

```tsx
<DrawerFooter className="px-0">
  <div className="flex flex-col sm:flex-row gap-2 w-full">
    <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
      {isSubmitting ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Saving...
        </>
      ) : (
        'Save Changes'
      )}
    </Button>
    <DrawerClose asChild>
      <Button type="button" variant="outline" className="w-full sm:w-auto">
        Cancel
      </Button>
    </DrawerClose>
  </div>
</DrawerFooter>
```

---

### Card & Grid Layout Patterns

#### Stat Card Grids (2-3 Cards)

**Pattern:** 1 column on mobile, 2 columns on tablet, 3 columns on desktop.

```tsx
{/* Summary Stats */}
<div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">Total Items</CardTitle>
      <Package className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">1,234</div>
      <p className="text-xs text-muted-foreground">+10% from last month</p>
    </CardContent>
  </Card>
  {/* More cards... */}
</div>
```

**Grid Progression:**
```
Mobile (< 640px):    [Card 1]
                     [Card 2]
                     [Card 3]

Tablet (640-1023px): [Card 1] [Card 2]
                     [Card 3]

Desktop (≥ 1024px):  [Card 1] [Card 2] [Card 3]
```

---

#### Stat Card Grids (4+ Cards)

**Pattern:** 1 column on mobile, 2 columns on tablet, 4 columns on desktop.

```tsx
{/* Summary Stats */}
<div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
  {/* Cards... */}
</div>
```

---

#### Grid Pattern Reference

| Card Count | Mobile | Tablet (sm:) | Desktop (lg:) |
|------------|--------|--------------|---------------|
| 2 cards | `grid-cols-1` | `sm:grid-cols-2` | `lg:grid-cols-2` |
| 3 cards | `grid-cols-1` | `sm:grid-cols-2` | `lg:grid-cols-3` |
| 4 cards | `grid-cols-1` | `sm:grid-cols-2` | `lg:grid-cols-4` |
| 6 cards | `grid-cols-1` | `sm:grid-cols-2` | `lg:grid-cols-3` |

---

### Table Component Patterns

#### Column Visibility Pattern

**Pattern:** Hide non-essential columns on smaller screens to prevent horizontal scrolling.

**Essential vs Non-Essential Columns:**

**Essential Columns (Always Visible):**
- Primary identifier (Name, Title, ID)
- Status/State
- Primary action (Price, Quantity)
- Actions column

**Non-Essential Columns (Hide on Mobile/Tablet):**
- SKU codes
- Secondary identifiers
- Metadata (Created date, Updated date)
- Contact information
- Secondary status indicators

```tsx
// ❌ WRONG - Using custom breakpoint
{
  accessorKey: 'sku',
  header: ({ column }) => (
    <DataTableColumnHeader
      column={column}
      title="SKU"
      className="hidden desktop:table-cell"  // ❌ Custom breakpoint
    />
  ),
  cell: ({ row }) => (
    <span className="hidden desktop:table-cell">  // ❌ Custom breakpoint
      {row.getValue('sku')}
    </span>
  ),
}

// ✅ CORRECT - Using standard Tailwind breakpoint
{
  accessorKey: 'sku',
  header: ({ column }) => (
    <DataTableColumnHeader
      column={column}
      title="SKU"
      className="hidden lg:table-cell"  // ✅ Standard breakpoint
    />
  ),
  cell: ({ row }) => (
    <span className="hidden lg:table-cell">  // ✅ Standard breakpoint
      {row.getValue('sku')}
    </span>
  ),
}
```

---

#### Column Visibility Guidelines by Breakpoint

```tsx
// Hide on mobile only (< 640px)
className="hidden sm:table-cell"

// Hide on mobile and small tablets (< 768px)
className="hidden md:table-cell"

// Hide on mobile and tablets (< 1024px) - Most common for SKU, secondary info
className="hidden lg:table-cell"

// Hide until very large screens (< 1280px)
className="hidden xl:table-cell"
```

---

#### Table Header Hardcoded Widths

**Rule:** Avoid hardcoded widths on table headers. Let tables be fluid and responsive.

```tsx
// ❌ WRONG - Hardcoded widths
<TableHead className="w-[140px]">Transfer #</TableHead>
<TableHead className="w-[160px]">From</TableHead>
<TableHead className="w-[100px] text-right">Items</TableHead>

// ✅ CORRECT - No widths, responsive hiding
<TableHead>Transfer #</TableHead>
<TableHead>From</TableHead>
<TableHead className="text-right hidden md:table-cell">Items</TableHead>
```

**Exception:** Only use fixed widths for action columns with icons:
```tsx
// ✅ ACCEPTABLE - Fixed width for icon-only column
<TableHead className="w-[80px] text-right">Actions</TableHead>
```

---

### Search Component Patterns

#### Global Search Implementation

**Pattern:** Search component uses global filtering to search across ALL table columns.

**Data Table Toolbar:**
```tsx
{searchKey && (
  <div className="relative">
    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
    <Input
      placeholder={searchPlaceholder}
      value={(table.getState().globalFilter as string) ?? ""}
      onChange={(event) => table.setGlobalFilter(event.target.value)}
      className="pl-8 w-[200px] md:w-[200px] lg:w-[250px]"
    />
  </div>
)}
```

**Data Table Component:**
```tsx
// 1. Add globalFilter state
const [globalFilter, setGlobalFilter] = useState<string>("");

// 2. Configure table with global filter
const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  onGlobalFilterChange: setGlobalFilter,
  globalFilterFn: "includesString",  // Built-in case-insensitive search
  state: {
    globalFilter,
    // ... other state
  },
});
```

---

#### Search Input Width

**Pattern:** Compact width on all screen sizes (no full-width on mobile).

```tsx
// ✅ CORRECT - Compact on mobile, slightly wider on desktop
className="pl-8 w-[200px] md:w-[200px] lg:w-[250px]"

// ❌ WRONG - Full width on mobile
className="pl-8 w-full md:w-[200px] lg:w-[250px]"
```

**Responsive Width:**

| Screen Size | Width | Reasoning |
|-------------|-------|-----------|
| **Mobile** (< 768px) | 200px | Compact, aesthetic, doesn't dominate UI |
| **Tablet** (768-1023px) | 200px | Consistent sizing |
| **Desktop** (≥ 1024px) | 250px | Slightly wider for comfort |

---

#### Search Placeholder Pattern

**Pattern:** Clearly indicate what fields can be searched.

```tsx
// ❌ WRONG - Vague placeholder
searchPlaceholder="Search..."
searchPlaceholder="Search products..."

// ✅ CORRECT - Specific, helpful placeholder
searchPlaceholder="Search by name, barcode, SKU, price..."
searchPlaceholder="Search by name, code, location..."
```

**Placeholder Examples by Page:**

| Page | Placeholder |
|------|-------------|
| Products | `"Search by name, barcode, SKU, price..."` |
| Bundles | `"Search by name, SKU, price..."` |
| Variants | `"Search by product, variant, SKU..."` |
| Categories | `"Search by name, description..."` |
| Warehouses | `"Search by name, code, location..."` |
| UOM | `"Search by name, abbreviation..."` |

---

#### View Column Toggle Button

**Pattern:** Compact auto-width button, not full-width on mobile.

```tsx
{enableColumnVisibility && (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        variant="outline"
        size="sm"
        className="md:ml-auto h-8"  // ✅ Auto-width, right-aligned on md+
      >
        <SlidersHorizontal className="mr-2 h-4 w-4" />
        View
      </Button>
    </DropdownMenuTrigger>
    {/* ... */}
  </DropdownMenu>
)}
```

---

### Form Layout Patterns

#### Form Field Grids in Drawers

**Pattern:** Single column on mobile, 2 columns on tablet+ for side-by-side fields.

```tsx
{/* Two-column form layout */}
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <form.Field name="firstName">
    {(field) => (
      <div>
        <Label htmlFor={field.name}>First Name</Label>
        <Input
          id={field.name}
          value={field.state.value}
          onChange={(e) => field.handleChange(e.target.value)}
        />
      </div>
    )}
  </form.Field>

  <form.Field name="lastName">
    {(field) => (
      <div>
        <Label htmlFor={field.name}>Last Name</Label>
        <Input
          id={field.name}
          value={field.state.value}
          onChange={(e) => field.handleChange(e.target.value)}
        />
      </div>
    )}
  </form.Field>
</div>
```

**When to Use:**
- ✅ Short related fields (First Name / Last Name)
- ✅ City / Province, Postal Code / Country
- ✅ Contact Name / Contact Phone
- ❌ Long text fields or textareas (always full-width)
- ❌ Complex fields with lots of validation messages

---

#### Full-Width Form Fields

**Pattern:** Some fields should always be full-width.

```tsx
{/* Single full-width field - no grid */}
<form.Field name="description">
  {(field) => (
    <div>
      <Label htmlFor={field.name}>Description</Label>
      <Textarea
        id={field.name}
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        rows={4}
      />
    </div>
  )}
</form.Field>
```

**Always Full-Width Fields:**
- Textareas
- Rich text editors
- Long text inputs (email, URL, full address)
- File upload areas
- Multi-select with tags

---

### Drawer Component Patterns

#### Drawer Positioning

**Pattern:** Consistent drawer side usage for different purposes.

| Purpose | Side | Reasoning |
|---------|------|-----------|
| **Forms** (Add/Edit) | `side="left"` | Standard UX pattern |
| **Details** (View/Read-only) | `side="right"` | Separate from forms |
| **Filters/Settings** | `side="right"` | Secondary actions |

```tsx
{/* Form Drawer - Left Side */}
<Drawer open={formDrawerOpen} onOpenChange={setFormDrawerOpen}>
  <DrawerContent side="left">
    <DrawerHeader>
      <DrawerTitle>
        {formMode === 'add' ? 'Add New Item' : 'Edit Item'}
      </DrawerTitle>
    </DrawerHeader>
    {/* Form content */}
    <DrawerFooter className="px-0">
      <div className="flex flex-col sm:flex-row gap-2 w-full">
        <Button type="submit" className="w-full sm:w-auto">Save</Button>
        <DrawerClose asChild>
          <Button variant="outline" className="w-full sm:w-auto">Cancel</Button>
        </DrawerClose>
      </div>
    </DrawerFooter>
  </DrawerContent>
</Drawer>

{/* View Drawer - Right Side */}
<Drawer open={viewDrawerOpen} onOpenChange={setViewDrawerOpen}>
  <DrawerContent side="right">
    <DrawerHeader>
      <DrawerTitle>{selectedItem?.name}</DrawerTitle>
      <DrawerDescription>Item Details</DrawerDescription>
    </DrawerHeader>
    {/* Read-only content */}
    <DrawerFooter>
      <div className="flex flex-col sm:flex-row gap-2 w-full">
        <Button onClick={handleEdit} className="w-full sm:w-auto">Edit</Button>
        <DrawerClose asChild>
          <Button variant="outline" className="w-full sm:w-auto">Close</Button>
        </DrawerClose>
      </div>
    </DrawerFooter>
  </DrawerContent>
</Drawer>
```

---

#### Drawer Detail Grids

**Pattern:** Information display grids should be responsive.

```tsx
{/* Detail Information Grid */}
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <div>
    <p className="text-sm text-muted-foreground">Product Name</p>
    <p className="font-medium">{product.name}</p>
  </div>
  <div>
    <p className="text-sm text-muted-foreground">SKU</p>
    <p className="font-mono text-sm">{product.sku}</p>
  </div>
</div>
```

---

### Touch Targets

**Minimum Sizes:**
- **Desktop:** 40px × 40px
- **Mobile:** 44px × 44px (Apple HIG)
- **Children:** 48px × 48px minimum

```tsx
// Good mobile button
<Button className="h-12 px-6 text-lg md:h-10 md:px-4 md:text-base">
  Add to Cart
</Button>
```

---

### Quick Reference Checklist

#### When Creating a New Page

- [ ] Use standard Tailwind breakpoints (`sm:`, `md:`, `lg:`, `xl:`)
- [ ] Page header button uses `self-start sm:self-auto`
- [ ] Stat cards use `grid-cols-1 sm:grid-cols-2 lg:grid-cols-X`
- [ ] Search placeholder describes searchable fields
- [ ] Search input width is `w-[200px] md:w-[200px] lg:w-[250px]`
- [ ] Table columns hide non-essential info with `hidden lg:table-cell`
- [ ] No hardcoded table column widths (unless action column)
- [ ] Form grids use `grid-cols-1 sm:grid-cols-2`
- [ ] Drawer buttons use `flex flex-col sm:flex-row gap-2 w-full`
- [ ] Individual buttons use `w-full sm:w-auto`

#### When Creating Table Columns

- [ ] Essential columns are always visible
- [ ] SKU/secondary IDs use `hidden lg:table-cell`
- [ ] Both header AND cell have same visibility class
- [ ] No custom breakpoints (`desktop:`, `tablet:`)
- [ ] Global search is enabled in DataTable
- [ ] Helpful search placeholder provided

#### When Creating Drawers

- [ ] Forms open on left (`side="left"`)
- [ ] View/Details open on right (`side="right"`)
- [ ] Footer buttons responsive (`flex flex-col sm:flex-row`)
- [ ] Buttons use `w-full sm:w-auto`
- [ ] Detail grids use `grid-cols-1 sm:grid-cols-2`

---

### Testing Guidelines

**Test on Multiple Breakpoints:**

Always test your UI at these widths:

1. **320px** - Small mobile (iPhone SE)
2. **375px** - Standard mobile (iPhone 12)
3. **768px** - Tablet portrait
4. **1024px** - Tablet landscape / Small desktop
5. **1440px** - Desktop

**Test Checklist:**

- [ ] Buttons don't stretch full-width on mobile (unless intended)
- [ ] Cards don't look sparse or cramped
- [ ] Tables don't require horizontal scrolling
- [ ] Forms are easy to fill on mobile
- [ ] No text is cut off or truncated unexpectedly
- [ ] Spacing looks balanced at all breakpoints
- [ ] Interactive elements are easy to tap on mobile (min 44x44px)

---

### Migration Guide

**Updating Existing Code:**

If you find code that doesn't follow these patterns:

#### Replace Custom Breakpoints

```bash
# Find all uses of custom breakpoints
grep -r "desktop:" apps/admin-dashboard/src/
grep -r "tablet:" apps/admin-dashboard/src/

# Replace with standard breakpoints
desktop: → lg:
tablet: → md:
```

#### Fix Button Patterns

```tsx
// Old pattern
<Button className="w-full md:w-auto">Add Item</Button>

// New pattern
<Button className="self-start sm:self-auto">Add Item</Button>
```

#### Fix Grid Patterns

```tsx
// Old pattern
<div className="grid gap-4 md:grid-cols-3">

// New pattern
<div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
```

---

## 🖥️ Dashboard Layout Patterns

### Sidebar Dimensions

**Desktop Sidebar (≥1024px):**
```tsx
// Compact sidebar for more content space
<div className="hidden desktop:flex desktop:w-48 border-r border-border flex-col bg-card sticky top-0 h-screen">
```

**Tablet Sidebar (768-1023px):**
```tsx
// Collapsed icons-only sidebar
<div className="hidden tablet:flex desktop:hidden tablet:w-16 border-r border-border flex-col bg-card sticky top-0 h-screen">
```

**Mobile:** No sidebar - uses drawer navigation triggered by hamburger menu.

| Breakpoint | Sidebar Width | Style |
|------------|---------------|-------|
| Desktop (≥1024px) | 192px (`w-48`) | Full navigation with text |
| Tablet (768-1023px) | 64px (`w-16`) | Icons only |
| Mobile (<768px) | 0px | Drawer overlay |

### Sticky Sidebar Pattern

**Problem:** When table has lots of data, sidebar scrolls away with content.

**Solution:** Use `sticky top-0 h-screen` on sidebar to keep it fixed while main content scrolls.

```tsx
{/* Desktop Sidebar - Sticky */}
<div className="hidden desktop:flex desktop:w-48 ... sticky top-0 h-screen">
  {/* Header */}
  <div className="shrink-0">...</div>

  {/* Navigation - Scrollable if needed */}
  <nav className="flex-1 overflow-y-auto">...</nav>

  {/* Footer - Always visible at bottom */}
  <div className="shrink-0">
    <Settings />
    <UserProfile />
  </div>
</div>

{/* Main Content - Natural scroll */}
<div className="flex-1 flex flex-col">
  <Outlet />
</div>
```

**Key Classes:**
- `sticky top-0` - Sidebar stays fixed at viewport top
- `h-screen` - Full viewport height
- `shrink-0` - Prevents header/footer from shrinking
- `flex-1 overflow-y-auto` - Navigation scrolls if too long

---

## 📊 Table Cell Responsive Spacing

### Cell Padding Pattern

**Pattern:** Reduce table cell padding on mobile/tablet for more content space.

The base `table.tsx` component uses custom breakpoints (`tablet:`, `desktop:`) for consistency with dashboard layout:

```tsx
// TableHead - Responsive height and padding
<th className="h-10 px-2 tablet:px-3 desktop:h-12 desktop:px-4 ...">

// TableCell - Responsive padding
<td className="px-2 py-2 tablet:px-3 tablet:py-3 desktop:px-4 desktop:py-4 ...">
```

**Equivalent with standard breakpoints:**
```tsx
// If you need standard breakpoints in other contexts:
<th className="h-10 px-2 md:px-3 lg:h-12 lg:px-4 ...">
<td className="px-2 py-2 md:px-3 md:py-3 lg:px-4 lg:py-4 ...">
```

**Padding Breakdown:**

| Breakpoint | Custom | Standard | Horizontal (px) | Vertical (py) |
|------------|--------|----------|-----------------|---------------|
| Mobile (<768px) | base | base | 8px (`px-2`) | 8px (`py-2`) |
| Tablet (768-1023px) | `tablet:` | `md:` | 12px (`px-3`) | 12px (`py-3`) |
| Desktop (≥1024px) | `desktop:` | `lg:` | 16px (`px-4`) | 16px (`py-4`) |

**Benefits:**
- More columns fit on mobile/tablet without horizontal scroll
- Content remains readable with adequate spacing
- Desktop users get comfortable, spacious layout

---

## 🔍 Faceted Filter Component

### Overview

The faceted filter (`DataTableFacetedFilter`) provides multi-select filtering for table columns with optional parent-child hierarchy support.

### Basic Usage

```tsx
filterableColumns={[
  {
    id: "status",
    title: "Status",
    options: [
      { label: "Active", value: "active" },
      { label: "Inactive", value: "inactive" },
    ],
  },
]}
```

### Parent-Child Hierarchy (Categories)

**Pattern:** When selecting a parent, automatically select all children.

```tsx
{
  id: "category",
  title: "Category",
  options: (() => {
    const result = [];

    // Get root categories (no parent)
    const rootCategories = categories.filter((c) => !c.parentId);

    rootCategories.forEach((parent) => {
      // Find children
      const children = categories.filter((c) => c.parentId === parent.id);
      const childNames = children.map((c) => c.name);

      // Add parent with children reference
      result.push({
        label: parent.name,
        value: parent.name,
        children: childNames.length > 0 ? childNames : undefined,
      });

      // Add children immediately after parent (indented in UI)
      children.forEach((child) => {
        result.push({
          label: child.name,
          value: child.name,
          parentValue: parent.name,  // For visual indentation
        });
      });
    });

    return result;
  })(),
}
```

**Filter Option Interface:**
```typescript
interface FilterOption {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  /** Child values - selecting parent auto-selects these */
  children?: string[];
  /** Parent value - marks option as child (indented in UI) */
  parentValue?: string;
}
```

**Visual Result:**
```
☐ Mainan Plastik       (parent)
   ☐ Pistol            (child, indented)
   ☐ Pedang            (child, indented)
☐ Mainan Baterai       (parent)
☐ Action Figure        (parent)
```

**Behavior:**
- Selecting "Mainan Plastik" → auto-selects "Pistol" and "Pedang"
- Deselecting "Mainan Plastik" → auto-deselects all children
- Children can be individually selected/deselected

### View Column Toggle Visibility

**Pattern:** Hide the "View" column toggle button on mobile/tablet.

```tsx
<Button
  variant="outline"
  size="sm"
  className="hidden lg:inline-flex lg:ml-auto h-8"
>
  <SlidersHorizontal className="mr-2 h-4 w-4" />
  View
</Button>
```

**Reasoning:**
- Column visibility is less useful on mobile (fewer columns shown anyway)
- Saves horizontal space for search and filter buttons
- Desktop users can toggle column visibility

**Note:** This example uses standard `lg:` breakpoint. In the actual implementation, we use `desktop:` for consistency with dashboard layout.

---

## 🎯 Custom Breakpoints (Kidkazz-Specific)

### Overview

Kidkazz uses custom Tailwind breakpoints for precise responsive control:

```javascript
// tailwind.config.js
screens: {
  'tablet': '768px',   // Collapsed sidebar with icons
  'desktop': '1024px', // Full sidebar with navigation
}
```

### When to Use Custom vs Standard Breakpoints

| Use Case | Breakpoint | Reasoning |
|----------|------------|-----------|
| Dashboard layout | `tablet:`, `desktop:` | Custom sidebar behavior |
| Table columns | `lg:` (standard) | Consistent with Tailwind conventions |
| Card grids | `sm:`, `lg:` (standard) | Works with existing patterns |
| Form layouts | `sm:` (standard) | Two-column on small tablets |

**Rule:** Use custom breakpoints (`tablet:`, `desktop:`) only for dashboard-specific layout. Use standard Tailwind breakpoints for content components.

---

## ♿ Accessibility (A11y)

### Color Contrast

- **Normal text:** Minimum 4.5:1 contrast ratio
- **Large text (18px+):** Minimum 3:1 contrast ratio
- **Interactive elements:** Minimum 3:1 contrast ratio

### Focus States

```css
/* Always visible focus rings */
.focus-visible:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
}
```

### Screen Reader Support

```tsx
// Good example
<button aria-label="Add baby bottle to cart">
  <ShoppingCart className="w-5 h-5" />
</button>

// Image alt text
<img src="toy.jpg" alt="Colorful building blocks set for ages 3+" />
```

### Semantic HTML

```tsx
// Use proper heading hierarchy
<h1>KidKazz Products</h1>
  <h2>Baby Essentials</h2>
    <h3>Feeding</h3>
```

---

## 🎨 Design Tokens

### Spacing Scale
```css
--space-0: 0;
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
--space-12: 3rem;    /* 48px */
--space-16: 4rem;    /* 64px */
```

### Border Radius
```css
--radius-sm: 0.375rem;  /* 6px - Inputs, small buttons */
--radius-md: 0.5rem;    /* 8px - Cards, buttons */
--radius-lg: 0.75rem;   /* 12px - Large cards */
--radius-xl: 1rem;      /* 16px - Feature cards */
--radius-2xl: 1.5rem;   /* 24px - Hero sections */
--radius-full: 9999px;  /* Pills, badges */
```

### Shadows
```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
```

---

## 📋 Implementation Checklist

### Admin Dashboard (Current)
- [x] shadcn/ui components installed
- [x] Tailwind CSS configured
- [x] **Black and White Theme** - Professional monochrome design
  - **Primary approach:** Uses shadcn/ui's ready-made components
  - **Base colors:** Black (`#000000`), White (`#FFFFFF`), and grayscale
  - **Accent:** Subtle use of zinc/slate for hierarchy
  - **Benefits:** Clean, professional, focuses on data and functionality
  - **Components:** All shadcn/ui components work out of the box
- [ ] Replace Inter with Nunito for headings
- [ ] Add Fredoka font for playful elements
- [ ] Implement Lucide icons throughout
- [ ] Add micro-animations to buttons
- [ ] Ensure all components meet A11y standards

### Customer-Facing (Future)
- [ ] Implement dual theme (Parent Professional + Children Playful)
- [ ] Product cards with playful animations
- [ ] Category icons with children-friendly illustrations
- [ ] Age-specific color coding
- [ ] Fun loading states and success messages
- [ ] Touch-friendly mobile navigation

### B2B Wholesale Portal (Future)
- [ ] Professional gray/blue theme
- [ ] Data-heavy tables with sorting/filtering
- [ ] Bulk action buttons
- [ ] Advanced search with filters
- [ ] Export functionality
- [ ] Analytics dashboards

---

## 🎯 Brand Voice & Tone

### For Parents
- **Tone:** Trustworthy, caring, informative
- **Language:** Clear, concise, supportive
- **Example:** "Safe, high-quality products for your little ones"

### For Children
- **Tone:** Fun, exciting, playful
- **Language:** Simple, energetic, positive
- **Example:** "Let's play! Discover amazing toys! 🎉"

### For B2B
- **Tone:** Professional, efficient, reliable
- **Language:** Direct, data-driven, business-focused
- **Example:** "Streamline your wholesale operations"

---

## 📚 Resources & Tools

### Fonts (Free)
- **Inter:** [Google Fonts](https://fonts.google.com/specimen/Inter)
- **Nunito:** [Google Fonts](https://fonts.google.com/specimen/Nunito)
- **Fredoka:** [Google Fonts](https://fonts.google.com/specimen/Fredoka)

### Icons
- **Lucide:** [lucide.dev](https://lucide.dev) (Already installed)
- **Heroicons:** [heroicons.com](https://heroicons.com)

### Illustrations
- **unDraw:** [undraw.co](https://undraw.co) (Free, customizable)
- **Storyset:** [storyset.com](https://storyset.com) (Animated, free)

### Color Tools
- **Coolors:** [coolors.co](https://coolors.co) (Palette generator)
- **Contrast Checker:** [webaim.org/resources/contrastchecker](https://webaim.org/resources/contrastchecker/)

### Animation Libraries
- **Framer Motion:** For complex animations
- **React Spring:** For physics-based animations
- **Auto-Animate:** For simple, automatic animations

---

## 🚀 Next Steps

1. **Install Google Fonts** in admin dashboard
2. **Update typography** to use Nunito for headings
3. **Add Lucide icons** to all components
4. **Implement micro-animations** for buttons and cards
5. **Create playful success/error states** with animations
6. **Build component library** following these guidelines
7. **Create Storybook** for component documentation

---

## 🎨 shadcn Preset Configuration

### Overview

Kidkazz leverages shadcn/ui with Radix UI primitives, configured via preset URLs for consistent setup across all frontend applications. This approach ensures standardized design systems across our omnichannel platform while allowing customization for different app types and target audiences.

### Admin Dashboard Configuration

**Current Setup**:
- **Component Library**: Radix UI (via shadcn/ui)
- **Toast Library**: Sonner (`sonner` v2.0.7)
- **Drawer Library**: vaul
- **Style**: `default` (professional black & white theme)
- **Base Color**: `slate` (neutral blue-gray)
- **Theme**: `slate` (monochrome for data focus)
- **Icon Library**: `lucide-react` (minimal, consistent)
- **Font**: Inter (primary), Nunito (secondary), Fredoka (accent)
- **Border Radius**: 0.5rem (small - compact for data density)
- **Framework**: Vite (fast SPA development), Tanstack ecosystem

**Equivalent Preset URL**:
```
https://ui.shadcn.com/init?style=default&baseColor=slate&theme=slate&iconLibrary=lucide&font=inter&menuAccent=subtle&menuColor=default&radius=small&template=vite
```

**Rationale**:
- **Monochrome Theme** (slate/slate): Black & white for professional admin interface, maximum focus on data
- **Small Radius** (0.5rem): Compact layouts for dense data tables and dashboards
- **Subtle Menu Accent**: Professional, non-distracting navigation
- **Default Style**: Traditional, reliable design language for internal tools
- **Vite Template**: Fast hot-module replacement, optimized for development
- **Radix UI**: Stable, production-ready primitives with excellent accessibility

---

### For New Frontend Projects

See [SHADCN_PRESET_SETUP_GUIDE.md](./SHADCN_PRESET_SETUP_GUIDE.md) for complete preset templates for all Kidkazz applications:

#### 1. Point of Sale (POS)
- **Style**: `mira` (compact, dense for efficiency)
- **Radius**: `medium` (touch-friendly targets)
- **Theme**: `zinc` (neutral, non-distracting)
- **Use Case**: Store cashiers, fast checkout, offline-capable
- **Template**: `vite`, Tanstack Ecosystem (Router, Table, Virtual Table etc.)

#### 2. Retail E-Commerce (B2C) (Website & Mobile App)
- **Style**: `nova` (spacious, modern for browsing)
- **Radius**: `large` (soft, playful, approachable)
- **Theme**: `purple` (Kidkazz brand color - trust, imagination)
- **Font**: `nunito` (friendly, rounded, approachable)
- **Use Case**: Parents browsing kids products, SEO-optimized
- **Template** (website): vite, Tanstack Ecosystem (Router, Table, Virtual Table, Form, etc.)
- **Template** (Mobile App): expo

#### 3. Wholesale E-Commerce (B2B)
- **Style**: `default` (professional, traditional)
- **Radius**: `small` (compact for data tables, pricing grids)
- **Theme**: `blue` (business-oriented, trustworthy)
- **Use Case**: Business buyers, bulk orders, data-heavy, Supplier portal to view report on their item stock and sales
- **Template**: vite, Tanstack Ecosystem (Router, Table, Virtual Table, Form, etc.)

#### 4. Mobile Admin App
- **Style**: `mira` (compact for small screens)
- **Radius**: `medium` (touch-optimized)
- **Theme**: `slate` (matches admin dashboard)
- **Menu Accent**: `bold` (clear touch targets)
- **Use Case**: Managers on-the-go, real-time updates
- **Template**: `expo`

---

### Preset Configuration Benefits

**Consistency Across Apps**:
- All Kidkazz frontends use standardized shadcn/ui components
- Unified design language (spacing, colors, typography)
- Shared component library (easier maintenance)

**Rapid Development**:
- New project setup in minutes (single preset command)
- Pre-configured Tailwind CSS with brand colors
- Radix UI components ready to install

**Design Flexibility**:
- Customize style, colors, fonts per app type
- Target audience-specific configurations (B2C vs B2B vs admin)
- Maintain brand consistency while allowing variation

**Radix UI Benefits**:
- Production-ready, battle-tested primitives
- Excellent accessibility (WAI-ARIA compliant)
- Stable API with long-term support
- Comprehensive component ecosystem

---

### Component Library Status — ✅ Radix UI (2025-12-29)

The admin dashboard uses **Radix UI** as the component primitive library via shadcn/ui.

**Previous Migration History**:
- **2025-12-19**: Attempted migration to Base UI (88.2% coverage)
- **2025-12-29**: **Reverted to Radix UI** due to critical issues:
  - `aria-hidden` focus blocking bug causing frozen dialogs
  - `nativeButton` prop inconsistencies
  - Focus management problems in nested interactive elements
  - Modal backdrop conflicts with Drawer (vaul) interactions

**Current Component Stack**:
- ✅ All UI components using Radix UI primitives
- ✅ Dialog, Popover, Select, Dropdown Menu, Alert Dialog - Radix UI
- ✅ Button, Tabs, Checkbox, Avatar, Progress, Separator - Radix UI
- ✅ Data Table ecosystem (column headers, row actions, faceted filters) - Radix UI
- ✅ Toast notifications - Sonner (independent library)
- ✅ Drawer - vaul (independent library)

**Key Pattern Differences** (Base UI → Radix UI):
- `render={<Button />}` → `asChild` + Button as child
- `nativeButton={true}` → Not needed (removed)
- `data-[popup-open]` → `data-[state=open]`
- `data-[highlighted]` → `data-highlighted`
- `Positioner` + `Popup` → `Content` component

**Achievements**:
- ✅ All `aria-hidden` focus blocking issues resolved
- ✅ Dialogs and popovers fully interactive
- ✅ Production build passing (7.31s)
- ✅ Stable, battle-tested component primitives
- ✅ Excellent accessibility (WAI-ARIA compliant)

---

### Quick Start Commands

**Create New Project from Preset**:
```bash
# Example: New POS system
pnpm dlx shadcn@latest create --preset "https://ui.shadcn.com/init?style=mira&baseColor=zinc&theme=zinc&iconLibrary=lucide&font=inter&menuAccent=bold&menuColor=default&radius=medium&template=vite" kidkazz-pos
```

**Install shadcn/ui Components** (Radix UI):
```bash
cd kidkazz-pos
pnpm dlx shadcn@latest add button card dialog select input label
```

**Note**: As of December 2025, the `shadcn create --preset` command has known bugs (GitHub #9043, #9064, #9081). Always have [manual setup fallback](./SHADCN_PRESET_SETUP_GUIDE.md#cli-command-examples) ready.

---

### Related Documentation

- [SHADCN_PRESET_SETUP_GUIDE.md](./SHADCN_PRESET_SETUP_GUIDE.md) - Complete preset reference (parameter explanations, CLI examples, troubleshooting)
- [SHADCN_UI_REFACTORING_GUIDE.md](./SHADCN_UI_REFACTORING_GUIDE.md) - Component refactoring examples

---

**Document Version:** 3.1.0
**Last Updated:** December 31, 2025
**Maintained by:** KidKazz Design Team

**Changelog:**
- **v3.1.0 (2025-12-31):** Added Dashboard Layout Patterns (sticky sidebar, responsive widths), Table Cell Responsive Spacing, Faceted Filter Component (parent-child hierarchy support), Custom Breakpoints documentation.
- **v3.0.0 (2025-12-31):** Merged comprehensive responsive design patterns from UI-GUIDELINES.md. Added detailed sections on button patterns, card/grid layouts, table components, search components, form layouts, drawer patterns, testing guidelines, and migration guide.
- **v2.0.0 (2025-12-29):** Reverted to Radix UI, updated shadcn preset configuration
- **v1.0.0 (Initial):** Brand design system, colors, typography, icons, animations
