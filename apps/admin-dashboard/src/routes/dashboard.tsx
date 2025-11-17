import { createFileRoute, Link, Outlet, useLocation } from '@tanstack/react-router';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  ChevronRight,
  Moon,
  Sun,
  Tag,
  DollarSign,
  Warehouse,
  ArrowRightLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Logo } from '@/components/Logo';
import { SystemStatus } from '@/components/SystemStatus';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

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
    id: 'search',
    title: 'Search',
    href: '/dashboard/search',
    icon: Search,
    shortcut: '⌘K'
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard
  },
  {
    id: 'orders',
    title: 'Orders',
    href: '/dashboard/orders',
    icon: ShoppingCart
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
    ]
  },
  {
    id: 'inventory',
    title: 'Inventory',
    href: '/dashboard/inventory',
    icon: Warehouse,
    submenu: [
      { title: 'Warehouse', href: '/dashboard/warehouse' },
    ]
  },
  {
    id: 'transfer-stock',
    title: 'Transfer Stock',
    href: '/dashboard/transfer-stock',
    icon: ArrowRightLeft
  },
  {
    id: 'customers',
    title: 'Customers',
    href: '/dashboard/customers',
    icon: Users
  },
  {
    id: 'promotions',
    title: 'Promotions',
    href: '/dashboard/promotions',
    icon: Tag
  },
  {
    id: 'price-lists',
    title: 'Price Lists',
    href: '/dashboard/price-lists',
    icon: DollarSign
  },
];

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
    if (path.includes('/inventory')) return 'Inventory';
    if (path.includes('/customers')) return 'Customers';
    if (path.includes('/settings')) return 'Settings';
    if (path.includes('/promotions')) return 'Promotions';
    if (path.includes('/price-lists')) return 'Price Lists';
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
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-56 border-r border-border flex flex-col bg-card">
        {/* Store Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <Logo size="md" showText={true} />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 lg:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation Menu */}
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
                    "w-full flex items-center gap-3 h-9 px-3 rounded-md text-sm font-medium transition-colors",
                    active && "bg-accent"
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

        {/* Bottom Section with Settings */}
        <div className="p-3 border-t border-border space-y-1">
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

      {/* Mobile Sidebar */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-card border-r">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <Logo size="md" showText={true} />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <nav className="p-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <div key={item.id}>
                    <Link
                      to={item.href}
                      onClick={() => {
                        setActiveMenu(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 h-9 px-3 rounded-md text-sm font-medium transition-colors",
                        active && "bg-accent"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="flex-1">{item.title}</span>
                    </Link>
                  </div>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="h-14 border-b border-border flex items-center justify-between px-6 bg-card">
          {/* Breadcrumb */}
          <Breadcrumb>
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
          <div className="flex items-center gap-2">
            {/* System Status */}
            <SystemStatus />

            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
            </Button>

            {/* Dark Mode Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDarkMode(!darkMode)}
            >
              {darkMode ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 p-6 overflow-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
