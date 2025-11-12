import { Link } from '@tanstack/react-router';

export function Sidebar() {
  return (
    <aside className="w-64 bg-card border-r border-border">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-foreground">Wholesale Admin</h2>
      </div>

      <nav className="px-4 space-y-1">
        <Link
          to="/admin"
          className="flex items-center px-4 py-3 text-sm font-medium rounded-md hover:bg-muted transition-colors"
          activeProps={{ className: 'bg-muted text-foreground' }}
          inactiveProps={{ className: 'text-muted-foreground' }}
        >
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Dashboard
        </Link>

        <Link
          to="/admin/products"
          className="flex items-center px-4 py-3 text-sm font-medium rounded-md hover:bg-muted transition-colors"
          activeProps={{ className: 'bg-muted text-foreground' }}
          inactiveProps={{ className: 'text-muted-foreground' }}
        >
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          Products
        </Link>

        <Link
          to="/admin/orders"
          className="flex items-center px-4 py-3 text-sm font-medium rounded-md hover:bg-muted transition-colors"
          activeProps={{ className: 'bg-muted text-foreground' }}
          inactiveProps={{ className: 'text-muted-foreground' }}
        >
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          Orders
        </Link>

        <Link
          to="/admin/users"
          className="flex items-center px-4 py-3 text-sm font-medium rounded-md hover:bg-muted transition-colors"
          activeProps={{ className: 'bg-muted text-foreground' }}
          inactiveProps={{ className: 'text-muted-foreground' }}
        >
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          Users
        </Link>

        <div className="pt-4 mt-4 border-t border-border">
          <Link
            to="/admin/settings"
            className="flex items-center px-4 py-3 text-sm font-medium rounded-md hover:bg-muted transition-colors text-muted-foreground"
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </Link>
        </div>
      </nav>
    </aside>
  );
}
