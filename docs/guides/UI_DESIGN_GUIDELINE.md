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

## 📱 Responsive Design

### Breakpoints
```css
/* Mobile first approach */
--screen-sm: 640px;   /* Mobile landscape */
--screen-md: 768px;   /* Tablet */
--screen-lg: 1024px;  /* Desktop */
--screen-xl: 1280px;  /* Large desktop */
--screen-2xl: 1536px; /* Extra large */
```

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

Kidkazz leverages shadcn/ui with Base UI components, configured via preset URLs for consistent setup across all frontend applications. This approach ensures standardized design systems across our omnichannel platform while allowing customization for different app types and target audiences.

### Admin Dashboard Configuration

**Migration Status**: ✅ **COMPLETE** (2025-12-19)
- **Coverage**: 88.2% (15/17 components migrated to Base UI/Sonner)
- **See**: [Base UI Migration Complete](./BASE_UI_MIGRATION_COMPLETE.md)

**Current Setup**:
- **Component Library**: Base UI (`@base-ui/react` v1.0.0)
- **Toast Library**: Sonner (`sonner` v2.0.7)
- **Drawer Library**: vaul (temporary, until Base UI Drawer released)
- **Style**: `default` (professional black & white theme)
- **Base Color**: `slate` (neutral blue-gray)
- **Theme**: `slate` (monochrome for data focus)
- **Icon Library**: `lucide-react` (minimal, consistent)
- **Font**: Inter (primary), Nunito (secondary), Fredoka (accent)
- **Border Radius**: 0.5rem (small - compact for data density)
- **Framework**: Vite (fast SPA development), Tanstack ecosystem

**Equivalent Preset URL**:
```
https://ui.shadcn.com/init?base=base&style=default&baseColor=slate&theme=slate&iconLibrary=lucide&font=inter&menuAccent=subtle&menuColor=default&radius=small&template=vite
```

**Rationale**:
- **Monochrome Theme** (slate/slate): Black & white for professional admin interface, maximum focus on data
- **Small Radius** (0.5rem): Compact layouts for dense data tables and dashboards
- **Subtle Menu Accent**: Professional, non-distracting navigation
- **Default Style**: Traditional, reliable design language for internal tools
- **Vite Template**: Fast hot-module replacement, optimized for development

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
- Base UI components ready to install

**Design Flexibility**:
- Customize style, colors, fonts per app type
- Target audience-specific configurations (B2C vs B2B vs admin)
- Maintain brand consistency while allowing variation

**Base UI Migration**:
- Modern React patterns (render props instead of asChild)
- Smaller bundle sizes (20-30% reduction vs Radix UI)
- Headless components (maximum customization)

---

### Migration Status

The admin dashboard is currently migrating from Radix UI to Base UI:

**Completed (Phase 1-4)**:
- ✅ Progress, Avatar, Separator, Label, Checkbox
- ✅ Button, Breadcrumb
- ✅ Tabs
- ✅ Dialog, AlertDialog

**Pending (Phase 5-10)**:
- ⏳ Select, Popover, Dropdown Menu
- ⏳ Command, Combobox
- ⏳ Data Table ecosystem (faceted filters, column headers, row actions)
- ⏳ Toast notifications
- ⏳ Final cleanup (remove 13 Radix UI packages)

**Documentation**:
- [BASE_UI_MIGRATION_GUIDE.md](./BASE_UI_MIGRATION_GUIDE.md) - Complete migration reference
- [BASE_UI_MIGRATION_EXECUTION_PLAN.md](./BASE_UI_MIGRATION_EXECUTION_PLAN.md) - Phase-by-phase plan
- [BASE_UI_MIGRATION_SESSION_1_SUMMARY.md](./BASE_UI_MIGRATION_SESSION_1_SUMMARY.md) - Progress tracking

**Action Required**: 47 files use `asChild` pattern that needs updating to Base UI render props or buttonVariants.

---

### Quick Start Commands

**Create New Project from Preset**:
```bash
# Example: New POS system
pnpm dlx shadcn@latest create --preset "https://ui.shadcn.com/init?base=base&style=mira&baseColor=zinc&theme=zinc&iconLibrary=lucide&font=inter&menuAccent=bold&menuColor=default&radius=medium&template=vite" kidkazz-pos
```

**Install Base UI Components**:
```bash
cd kidkazz-pos
pnpm dlx shadcn@latest add @basecn/button @basecn/card @basecn/dialog @basecn/select @basecn/input @basecn/label
```

**Note**: As of December 2025, the `shadcn create --preset` command has known bugs (GitHub #9043, #9064, #9081). Always have [manual setup fallback](./SHADCN_PRESET_SETUP_GUIDE.md#cli-command-examples) ready.

---

### Related Documentation

- [SHADCN_PRESET_SETUP_GUIDE.md](./SHADCN_PRESET_SETUP_GUIDE.md) - Complete preset reference (parameter explanations, CLI examples, troubleshooting)
- [BASE_UI_MIGRATION_GUIDE.md](./BASE_UI_MIGRATION_GUIDE.md) - Migration from Radix UI to Base UI
- [SHADCN_UI_REFACTORING_GUIDE.md](./SHADCN_UI_REFACTORING_GUIDE.md) - Component refactoring examples

---

**Document Version:** 1.1.0
**Last Updated:** December 19, 2025
**Maintained by:** KidKazz Design Team
