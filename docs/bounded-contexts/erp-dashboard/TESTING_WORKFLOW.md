# kidkazz Real Time ERP Dashboard - Testing Workflow

> Comprehensive testing checklist for ERP dashboard functionality

---

## 🎯 Testing Overview

This document outlines all testing workflows for the kidkazz ERP dashboard, including UI/UX testing, functionality testing, and future role-based access control scenarios.

---

## 1. 🔐 Authentication & Login Testing

### Login Page UI/UX
- [ ] **Logo & Branding**
  - [ ] Logo icon displays correctly (black square with white 'k')
  - [ ] Logo has proper spacing/margin from brand name
  - [ ] "kidkazz" brand name is centered and proportional
  - [ ] Subtitle text is readable and properly aligned
  - [ ] All elements are symmetrically arranged

- [ ] **Form Layout**
  - [ ] Email field displays with mail icon
  - [ ] Password field displays with lock icon
  - [ ] Input fields have proper height (h-11)
  - [ ] Icons are properly positioned inside inputs
  - [ ] "Remember me" checkbox is aligned correctly
  - [ ] "Forgot password?" link is visible

- [ ] **Responsive Design**
  - [ ] Login page displays correctly on mobile (< 640px)
  - [ ] Login page displays correctly on tablet (768px)
  - [ ] Login page displays correctly on desktop (1024px+)
  - [ ] Card remains centered on all screen sizes

### Login Functionality
- [ ] **Form Validation**
  - [ ] Email field requires valid email format
  - [ ] Password field is required
  - [ ] Form cannot be submitted empty
  - [ ] Error messages display for invalid inputs

- [ ] **Login Flow**
  - [ ] Click "Sign in" button starts loading state
  - [ ] Loading spinner appears during authentication
  - [ ] Button is disabled during loading
  - [ ] Successful login redirects to `/dashboard`
  - [ ] Failed login shows error message
  - [ ] "Remember me" checkbox state is preserved

- [ ] **Demo Credentials**
  - [ ] Demo credentials section is visible
  - [ ] Credentials are copyable
  - [ ] Using demo credentials allows login

---

## 2. 📊 Dashboard Home Testing

### Dashboard UI/UX
- [ ] **Header**
  - [ ] Logo displays correctly in header
  - [ ] Logo shows text on desktop (sm+ breakpoint)
  - [ ] Logo shows icon only on mobile
  - [ ] Search bar is visible on medium+ screens
  - [ ] Notification bell shows badge indicator
  - [ ] Logout button is visible and accessible
  - [ ] Mobile menu toggle works correctly

- [ ] **Sidebar (Desktop)**
  - [ ] Sidebar displays on large screens (lg+)
  - [ ] Logo is visible in sidebar (if applicable)
  - [ ] Navigation items are listed correctly
  - [ ] Active route is highlighted (black background)
  - [ ] Hover states work on inactive items
  - [ ] Admin user info is sticky at bottom
  - [ ] Admin user info stays visible when scrolling
  - [ ] Admin email (admin@kidkazz.com) is displayed

- [ ] **Mobile Menu**
  - [ ] Menu icon appears on mobile/tablet
  - [ ] Clicking menu icon opens overlay
  - [ ] Sidebar slides in from left
  - [ ] Clicking outside closes menu
  - [ ] Clicking X icon closes menu
  - [ ] Navigation links work in mobile menu
  - [ ] Clicking nav link closes menu

### Dashboard Content
- [ ] **Stats Cards**
  - [ ] All 4 stat cards display (Revenue, Orders, Products, Customers)
  - [ ] Card icons are visible
  - [ ] Values are formatted correctly
  - [ ] Percentage changes show correct color (green/red)
  - [ ] Arrow icons match positive/negative change

- [ ] **Recent Orders**
  - [ ] Recent orders card displays
  - [ ] Order count is accurate
  - [ ] Customer names are visible
  - [ ] Product names are visible
  - [ ] Amounts are formatted as currency
  - [ ] Status badges show correct colors
  - [ ] Border appears between items

- [ ] **Top Products**
  - [ ] Top products card displays
  - [ ] Product names are visible
  - [ ] Sold quantities are shown
  - [ ] Progress bars display correctly
  - [ ] Progress bar widths match percentages

