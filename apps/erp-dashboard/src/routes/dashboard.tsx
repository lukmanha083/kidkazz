import { Logo } from '@/components/Logo';
import { SystemStatus } from '@/components/SystemStatus';
import { BottomNav } from '@/components/layout/BottomNav';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Link, Outlet, createFileRoute, useLocation } from '@tanstack/react-router';
import {
  Bell,
  Briefcase,
  Building2,
  Calculator,
  ChevronRight,
  DollarSign,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Package,
  Settings,
  ShoppingCart,
  Sun,
  Tag,
  UserCheck,
  Users,
  Warehouse,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

export const Route = createFileRoute('/dashboard')({
  component: DashboardLayout,
});

interface NavItem {
  id: string;
  title: string;
  href: string;
  icon: React.ElementType;
  shortcut?: string;
  submenu?: { title: string; href: string }[];
}

const navItems: NavItem[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'orders',
    title: 'Orders',
    href: '/dashboard/orders',
    icon: ShoppingCart,
  },
  {
    id: 'products',
    title: 'Products',
    href: '/dashboard/products',
    icon: Package,
    submenu: [
      { title: 'All Products', href: '/dashboard/products/all' },
      { title: 'Category', href: '/dashboard/products/category' },
      { title: 'Product Bundle', href: '/dashboard/products/bundle' },
      { title: 'Product Variant', href: '/dashboard/products/variant' },
      { title: 'Unit of Measure', href: '/dashboard/products/uom' },
    ],
  },
  {
    id: 'inventory',
    title: 'Inventory',
    href: '/dashboard/inventory',
    icon: Warehouse,
    submenu: [
      { title: 'Warehouse', href: '/dashboard/inventory/warehouse' },
      { title: 'UOM Conversion', href: '/dashboard/inventory/uom-conversion' },
      { title: 'Transfer Stock', href: '/dashboard/inventory/transfer-stock' },
      { title: 'Low Stock', href: '/dashboard/inventory/low-stock' },
      { title: 'Expired Stock', href: '/dashboard/inventory/expired-stock' },
    ],
  },
  {
    id: 'accounting',
    title: 'Accounting',
    href: '/dashboard/accounting',
    icon: Calculator,
    submenu: [
      {
        title: 'Chart of Accounts',
        href: '/dashboard/accounting/chart-of-accounts',
      },
      { title: 'Journal Entry', href: '/dashboard/accounting/journal-entry' },
      { title: 'General Ledger', href: '/dashboard/accounting/general-ledger' },
      { title: 'Expenses', href: '/dashboard/accounting/expenses' },
      {
        title: 'Income Statement',
        href: '/dashboard/accounting/income-statement',
      },
      { title: 'Balance Sheet', href: '/dashboard/accounting/balance-sheet' },
      {
        title: 'Sales by Warehouse',
        href: '/dashboard/accounting/reports/sales-by-warehouse',
      },
      {
        title: 'Sales by Person',
        href: '/dashboard/accounting/reports/sales-by-person',
      },
    ],
  },
  {
    id: 'business-partner',
    title: 'Business Partner',
    href: '/dashboard/business-partner',
    icon: Briefcase,
    submenu: [
      { title: 'Overview', href: '/dashboard/business-partner' },
      { title: 'Customers', href: '/dashboard/business-partner/customers' },
      { title: 'Suppliers', href: '/dashboard/business-partner/suppliers' },
      { title: 'Employees', href: '/dashboard/business-partner/employees' },
    ],
  },
  {
    id: 'promotions',
    title: 'Promotions',
    href: '/dashboard/promotions',
    icon: Tag,
  },
  {
    id: 'price-lists',
    title: 'Price Lists',
    href: '/dashboard/price-lists',
    icon: DollarSign,
  },
];

/**
 * Layout component that renders the dashboard shell: sidebar navigation, top bar, and page content outlet.
 *
 * Renders a responsive left sidebar with navigation and optional nested submenus, a mobile drawer, and a top bar
 * containing breadcrumb, system status, notifications, and a dark-mode toggle. Manages internal state for
 * mobile menu visibility, the active menu item, and dark mode; when dark mode changes it adds or removes the
 * "dark" class on document.documentElement.
 *
 * @returns A JSX element containing the dashboard layout
 */
