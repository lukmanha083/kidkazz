import { Link, useLocation } from '@tanstack/react-router';
import { LayoutDashboard, ShoppingCart, Package, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavItem {
  icon: React.ElementType;
  label: string;
  href?: string;
  action?: () => void;
}

interface BottomNavProps {
  onOpenMenu?: () => void;
}

const navItems: BottomNavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: ShoppingCart, label: 'Orders', href: '/dashboard/orders' },
  { icon: Package, label: 'Products', href: '/dashboard/products/all' },
];

/**
 * Mobile bottom navigation bar component.
 *
 * Displays a fixed bottom navigation bar on mobile devices (hidden on tablet and above).
 * Provides quick access to primary sections: Dashboard, Orders, Products, and a More menu.
 *
 * @param onOpenMenu - Callback function triggered when the "More" button is clicked
 * @returns The bottom navigation bar JSX element
 */
export function BottomNav({ onOpenMenu }: BottomNavProps) {
  const location = useLocation();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 tablet:hidden bg-card border-t border-border safe-area-bottom z-30">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.href ? isActive(item.href) : false;

          return item.href ? (
            <Link
              key={item.label}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          ) : null;
        })}

        {/* More button to open drawer */}
        <button
          onClick={onOpenMenu}
          className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Menu className="h-5 w-5" />
          <span className="text-xs font-medium">More</span>
        </button>
      </div>
    </nav>
  );
}