- [ ] **Quick Actions**
  - [ ] All 4 action buttons display
  - [ ] Icons are visible and correct
  - [ ] Buttons have hover states
  - [ ] Buttons are clickable

---

## 3. 📦 Products Management Testing

### Products Page UI
- [ ] **Page Header**
  - [ ] "Products" title displays
  - [ ] Description text is visible
  - [ ] "Add Product" button is positioned correctly
  - [ ] Button has proper styling (gap-2, black)

- [ ] **Products Table**
  - [ ] Table displays all products
  - [ ] Search bar is visible and positioned correctly
  - [ ] Product count shows (X of Y products)
  - [ ] All columns display properly
  - [ ] Product names are visible
  - [ ] SKUs display in monospace font
  - [ ] Categories are shown
  - [ ] Prices are formatted correctly
  - [ ] Stock quantities are visible
  - [ ] Low stock (< 20) shows in red
  - [ ] Status badges display with correct colors
  - [ ] Action buttons (eye, edit, trash) are visible

### Add Product Functionality
- [ ] **Form Display**
  - [ ] Click "Add Product" shows form
  - [ ] Form card appears with proper styling
  - [ ] All form fields are visible
  - [ ] Form has proper grid layout (2 columns)

- [ ] **Form Fields**
  - [ ] Product Name input accepts text
  - [ ] SKU input accepts alphanumeric
  - [ ] Category input accepts text
  - [ ] Price input accepts decimal numbers
  - [ ] Stock input accepts whole numbers
  - [ ] All fields show proper labels

- [ ] **Form Validation**
  - [ ] All fields are required
  - [ ] Empty submission shows validation errors
  - [ ] Price accepts decimal values (29.99)
  - [ ] Stock accepts only integers
  - [ ] Invalid inputs show error states

- [ ] **Form Submission**
  - [ ] Click "Create Product" adds product to table
  - [ ] New product appears at bottom of list
  - [ ] Form clears after submission
  - [ ] Form closes after submission
  - [ ] Product count updates

- [ ] **Form Cancellation**
  - [ ] Click "Cancel" closes form
  - [ ] Form data is cleared
  - [ ] No product is added

### Product Actions
- [ ] **View Product**
  - [ ] Eye icon button is clickable
  - [ ] Click shows product details (future implementation)

- [ ] **Edit Product**
  - [ ] Edit icon button is clickable
  - [ ] Click opens edit form (future implementation)

- [ ] **Delete Product**
  - [ ] Delete button has destructive styling
  - [ ] Click removes product from table
  - [ ] Product count updates
  - [ ] Table re-renders without deleted item

### Search & Filter
- [ ] **Search Functionality**
  - [ ] Search input accepts text
  - [ ] Search filters by product name
  - [ ] Search filters by SKU
  - [ ] Search filters by category
  - [ ] Search is case-insensitive
  - [ ] Clearing search shows all products
  - [ ] Filtered count updates

---

## 4. 🛒 Orders Management Testing

### Orders Page UI
- [ ] **Stats Cards**
  - [ ] All 5 stat cards display
  - [ ] Total orders count is accurate
  - [ ] Pending count matches filtered data
  - [ ] Processing count matches filtered data
  - [ ] Shipped count matches filtered data
  - [ ] Delivered count matches filtered data
  - [ ] Colors match status types

- [ ] **Orders Table**
  - [ ] Table displays all orders
  - [ ] Search bar is visible
  - [ ] Order count shows correctly
  - [ ] All columns are visible
  - [ ] Order IDs display in monospace
  - [ ] Customer names are visible
  - [ ] Customer emails are shown
  - [ ] Product names are visible
  - [ ] Quantities are correct
  - [ ] Amounts are formatted as currency
  - [ ] Dates are formatted properly
  - [ ] Status badges show with icons
  - [ ] Status colors are correct
  - [ ] View button is visible

### Order Status Testing
- [ ] **Status Display**
  - [ ] Pending status shows yellow badge
  - [ ] Processing status shows blue badge
  - [ ] Shipped status shows purple badge
  - [ ] Delivered status shows green badge
  - [ ] Cancelled status shows red badge
  - [ ] Correct icon displays for each status