function DashboardLayout() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [activeMenu, setActiveMenu] = useState('dashboard');

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  // Get page title from current route
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Dashboard';
    if (path.includes('/products')) return 'Products';
    if (path.includes('/orders')) return 'Orders';
    if (
      path.includes('/inventory') ||
      path.includes('/warehouse') ||
      path.includes('/transfer-stock')
    )
      return 'Inventory';
    if (path.includes('/business-partner')) return 'Business Partner';
    if (path.includes('/settings')) return 'Settings';
    if (path.includes('/promotions')) return 'Promotions';
    if (path.includes('/price-lists')) return 'Price Lists';
    if (path.includes('/accounting')) return 'Accounting';
    if (path.includes('/admin')) return 'Admin';
    return 'Dashboard';
  };

  // Apply dark mode class to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar - Compact width (192px) - Sticky */}
      <div className="hidden desktop:flex desktop:w-48 border-r border-border flex-col bg-card sticky top-0 h-screen">
        {/* Store Header */}
        <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
          <Logo size="md" showText={true} />
        </div>

        {/* Navigation Menu - Scrollable */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <div key={item.id}>
                <Link
                  to={item.href}
                  onClick={() => setActiveMenu(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3 h-9 px-3 rounded-md text-sm font-medium transition-colors',
                    active && 'bg-accent'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 text-left">{item.title}</span>
                  {item.shortcut && (
                    <span className="text-xs text-muted-foreground">{item.shortcut}</span>
                  )}
                </Link>
                {item.submenu && active && (
                  <div className="ml-9 mt-1 space-y-1">
                    {item.submenu.map((subitem) => (
                      <Link
                        key={subitem.href}
                        to={subitem.href}
                        className="flex items-center h-8 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {subitem.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom Section - Stuck to Bottom */}
        <div className="p-3 border-t border-border space-y-1 shrink-0">
          <Link to="/dashboard/settings">
            <Button variant="ghost" className="w-full justify-start gap-3 h-9">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Button>
          </Link>

          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-2 h-auto p-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-sm">
                    A
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium truncate">admin@kidkazz.com</p>
                </div>
                <Menu className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tablet Sidebar - Collapsed (icons only, 64px) - Sticky */}
      <div className="hidden tablet:flex desktop:hidden tablet:w-16 border-r border-border flex-col bg-card sticky top-0 h-screen">
        {/* Store Header */}
        <div className="p-2 border-b border-border flex items-center justify-center h-[65px] shrink-0">
          <Logo size="sm" showText={false} />
        </div>

        {/* Navigation Menu - Icons Only */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <div key={item.id}>
                <Link
                  to={item.href}
                  onClick={() => setActiveMenu(item.id)}
                  className={cn(
                    'w-full flex items-center justify-center h-12 rounded-md transition-colors',
                    active ? 'bg-accent' : 'hover:bg-accent/50'
                  )}
                  title={item.title}
                  aria-label={item.title}
                >
                  <Icon className="h-5 w-5" />
                </Link>
              </div>
            );
          })}
        </nav>

        {/* Bottom Section - Icons Only - Stuck to Bottom */}
        <div className="p-2 border-t border-border space-y-1 shrink-0">
          <Link to="/dashboard/settings">
            <Button
              variant="ghost"
              size="icon"
              className="w-full h-12"
              title="Settings"
              aria-label="Open settings"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-full h-12"
                aria-label="Open user menu"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-sm">
                    A
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Sidebar - Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 tablet:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsMobileMenuOpen(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setIsMobileMenuOpen(false);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Close menu"
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-card border-r flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
              <Logo size="md" showText={true} />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Navigation Menu - Scrollable */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <div key={item.id}>
                    <Link
                      to={item.href}
                      onClick={() => {
                        setActiveMenu(item.id);
                        // Only close drawer if menu item has no submenu
                        if (!item.submenu) {
                          setIsMobileMenuOpen(false);
                        }
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 h-9 px-3 rounded-md text-sm font-medium transition-colors',
                        active && 'bg-accent'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="flex-1">{item.title}</span>
                    </Link>
                    {item.submenu && active && (
                      <div className="ml-9 mt-1 space-y-1">
                        {item.submenu.map((subitem) => (
                          <Link
                            key={subitem.href}
                            to={subitem.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center h-8 text-sm text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {subitem.title}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            {/* Bottom Section - Stuck to Bottom */}
            <div className="p-3 border-t border-border space-y-1 shrink-0">
              <Link to="/dashboard/settings">
                <Button variant="ghost" className="w-full justify-start gap-3 h-9">
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </Button>
              </Link>

              {/* User Profile */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start gap-2 h-auto p-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-sm">
                        A
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium truncate">admin@kidkazz.com</p>
                    </div>
                    <Menu className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem>Profile</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="h-14 border-b border-border flex items-center justify-between px-4 tablet:px-6 bg-card">
          {/* Mobile: Hamburger + Logo */}
          <div className="flex items-center gap-3 tablet:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle mobile menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Logo size="sm" showText={true} />
          </div>

          {/* Tablet/Desktop: Breadcrumb */}
          <Breadcrumb className="hidden tablet:block">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard" className="flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage>{getPageTitle()}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Right Actions */}
          <div className="flex items-center gap-1 tablet:gap-2">
            {/* System Status - Hidden on mobile */}
            <div className="hidden tablet:block">
              <SystemStatus />
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="relative"
              aria-label="Show notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
            </Button>

            {/* Dark Mode Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDarkMode(!darkMode)}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Page Content */}
        <div className="p-4 pb-20 tablet:p-5 tablet:pb-5 desktop:p-6 desktop:pb-6">
          <Outlet />
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav onOpenMenu={() => setIsMobileMenuOpen(true)} />
    </div>
  );
}
