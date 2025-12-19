# shadcn Preset Setup Guide

> **Comprehensive guide for creating new KidKazz frontend projects using shadcn/ui preset configurations**
>
> Last Updated: December 2025

---

## Table of Contents

1. [Introduction](#introduction)
2. [Understanding Preset URLs](#understanding-preset-urls)
3. [KidKazz Preset Templates](#kidkazz-preset-templates)
4. [CLI Command Examples](#cli-command-examples)
5. [Mapping to components.json](#mapping-to-componentsjson)
6. [Base UI Integration](#base-ui-integration)
7. [Troubleshooting](#troubleshooting)

---

## Introduction

### What is the Preset Approach?

The shadcn/ui preset approach allows you to create new projects with a fully configured design system using a single command. Instead of manually configuring `components.json`, installing dependencies, and setting up Tailwind CSS, you can generate everything from a preset URL.

**Key Benefits**:
- **Consistency**: All KidKazz apps use standardized configurations
- **Speed**: Set up a new project in minutes, not hours
- **Flexibility**: Customize every aspect (colors, fonts, icons, style)
- **Maintainability**: Preset URLs serve as documentation of design decisions

### When to Use Presets vs Manual Setup

**Use Preset Approach**:
- ✅ Starting a brand new project from scratch
- ✅ Creating multiple projects with similar configurations
- ✅ Want to quickly prototype with shadcn/ui
- ✅ Team collaboration (preset URL = shared config)

**Use Manual Setup**:
- ✅ Migrating existing project (like admin-dashboard Radix → Base UI)
- ✅ Preset command has known bugs (see [Troubleshooting](#troubleshooting))
- ✅ Need custom configuration beyond preset parameters
- ✅ Working with monorepo or complex build setup

**Current Status (December 2025)**: The `shadcn create --preset` command has known issues (GitHub #9043, #9064, #9081). **Always have manual setup as fallback**.

### KidKazz-Specific Considerations

KidKazz is building 5+ frontend applications with different target audiences:

| App Type | Target Audience | Design Priority |
|----------|-----------------|-----------------|
| **Admin Dashboard** | Internal staff | Professional, data-focused, efficient |
| **Point of Sale** | Store cashiers | Touch-friendly, fast, offline-capable |
| **Retail E-Commerce** | Parents (B2C) | Playful, trustworthy, colorful |
| **Wholesale E-Commerce** | Business buyers (B2B) | Professional, data-heavy, streamlined |
| **Mobile Admin** | Managers on-the-go | Compact, touch-optimized, real-time |

Each app type has a tailored preset configuration optimized for its use case.

---

## Understanding Preset URLs

### Preset URL Structure

A preset URL follows this format:

```
https://ui.shadcn.com/init?base=<base>&style=<style>&baseColor=<baseColor>&theme=<theme>&iconLibrary=<iconLibrary>&font=<font>&menuAccent=<menuAccent>&menuColor=<menuColor>&radius=<radius>&template=<template>
```

### Complete Parameter Reference

#### 1. `base` - Component Library

**Options**: `radix` | `base`

- `radix`: Uses Radix UI primitives (classic shadcn approach)
- `base`: Uses Base UI primitives (modern, headless UI library)

**KidKazz Standard**: Always use `base=base` for all new projects.

**Why Base UI?**:
- Modern React patterns (render props instead of `asChild`)
- Better tree-shaking (smaller bundle sizes)
- Headless design (more customization flexibility)
- Actively maintained by Material UI team

---

#### 2. `style` - Visual Style

**Options**: `default` | `mira` | `vega` | `nova` | `maia` | `lyra`

**Style Descriptions**:

| Style | Description | Best For | Visual Characteristics |
|-------|-------------|----------|------------------------|
| **default** | Classic shadcn style | Professional apps, dashboards | Traditional borders, standard spacing |
| **mira** | Compact, dense | POS systems, data-heavy interfaces | **Smaller padding**, tighter layouts |
| **vega** | Established, timeless | Corporate websites, B2B portals | Classic design language |
| **nova** | Modern, spacious | E-commerce, consumer apps | **Larger spacing**, airy layouts |
| **maia** | Soft, rounded | Kids-focused apps, friendly UIs | **Large border radius**, gentle |
| **lyra** | Boxy, sharp edges | Technical apps, admin tools | **Square corners**, structured |

**KidKazz Usage**:
- Admin Dashboard & Wholesale: `default`
- POS & Mobile: `mira` (compact for efficiency)
- Retail E-Commerce: `nova` (spacious for browsing)

---

#### 3. `baseColor` - Base Color Palette

**Options**: `slate` | `gray` | `zinc` | `neutral` | `stone`

**Color Characteristics**:

| Color | Tone | Best For | HSL Range |
|-------|------|----------|-----------|
| **slate** | Cool blue-gray | Professional, tech-focused | Blue undertones |
| **gray** | True neutral gray | Monochrome, minimalist | Pure gray |
| **zinc** | Modern warm gray | Contemporary, design-forward | Slight warm undertones |
| **neutral** | Balanced gray | Versatile, universal | Perfectly balanced |
| **stone** | Warm gray-beige | Natural, earthy | Warm undertones |

**KidKazz Usage**:
- Admin Dashboard: `slate` (professional tech vibe)
- POS: `zinc` (modern, neutral)
- Retail: Use `theme` parameter for purple (not baseColor)
- Wholesale: `blue` for theme
- Mobile: `slate` (matches admin)

**Important**: `baseColor` sets the neutral palette. For brand colors (purple, blue), use the `theme` parameter.

---

#### 4. `theme` - Theme Color

**Options**: Any color name (e.g., `slate`, `purple`, `blue`, `rose`, `orange`)

**How it Works**:
- Sets the primary brand color (buttons, links, active states)
- Generates CSS variables for `--primary` and `--primary-foreground`
- Can be different from `baseColor`

**Example Combinations**:
```
baseColor=slate&theme=purple  → Slate neutrals with purple brand
baseColor=zinc&theme=blue     → Zinc neutrals with blue brand
baseColor=slate&theme=slate   → Monochrome (admin dashboards)
```

**KidKazz Usage**:
- Admin: `theme=slate` (monochrome black & white)
- POS: `theme=zinc` (neutral, non-distracting)
- Retail: `theme=purple` (brand color)
- Wholesale: `theme=blue` (professional)
- Mobile: `theme=slate` (admin-like)

---

#### 5. `iconLibrary` - Icon Set

**Options**: `lucide` | `tabler` | `hugeicons`

**Icon Library Comparison**:

| Library | Count | Style | License | Bundle Size |
|---------|-------|-------|---------|-------------|
| **lucide** | 1,500+ | Minimal, consistent | ISC (permissive) | ~50kb |
| **tabler** | 5,000+ | Rounded, friendly | MIT | ~80kb |
| **hugeicons** | 4,000+ | Modern, detailed | Pro (paid) | ~70kb |

**KidKazz Standard**: Always use `lucide` (already in use, team familiarity, excellent quality).

---

#### 6. `font` - Typography

**Options**: `inter` | `figtree` | `nunito` | `fredoka` | (many more)

**Font Characteristics**:

| Font | Style | Best For | Character |
|------|-------|----------|-----------|
| **inter** | Geometric sans | Dashboards, data, technical | Professional, readable |
| **figtree** | Modern sans | Contemporary apps | Clean, friendly |
| **nunito** | Rounded sans | Consumer apps, kids | Approachable, warm |
| **fredoka** | Playful rounded | Kids apps, accents | Fun, energetic |

**KidKazz Usage** (per UI_DESIGN_GUIDELINE.md):
- Primary (Admin, POS, Wholesale, Mobile): `inter`
- Secondary (Retail E-Commerce): `nunito`
- Accent (Kids-focused sections): `fredoka` (manual add)

**Note**: Preset only sets one font. For multi-font setups, manually add to `tailwind.config.js`.

---

#### 7. `menuAccent` - Menu Accent Style

**Options**: `subtle` | `bold`

**Visual Difference**:
- `subtle`: Low contrast, minimal emphasis (professional, calm)
- `bold`: High contrast, clear emphasis (efficient, action-oriented)

**KidKazz Usage**:
- Admin Dashboard: `subtle` (professional, non-distracting)
- POS: `bold` (quick visual scanning, efficiency)
- E-Commerce: `subtle` (friendly, not aggressive)
- Mobile: `bold` (clear touch targets)

---

#### 8. `menuColor` - Menu Color Scheme

**Options**: `default` (only option currently)

**Future Options**: May include `primary`, `accent`, `muted` (not yet available).

**KidKazz Standard**: Always use `default`.

---

#### 9. `radius` - Border Radius

**Options**: `none` | `small` | `default` | `medium` | `large`

**Size Mapping**:

| Option | CSS Value | Use Case |
|--------|-----------|----------|
| `none` | 0px | Sharp, technical, boxy |
| `small` | 0.5rem (8px) | **Compact, data-focused** |
| `default` | 0.75rem (12px) | Balanced |
| `medium` | 1rem (16px) | **Friendly, modern** |
| `large` | 1.5rem (24px) | Soft, approachable |

**KidKazz Usage**:
- Admin Dashboard: `small` (compact layouts, data tables)
- POS: `medium` (touch-friendly, balanced)
- Retail E-Commerce: `large` (friendly, playful)
- Wholesale: `small` (professional, data-heavy)
- Mobile: `medium` (touch-optimized)

---

#### 10. `template` - Framework Template

**Options**: `next` | `vite` | `remix` | `expo`

**Template Comparison**:

| Template | Framework | Best For | Features |
|----------|-----------|----------|----------|
| **next** | Next.js | E-commerce, SEO-critical | SSR, SSG, API routes |
| **vite** | Vite + React | Admin dashboards, SPAs | Fast HMR, simple setup |
| **remix** | Remix | Full-stack apps | Nested routing, data loading |
| **expo** | React Native (Expo) | Mobile apps | iOS + Android, native APIs |

**KidKazz Usage**:
- Admin Dashboard: `vite` (SPA, fast dev)
- POS: `vite` (offline-capable, fast)
- Retail E-Commerce: `next` (SEO, product pages)
- Wholesale E-Commerce: `next` (SEO, catalog)
- Mobile Admin: `expo` (native mobile)

---

### URL Encoding Considerations

**Important**: When passing preset URLs via command line, ensure proper encoding:

```bash
# ✅ Correct: URL in quotes
pnpm dlx shadcn@latest create --preset "https://ui.shadcn.com/init?base=base&style=mira" project-name

# ❌ Wrong: Unquoted URL (shell interprets & as background)
pnpm dlx shadcn@latest create --preset https://ui.shadcn.com/init?base=base&style=mira
```

**Special Characters**: No encoding needed for standard values (alphanumeric). Spaces would need `%20`, but preset parameters don't contain spaces.

---

## KidKazz Preset Templates

### Template 1: Admin Dashboard (Internal ERP)

**Target Audience**: Internal staff, warehouse managers, accountants
**Design Priority**: Professional, data-focused, efficient, monochrome

**Preset URL**:
```
https://ui.shadcn.com/init?base=base&style=default&baseColor=slate&theme=slate&iconLibrary=lucide&font=inter&menuAccent=subtle&menuColor=default&radius=small&template=vite
```

**Parameter Rationale**:
- `base=base`: Modern Base UI library
- `style=default`: Classic professional look
- `baseColor=slate`: Professional blue-gray
- `theme=slate`: Monochrome (black & white theme)
- `iconLibrary=lucide`: Minimal, consistent icons
- `font=inter`: Readable in data tables
- `menuAccent=subtle`: Non-distracting
- `menuColor=default`: Standard
- `radius=small` (0.5rem): Compact for data density
- `template=vite`: Fast SPA development

**CLI Command**:
```bash
pnpm dlx shadcn@latest create --preset "https://ui.shadcn.com/init?base=base&style=default&baseColor=slate&theme=slate&iconLibrary=lucide&font=inter&menuAccent=subtle&menuColor=default&radius=small&template=vite" kidkazz-admin-dashboard
```

**First Components to Install**:
```bash
cd kidkazz-admin-dashboard
pnpm dlx shadcn@latest add @basecn/button @basecn/card @basecn/input @basecn/label @basecn/dialog @basecn/select @basecn/table @basecn/tabs @basecn/form
```

**Key Features**:
- Black & white color scheme (admin dashboard theme)
- Compact layouts (small radius, default style)
- Data-table optimized (TanStack Table)
- WebSocket real-time updates support
- Responsive (desktop-first, mobile-friendly)

**Expected components.json**:
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

---

### Template 2: Point of Sale (POS)

**Target Audience**: Store cashiers, retail staff
**Design Priority**: Touch-friendly, fast, efficient, offline-capable

**Preset URL**:
```
https://ui.shadcn.com/init?base=base&style=mira&baseColor=zinc&theme=zinc&iconLibrary=lucide&font=inter&menuAccent=bold&menuColor=default&radius=medium&template=vite
```

**Parameter Rationale**:
- `base=base`: Modern Base UI
- `style=mira`: **Compact, dense for efficiency**
- `baseColor=zinc`: Modern warm-gray (neutral, contemporary)
- `theme=zinc`: Non-distracting neutral
- `iconLibrary=lucide`: Clear icons
- `font=inter`: Readable on POS screens
- `menuAccent=bold`: **Quick visual scanning**
- `menuColor=default`: Standard
- `radius=medium` (1rem): **Touch-friendly targets**
- `template=vite`: Fast, offline with PWA

**CLI Command**:
```bash
pnpm dlx shadcn@latest create --preset "https://ui.shadcn.com/init?base=base&style=mira&baseColor=zinc&theme=zinc&iconLibrary=lucide&font=inter&menuAccent=bold&menuColor=default&radius=medium&template=vite" kidkazz-pos
```

**First Components to Install**:
```bash
cd kidkazz-pos
pnpm dlx shadcn@latest add @basecn/button @basecn/card @basecn/dialog @basecn/input @basecn/select @basecn/badge @basecn/alert
```

**Key Features**:
- Large touch targets (medium radius + bold accents)
- Compact layouts (Mira style for dense product grids)
- Offline-first (PWA, service workers)
- Barcode scanner integration
- Fast checkout flow
- Real-time inventory updates (WebSocket)

**PWA Configuration**:
```bash
pnpm add vite-plugin-pwa
# Configure vite.config.ts for offline caching
```

---

### Template 3: Retail E-Commerce (B2C)

**Target Audience**: Parents (25-45 years), browsing kids products
**Design Priority**: Playful, trustworthy, colorful, SEO-optimized

**Preset URL**:
```
https://ui.shadcn.com/init?base=base&style=nova&baseColor=purple&theme=purple&iconLibrary=lucide&font=nunito&menuAccent=subtle&menuColor=default&radius=large&template=next
```

**Parameter Rationale**:
- `base=base`: Modern Base UI
- `style=nova`: **Spacious, modern for product browsing**
- `baseColor=purple`: (Note: will use neutral, set purple via theme)
- `theme=purple`: **KidKazz brand color** (trust, imagination)
- `iconLibrary=lucide`: Clear, friendly icons
- `font=nunito`: **Friendly, rounded, approachable**
- `menuAccent=subtle`: Friendly, not aggressive
- `menuColor=default`: Standard
- `radius=large` (1.5rem): **Soft, playful, approachable**
- `template=next`: **SEO, SSR for product pages**

**Note**: `baseColor=purple` may not exist. Use `baseColor=slate&theme=purple` for purple brand with neutral base.

**Corrected Preset URL**:
```
https://ui.shadcn.com/init?base=base&style=nova&baseColor=slate&theme=purple&iconLibrary=lucide&font=nunito&menuAccent=subtle&menuColor=default&radius=large&template=next
```

**CLI Command**:
```bash
pnpm dlx shadcn@latest create --preset "https://ui.shadcn.com/init?base=base&style=nova&baseColor=slate&theme=purple&iconLibrary=lucide&font=nunito&menuAccent=subtle&menuColor=default&radius=large&template=next" kidkazz-retail-ecommerce
```

**First Components to Install**:
```bash
cd kidkazz-retail-ecommerce
pnpm dlx shadcn@latest add @basecn/button @basecn/card @basecn/badge @basecn/carousel @basecn/dialog @basecn/select @basecn/input @basecn/breadcrumb @basecn/pagination
```

**Key Features**:
- Product catalog (image carousels, filters)
- Shopping cart (real-time updates)
- Checkout flow (multi-step forms)
- SEO-optimized product pages (Next.js SSG)
- Purple accent colors (playful, trustworthy)
- Large border radius (friendly, approachable)
- Nunito font (warm, readable)

**Color Customization** (after creation):
Add accent colors from UI_DESIGN_GUIDELINE.md to `tailwind.config.js`:
```js
colors: {
  // ...existing colors
  'accent-pink': 'hsl(330 81% 60%)',    // Toys, Girls
  'accent-yellow': 'hsl(48 96% 53%)',   // Energy, Fun
  'accent-green': 'hsl(142 71% 45%)',   // Nature, Health
  'accent-orange': 'hsl(25 95% 53%)',   // Warmth, Friendly
}
```

---

### Template 4: Wholesale E-Commerce (B2B)

**Target Audience**: Business buyers, resellers, bulk purchasers
**Design Priority**: Professional, data-heavy, streamlined, efficient

**Preset URL**:
```
https://ui.shadcn.com/init?base=base&style=default&baseColor=slate&theme=blue&iconLibrary=lucide&font=inter&menuAccent=subtle&menuColor=default&radius=small&template=next
```

**Parameter Rationale**:
- `base=base`: Modern Base UI
- `style=default`: Professional, traditional
- `baseColor=slate`: Neutral professional
- `theme=blue`: **Business-oriented, trustworthy**
- `iconLibrary=lucide`: Clear icons
- `font=inter`: **Readable in data tables, pricing grids**
- `menuAccent=subtle`: Professional, calm
- `menuColor=default`: Standard
- `radius=small` (0.5rem): **Compact for data density**
- `template=next`: **SEO, catalog pages, account portals**

**CLI Command**:
```bash
pnpm dlx shadcn@latest create --preset "https://ui.shadcn.com/init?base=base&style=default&baseColor=slate&theme=blue&iconLibrary=lucide&font=inter&menuAccent=subtle&menuColor=default&radius=small&template=next" kidkazz-wholesale-ecommerce
```

**First Components to Install**:
```bash
cd kidkazz-wholesale-ecommerce
pnpm dlx shadcn@latest add @basecn/button @basecn/card @basecn/table @basecn/select @basecn/input @basecn/dialog @basecn/badge @basecn/pagination @basecn/dropdown-menu
```

**Key Features**:
- Bulk order forms (minimum order quantities)
- Pricing tiers (volume discounts)
- Data-heavy tables (product catalogs, order history)
- Account management (business profiles, tax IDs)
- Blue accent (professional, trustworthy)
- Small radius (compact, data-focused)
- Next.js SSR (SEO for catalog, account pages)

---

### Template 5: Mobile Admin App

**Target Audience**: Managers on-the-go, warehouse supervisors
**Design Priority**: Compact, mobile-first, touch-optimized, real-time

**Preset URL**:
```
https://ui.shadcn.com/init?base=base&style=mira&baseColor=slate&theme=slate&iconLibrary=lucide&font=inter&menuAccent=bold&menuColor=default&radius=medium&template=expo
```

**Parameter Rationale**:
- `base=base`: Modern Base UI
- `style=mira`: **Compact for small screens**
- `baseColor=slate`: Professional (matches admin dashboard)
- `theme=slate`: Monochrome (efficient, focused)
- `iconLibrary=lucide`: Clear mobile icons
- `font=inter`: Readable on small screens
- `menuAccent=bold`: **Clear touch targets**
- `menuColor=default`: Standard
- `radius=medium` (1rem): **Touch-friendly**
- `template=expo`: **React Native for iOS + Android**

**CLI Command** (Note: Expo setup differs):
```bash
# Expo doesn't use shadcn preset directly
# Create Expo app first, then configure shadcn manually
npx create-expo-app kidkazz-mobile-admin --template blank-typescript
cd kidkazz-mobile-admin

# Install NativeWind (Tailwind for React Native)
npx expo install nativewind tailwindcss
```

**Alternative: Tamagui** (React Native UI library)
```bash
npx create-tamagui --template expo kidkazz-mobile-admin
```

**Key Features**:
- Native mobile UI (iOS + Android)
- Real-time updates (WebSocket, push notifications)
- Barcode scanning (native camera)
- Offline support (local storage, sync)
- Location tracking (warehouse mapping)
- Touch-optimized (medium radius, bold accents)
- Compact layouts (Mira style)

**shadcn + React Native Status** (December 2025):
- **Limited Support**: shadcn is primarily web-focused
- **Alternative**: Use **NativeWind** or **Tamagui** for React Native
- **Recommendation**: Build mobile app after web apps are stable

---

### Preset Template Comparison Matrix

| Feature | Admin Dashboard | POS | Retail E-Commerce | Wholesale E-Commerce | Mobile Admin |
|---------|----------------|-----|-------------------|---------------------|--------------|
| **Style** | default | mira | nova | default | mira |
| **Base Color** | slate | zinc | slate | slate | slate |
| **Theme** | slate (B&W) | zinc | purple | blue | slate (B&W) |
| **Font** | inter | inter | nunito | inter | inter |
| **Radius** | small (0.5rem) | medium (1rem) | large (1.5rem) | small (0.5rem) | medium (1rem) |
| **Menu Accent** | subtle | **bold** | subtle | subtle | **bold** |
| **Template** | vite | vite | next | next | expo |
| **Target** | Staff | Cashiers | Parents | Business | Managers |
| **Priority** | Data | Speed | Friendly | Professional | Mobile |

---

## CLI Command Examples

### Creating a New Project with Preset

**Syntax**:
```bash
pnpm dlx shadcn@latest create --preset "<PRESET_URL>" <project-name>
```

**Example: POS System**
```bash
pnpm dlx shadcn@latest create --preset "https://ui.shadcn.com/init?base=base&style=mira&baseColor=zinc&theme=zinc&iconLibrary=lucide&font=inter&menuAccent=bold&menuColor=default&radius=medium&template=vite" kidkazz-pos
```

**What This Does**:
1. Creates a new Vite project in `kidkazz-pos/` directory
2. Installs dependencies (@base-ui/react, tailwindcss, etc.)
3. Generates `components.json` with preset configuration
4. Configures Tailwind CSS with zinc base color
5. Sets up shadcn CLI for component installation

**Alternative Package Managers**:
```bash
# npm
npx shadcn@latest create --preset "..." project-name

# yarn
yarn dlx shadcn@latest create --preset "..." project-name

# bun
bunx shadcn@latest create --preset "..." project-name
```

---

### Adding to Existing Project (Manual Setup)

If the preset command fails or you're adding to an existing project:

**Step 1: Install Dependencies**
```bash
pnpm add @base-ui/react tailwindcss-animate class-variance-authority clsx tailwind-merge lucide-react
pnpm add -D tailwindcss postcss autoprefixer
```

**Step 2: Initialize Tailwind CSS**
```bash
npx tailwindcss init -p
```

**Step 3: Create components.json**

Create `components.json` at project root:
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

**Step 4: Configure Tailwind CSS**

Update `tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
```

**Step 5: Add Global CSS**

Create `src/index.css` (or `app/styles/globals.css`):
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

**Step 6: Install shadcn Components**
```bash
pnpm dlx shadcn@latest add @basecn/button @basecn/card
```

---

### Installing Individual Components

**From basecn Registry (Base UI)**:
```bash
pnpm dlx shadcn@latest add @basecn/button
pnpm dlx shadcn@latest add @basecn/card @basecn/input @basecn/label
```

**Multiple Components at Once**:
```bash
pnpm dlx shadcn@latest add @basecn/button @basecn/card @basecn/input @basecn/label @basecn/dialog @basecn/select @basecn/tabs @basecn/popover
```

**Overwrite Existing** (useful for migrations):
```bash
pnpm dlx shadcn@latest add @basecn/button --overwrite
```

**List Available Components**:
```bash
pnpm dlx shadcn@latest list --registry @basecn
```

---

## Mapping to components.json

### How Preset URL Translates to components.json

The preset URL generates a `components.json` file with specific configurations. Understanding this mapping helps with manual setup and customization.

**Preset URL Example**:
```
https://ui.shadcn.com/init?base=base&style=default&baseColor=slate&theme=slate&iconLibrary=lucide&font=inter&menuAccent=subtle&menuColor=default&radius=small&template=vite
```

**Generated components.json**:
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",                        ← style parameter
  "rsc": false,                              ← template=vite → rsc=false (Next.js App Router → true)
  "tsx": true,                               ← Always true
  "tailwind": {
    "config": "tailwind.config.js",          ← template determines structure
    "css": "app/styles/globals.css",         ← template determines path
    "baseColor": "slate",                    ← baseColor parameter
    "cssVariables": true                     ← Always true
  },
  "aliases": {
    "components": "@/components",            ← Standard path
    "utils": "@/lib/utils"                   ← Standard path
  },
  "registries": {
    "@basecn": "https://basecn.dev/r/{name}.json"  ← base=base adds this
  }
}
```

**Mapping Table**:

| Preset Parameter | components.json Field | Notes |
|------------------|----------------------|-------|
| `base=base` | `registries["@basecn"]` | Adds basecn registry for Base UI |
| `base=radix` | `registries` (empty or shadcn default) | Uses standard shadcn registry |
| `style=mira` | `style: "mira"` | Sets component style variant |
| `baseColor=slate` | `tailwind.baseColor: "slate"` | Neutral color palette |
| `theme=purple` | (CSS variables in globals.css) | Primary brand color |
| `iconLibrary=lucide` | (No field, manual install) | Package: `lucide-react` |
| `font=inter` | (No field, manual Tailwind config) | Add to `tailwind.config.js` |
| `menuAccent=bold` | (No field, affects component styles) | Component-level styling |
| `radius=small` | (CSS variable `--radius: 0.5rem`) | In globals.css |
| `template=vite` | `rsc: false`, paths | Determines project structure |

---

### Manual Configuration Reference

#### Changing Base Color (After Creation)

**components.json**:
```json
{
  "tailwind": {
    "baseColor": "zinc"  // Change from slate to zinc
  }
}
```

**Effect**: Regenerates neutral color palette (muted, accent, secondary).

**Apply Changes**:
```bash
pnpm dlx shadcn@latest add @basecn/button --overwrite
# Regenerates with new baseColor
```

---

#### Changing Border Radius

**src/index.css**:
```css
:root {
  --radius: 1rem;  /* Change from 0.5rem (small) to 1rem (medium) */
}
```

**Effect**: All components with `rounded-lg` class update.

---

#### Adding Custom Fonts

**tailwind.config.js**:
```js
import { fontFamily } from 'tailwindcss/defaultTheme';

export default {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', ...fontFamily.sans],        // Primary
        secondary: ['Nunito', ...fontFamily.sans],  // Secondary
        accent: ['Fredoka', ...fontFamily.sans],    // Accent
      },
    },
  },
};
```

**src/index.css** (import fonts):
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300..700&family=Nunito:wght@300..700&family=Fredoka:wght@300..700&display=swap');
```

---

#### Adding Custom Theme Colors

**src/index.css**:
```css
:root {
  /* KidKazz Brand Colors */
  --primary: 262.1 83.3% 57.8%;        /* #8B5CF6 - Purple */
  --secondary: 199 89% 48%;             /* #0EA5E9 - Sky Blue */

  /* Accent Colors */
  --accent-pink: 330 81% 60%;          /* #F472B6 */
  --accent-yellow: 48 96% 53%;         /* #FACC15 */
  --accent-green: 142 71% 45%;         /* #22C55E */
  --accent-orange: 25 95% 53%;         /* #FB923C */
}
```

**tailwind.config.js**:
```js
export default {
  theme: {
    extend: {
      colors: {
        'accent-pink': 'hsl(var(--accent-pink))',
        'accent-yellow': 'hsl(var(--accent-yellow))',
        'accent-green': 'hsl(var(--accent-green))',
        'accent-orange': 'hsl(var(--accent-orange))',
      },
    },
  },
};
```

---

### Comparison Table: Preset URL ↔ components.json

| Feature | Preset URL | components.json | CSS/Config |
|---------|-----------|----------------|------------|
| **Component Library** | `base=base` | `registries: {"@basecn": "..."}` | - |
| **Visual Style** | `style=mira` | `style: "mira"` | Affects component markup |
| **Neutral Colors** | `baseColor=slate` | `tailwind.baseColor: "slate"` | Regenerates CSS vars |
| **Brand Color** | `theme=purple` | (Not stored) | `--primary` in CSS |
| **Border Radius** | `radius=small` | (Not stored) | `--radius: 0.5rem` in CSS |
| **Icon Library** | `iconLibrary=lucide` | (Not stored) | `pnpm add lucide-react` |
| **Font** | `font=inter` | (Not stored) | `tailwind.config.js` |
| **Framework** | `template=vite` | `rsc: false` | Project structure |

---

## Base UI Integration

### Why Use Base UI Instead of Radix UI?

**Base UI** (by Material UI team) is a modern alternative to Radix UI primitives:

**Advantages**:
1. **Modern React Patterns**: Uses render props instead of `asChild` (cleaner composition)
2. **Better Tree-Shaking**: Smaller bundle sizes (20-30% reduction)
3. **Headless Design**: More customization flexibility
4. **Active Maintenance**: Material UI team backing
5. **Consistent API**: Unified patterns across components

**Differences from Radix UI**:

| Feature | Radix UI | Base UI |
|---------|----------|---------|
| **Composition** | `asChild` prop | `render` prop or `<Component.Root render={...}>` |
| **Popup Wrapper** | Direct children | `<Positioner>` wrapper |
| **State Attributes** | `data-[state=open]` | `data-[open]`, `data-[closed]` |
| **Component Naming** | `DialogOverlay` | `DialogBackdrop` |
| **Bundle Size** | ~150kb (13 packages) | ~100kb (1 package) |

---

### basecn Registry Setup

**What is basecn?**

[basecn.dev](https://basecn.dev/) is a community registry providing Base UI components compatible with shadcn CLI.

**Adding basecn Registry**:

**components.json**:
```json
{
  "registries": {
    "@basecn": "https://basecn.dev/r/{name}.json"
  }
}
```

**Installing Components from basecn**:
```bash
pnpm dlx shadcn@latest add @basecn/button
pnpm dlx shadcn@latest add @basecn/dialog
```

**How It Works**:
1. shadcn CLI fetches component definition from `https://basecn.dev/r/button.json`
2. Downloads component files to `src/components/ui/button.tsx`
3. Installs required dependencies (`@base-ui/react`, etc.)
4. Component is ready to use

---

### Component Migration Workflow

**Migrating from Radix UI to Base UI** (for existing projects):

#### Step 1: Install Base UI Package
```bash
pnpm add @base-ui/react
```

#### Step 2: Add basecn Registry
Update `components.json`:
```json
{
  "registries": {
    "@basecn": "https://basecn.dev/r/{name}.json"
  }
}
```

#### Step 3: Migrate Components One-by-One
```bash
pnpm dlx shadcn@latest add @basecn/button --overwrite
```

#### Step 4: Update Component Usages

**Before (Radix UI)**:
```tsx
import { Button } from '@/components/ui/button';

<Button asChild>
  <a href="/contact">Contact</a>
</Button>
```

**After (Base UI)**:
```tsx
import { Button, buttonVariants } from '@/components/ui/button';

// Option 1: Use render prop
<Button render={<a href="/contact" />}>Contact</Button>

// Option 2: Use buttonVariants (recommended for links)
<a href="/contact" className={buttonVariants()}>Contact</a>
```

#### Step 5: Update CSS Selectors

**Before (Radix UI)**:
```css
[data-state=open] { opacity: 1; }
[data-state=closed] { opacity: 0; }
```

**After (Base UI)**:
```css
[data-open] { opacity: 1; }
[data-closed] { opacity: 0; }
```

#### Step 6: Test Thoroughly
- [ ] Component renders correctly
- [ ] Interactions work (click, hover, keyboard)
- [ ] Accessibility (focus states, ARIA attributes)
- [ ] No console errors/warnings

---

### Differences from Radix UI Patterns

#### 1. Composition Pattern

**Radix UI (`asChild`)**:
```tsx
<Button asChild>
  <Link to="/dashboard">Dashboard</Link>
</Button>
```

**Base UI (`render` prop)**:
```tsx
<Button render={<Link to="/dashboard" />}>
  Dashboard
</Button>
```

**Base UI (buttonVariants - recommended)**:
```tsx
<Link to="/dashboard" className={buttonVariants()}>
  Dashboard
</Link>
```

---

#### 2. Popup Components (Dialog, Popover, Select)

**Radix UI**:
```tsx
<Popover>
  <PopoverTrigger>Open</PopoverTrigger>
  <PopoverContent>Content</PopoverContent>
</Popover>
```

**Base UI (requires Positioner)**:
```tsx
<Popover.Root>
  <Popover.Trigger>Open</Popover.Trigger>
  <Popover.Positioner>
    <Popover.Popup>Content</Popover.Popup>
  </Popover.Positioner>
</Popover.Root>
```

---

#### 3. State Attributes

**Radix UI**:
```css
.button[data-state="active"] { color: blue; }
.dialog[data-state="open"] { display: block; }
```

**Base UI**:
```css
.button[data-selected] { color: blue; }
.dialog[data-open] { display: block; }
```

---

#### 4. Component Naming

| Radix UI | Base UI |
|----------|---------|
| `DialogOverlay` | `DialogBackdrop` |
| `TabsTrigger` | `TabsTab` |
| `TabsContent` | `TabsPanel` |
| `DropdownMenu` | `Menu` |

---

## Troubleshooting

### Known Issues (December 2025)

The `shadcn create --preset` command has several reported bugs as of December 2025. **Always have manual setup as a fallback**.

---

### Issue 1: Registry Fetch 400 Errors with pnpm

**GitHub Issue**: [#9064](https://github.com/shadcn-ui/ui/issues/9064)

**Symptom**:
```
Error: Failed to fetch from registry (400 Bad Request)
× Failed to create project
```

**Root Cause**: pnpm's package resolution conflicts with shadcn CLI registry fetching.

**Workaround 1: Use npm for Create, Then Switch to pnpm**
```bash
# Create project with npm
npx shadcn@latest create --preset "..." project-name
cd project-name

# Remove npm lock file
rm package-lock.json

# Reinstall with pnpm
pnpm install
```

**Workaround 2: Use yarn**
```bash
yarn dlx shadcn@latest create --preset "..." project-name
```

**Workaround 3: Manual Setup** (See [CLI Command Examples](#cli-command-examples))

---

### Issue 2: Windows EPERM Errors

**GitHub Issue**: [#9043](https://github.com/shadcn-ui/ui/issues/9043)

**Symptom**:
```
Error: EPERM: operation not permitted, scandir 'C:\Users\...\Application Data'
```

**Root Cause**: Windows permission issues accessing user directories.

**Workaround 1: Run from Temp Directory**
```bash
cd C:\temp
pnpm dlx shadcn@latest create --preset "..." project-name
# Then move project to desired location
```

**Workaround 2: Use WSL (Windows Subsystem for Linux)**
```bash
# In WSL terminal
cd /mnt/c/projects
pnpm dlx shadcn@latest create --preset "..." project-name
```

**Workaround 3: Run as Administrator** (Not recommended for security)

**Best Solution**: Use manual setup to avoid Windows-specific issues.

---

### Issue 3: --src-dir Flag Causes ENOENT

**GitHub Issue**: [#9081](https://github.com/shadcn-ui/ui/issues/9081)

**Symptom**:
```
Error: ENOENT: no such file or directory, open 'src/components/ui/button.tsx'
```

**Root Cause**: CLI doesn't properly handle `--src-dir` flag with preset URLs.

**Workaround**: Don't use `--src-dir` flag with presets
```bash
# ❌ Don't do this
pnpm dlx shadcn@latest create --preset "..." --src-dir src project-name

# ✅ Do this (use default structure)
pnpm dlx shadcn@latest create --preset "..." project-name
```

**If you need src/ structure**: Manually move files after creation.

---

### Manual Setup Fallback (Always Recommended)

Given the known issues, **manual setup is often more reliable** than the preset command:

**Manual Setup Steps**:

```bash
# 1. Create Vite project
pnpm create vite kidkazz-project --template react-ts
cd kidkazz-project

# 2. Install dependencies
pnpm add @base-ui/react tailwindcss-animate class-variance-authority clsx tailwind-merge lucide-react
pnpm add -D tailwindcss postcss autoprefixer

# 3. Initialize Tailwind
npx tailwindcss init -p

# 4. Create components.json (copy from preset template above)
# 5. Configure tailwind.config.js (copy from template)
# 6. Add globals.css (copy from template)

# 7. Install shadcn components
pnpm dlx shadcn@latest add @basecn/button @basecn/card
```

**Manual Setup Time**: 10-15 minutes (vs preset command: 2-3 minutes when it works).

---

### General Troubleshooting Tips

#### Cannot Find Module '@base-ui/react'

**Symptom**: TypeScript error after installing components.

**Solution**:
```bash
pnpm add @base-ui/react
# Restart TypeScript server (VS Code: Cmd+Shift+P → "TypeScript: Restart TS Server")
```

---

#### Component Styles Not Applying

**Check 1**: Ensure globals.css is imported in main.tsx/App.tsx
```tsx
import './index.css';  // or './app/styles/globals.css'
```

**Check 2**: Verify Tailwind config has correct content paths
```js
content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
```

**Check 3**: Check CSS variables are defined
```css
/* In src/index.css */
:root {
  --background: 0 0% 100%;
  /* ... other variables */
}
```

---

#### Components Look Different from shadcn Docs

**Reason**: shadcn docs show Radix UI version, you're using Base UI version.

**Solution**: Refer to [basecn.dev](https://basecn.dev/) for Base UI component examples.

---

#### basecn Registry 404 Error

**Symptom**:
```
Error: Component @basecn/button not found
```

**Solutions**:
1. Check registry URL in components.json: `https://basecn.dev/r/{name}.json`
2. Try installing from default registry first: `pnpm dlx shadcn@latest add button` (Radix version)
3. Check [basecn.dev](https://basecn.dev/) for component availability

---

#### Port Already in Use (Vite)

**Symptom**:
```
Port 5173 is already in use
```

**Solution**:
```bash
# Option 1: Kill process on port 5173
lsof -ti:5173 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :5173   # Windows (note PID, then: taskkill /PID <pid> /F)

# Option 2: Use different port
pnpm dev -- --port 3000
```

---

### Getting Help

**Resources**:
- [shadcn/ui Discord](https://discord.gg/shadcn-ui)
- [GitHub Issues](https://github.com/shadcn-ui/ui/issues)
- [basecn Documentation](https://basecn.dev/)
- KidKazz Internal: [UI_DESIGN_GUIDELINE.md](./UI_DESIGN_GUIDELINE.md)

**Reporting Issues**:
1. Check existing GitHub issues first
2. Provide reproduction steps
3. Include shadcn CLI version: `pnpm dlx shadcn@latest --version`
4. Include OS and package manager version

---

## Summary

### Quick Reference

**5 KidKazz Preset Templates**:
1. **Admin Dashboard**: `style=default`, `radius=small`, `theme=slate`, `template=vite`
2. **POS**: `style=mira`, `radius=medium`, `theme=zinc`, `template=vite`
3. **Retail**: `style=nova`, `radius=large`, `theme=purple`, `template=next`
4. **Wholesale**: `style=default`, `radius=small`, `theme=blue`, `template=next`
5. **Mobile**: `style=mira`, `radius=medium`, `theme=slate`, `template=expo`

**Always Use**:
- `base=base` (Base UI, not Radix)
- `iconLibrary=lucide` (consistent across all apps)
- Manual setup fallback (preset command has bugs)

**Key Decisions**:
- **Style**: `default` (professional) vs `mira` (compact) vs `nova` (spacious)
- **Radius**: `small` (data-heavy) vs `medium` (balanced) vs `large` (friendly)
- **Font**: `inter` (professional) vs `nunito` (friendly)
- **Template**: `vite` (SPA) vs `next` (SEO) vs `expo` (mobile)

---

**Document Version**: 1.0
**Last Updated**: December 19, 2025
**Author**: KidKazz Engineering Team
**Status**: Production Ready

---

**Related Documentation**:
- [UI Design Guideline](./UI_DESIGN_GUIDELINE.md)
- [Base UI Migration Guide](./BASE_UI_MIGRATION_GUIDE.md)
- [Base UI Migration Execution Plan](./BASE_UI_MIGRATION_EXECUTION_PLAN.md)