### Search Functionality
- [ ] **Search Orders**
  - [ ] Search by order ID works
  - [ ] Search by customer name works
  - [ ] Search by product name works
  - [ ] Search is case-insensitive
  - [ ] Clearing search shows all orders
  - [ ] Filtered count updates

### Order Actions
- [ ] **View Order**
  - [ ] Eye icon button is clickable
  - [ ] Click shows order details (future)

---

## 5. 👥 Customers Page Testing

### Page Display
- [ ] **Placeholder Content**
  - [ ] "Customers" title displays
  - [ ] Description text is visible
  - [ ] Placeholder message shows
  - [ ] Border dashed box is visible

---

## 6. ⚙️ Settings Page Testing

### Page Display
- [ ] **Placeholder Content**
  - [ ] "Settings" title displays
  - [ ] Description text is visible
  - [ ] Placeholder message shows
  - [ ] Border dashed box is visible

---

## 7. 🎨 UI/UX Consistency Testing

### Color Scheme
- [ ] **Black & White Theme**
  - [ ] Background is pure white (#FFFFFF)
  - [ ] Text is near-black (#0A0A0A)
  - [ ] Borders are light gray (#E5E5E5)
  - [ ] Primary buttons are black (#171717)
  - [ ] Secondary buttons are light gray
  - [ ] Hover states use muted gray

### Typography
- [ ] **Font Consistency**
  - [ ] Headings use proper font weight
  - [ ] Body text is readable (16px base)
  - [ ] Labels are medium weight
  - [ ] Muted text uses muted-foreground color
  - [ ] Monospace used for codes (SKU, Order ID)

### Spacing & Layout
- [ ] **Proportions**
  - [ ] Consistent padding in cards
  - [ ] Proper spacing between sections
  - [ ] Buttons have adequate touch targets (44px)
  - [ ] Form inputs have consistent height (h-11)

### Components
- [ ] **shadcn/ui Components**
  - [ ] Buttons render correctly
  - [ ] Cards have proper shadows
  - [ ] Inputs have focus states
  - [ ] Tables have hover rows
  - [ ] Badges display correctly

---

## 8. 📱 Responsive Testing

### Mobile (< 640px)
- [ ] **Login Page**
  - [ ] Logo and text are centered
  - [ ] Card width adjusts to screen
  - [ ] Inputs are full width
  - [ ] Buttons are full width
  - [ ] Text is readable

- [ ] **Dashboard**
  - [ ] Header is responsive
  - [ ] Logo shows icon only
  - [ ] Menu toggle appears
  - [ ] Stats cards stack vertically
  - [ ] Tables scroll horizontally
  - [ ] Main content has proper padding

### Tablet (768px - 1023px)
- [ ] **Layout**
  - [ ] Header shows search on tablet
  - [ ] Sidebar hidden, menu toggle visible
  - [ ] Stats cards show 2 columns
  - [ ] Tables are readable
  - [ ] Content area adjusts properly

### Desktop (1024px+)
- [ ] **Layout**
  - [ ] Sidebar is visible
  - [ ] Header shows full logo
  - [ ] Stats cards show 4 columns
  - [ ] Tables have optimal width
  - [ ] Admin user info sticky at bottom

---

## 9. 🔄 Navigation Testing

### Route Navigation
- [ ] **Dashboard Routes**
  - [ ] `/` loads login page
  - [ ] `/dashboard` loads dashboard home
  - [ ] `/dashboard/products` loads products page
  - [ ] `/dashboard/orders` loads orders page
  - [ ] `/dashboard/customers` loads customers page
  - [ ] `/dashboard/settings` loads settings page

- [ ] **Active States**
  - [ ] Dashboard link highlighted when on `/dashboard`
  - [ ] Products link highlighted when on `/dashboard/products`
  - [ ] Orders link highlighted when on `/dashboard/orders`
  - [ ] Customers link highlighted when on `/dashboard/customers`
  - [ ] Settings link highlighted when on `/dashboard/settings`

- [ ] **Browser Navigation**
  - [ ] Back button works correctly
  - [ ] Forward button works correctly
  - [ ] Page refresh maintains route
  - [ ] Direct URL access works

---

## 10. 🔮 Future Feature Testing (Role-Based Access)

### User Roles (Planned)
When implementing role-based access control, test the following:

#### Admin User (Full Access)
- [ ] **Permissions**
  - [ ] Can view all pages
  - [ ] Can add products
  - [ ] Can edit products
  - [ ] Can delete products
  - [ ] Can view all orders
  - [ ] Can update order status
  - [ ] Can manage users
  - [ ] Can access settings
  - [ ] Can view analytics/reports

#### Regular User (Limited Access)
- [ ] **Permissions**
  - [ ] Can view dashboard (read-only stats)
  - [ ] Can view products (read-only)
  - [ ] Cannot add products
  - [ ] Cannot edit products
  - [ ] Cannot delete products
  - [ ] Can view orders (read-only)
  - [ ] Cannot update order status
  - [ ] Cannot manage users
  - [ ] Cannot access settings
  - [ ] Limited analytics access

#### Role Assignment
- [ ] **Admin Functions**
  - [ ] Admin can create new users
  - [ ] Admin can assign roles to users
  - [ ] Admin can change user roles
  - [ ] Admin can deactivate users
  - [ ] Admin can reset user passwords

#### UI Adaptations by Role
- [ ] **Admin User UI**
  - [ ] All action buttons visible
  - [ ] "Add Product" button visible
  - [ ] Edit/Delete icons visible
  - [ ] Settings menu accessible
  - [ ] User management menu visible

- [ ] **Regular User UI**
  - [ ] Action buttons hidden or disabled
  - [ ] "Add Product" button hidden
  - [ ] Edit/Delete icons hidden
  - [ ] Settings menu hidden
  - [ ] User management hidden
  - [ ] View-only mode indicated visually

#### Access Control Testing
- [ ] **Route Protection**
  - [ ] Regular users redirected from admin-only routes
  - [ ] API calls check user permissions
  - [ ] Unauthorized actions show error messages
  - [ ] Session expires after timeout
  - [ ] Re-login required after session expires

---

## 11. 🚀 Performance Testing

### Page Load
- [ ] **Initial Load**
  - [ ] Login page loads in < 2 seconds
  - [ ] Dashboard loads in < 2 seconds
  - [ ] Route transitions are smooth
  - [ ] No layout shift on load

### Interactions
- [ ] **Responsiveness**
  - [ ] Button clicks respond immediately
  - [ ] Form inputs have no lag
  - [ ] Navigation is instant
  - [ ] Search filters quickly (< 200ms)

---

## 12. ♿ Accessibility Testing

### Keyboard Navigation
- [ ] **Keyboard Support**
  - [ ] Tab key navigates through elements
  - [ ] Enter key submits forms
  - [ ] Enter key activates buttons
  - [ ] Escape key closes modals
  - [ ] Focus states are visible

### Screen Readers
- [ ] **ARIA Support**
  - [ ] Buttons have proper labels
  - [ ] Form inputs have labels
  - [ ] Images have alt text
  - [ ] Headings are hierarchical
  - [ ] Status messages announced

### Visual
- [ ] **Contrast & Readability**
  - [ ] Text meets WCAG AA contrast (4.5:1)
  - [ ] Large text meets WCAG AA (3:1)
  - [ ] Focus indicators visible
  - [ ] Color not sole indicator

---

## 🎯 Testing Priority Levels

### P0 - Critical (Must Work)
- Login functionality
- Dashboard navigation
- Add product functionality
- View products/orders
- Responsive layout

### P1 - Important (Should Work)
- Search functionality
- Delete product
- Status badges
- Sticky sidebar user info
- Mobile menu

### P2 - Nice to Have (Could Work)
- Hover animations
- Loading states
- Demo credentials section

---

## 📝 Test Execution

### How to Test

1. **Start Development Server**
   ```bash
   cd apps/erp-dashboard
   pnpm dev
   ```

2. **Open Browser**
   - Navigate to `http://localhost:5173/`

3. **Follow Checklist**
   - Test each section systematically
   - Check items as completed
   - Note any issues found

4. **Document Issues**
   - Create issue for each bug
   - Include steps to reproduce
   - Add screenshots if applicable

### Browser Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

---

**Document Version:** 1.0.0
**Last Updated:** November 15, 2025
**Status:** Active Testing Document
