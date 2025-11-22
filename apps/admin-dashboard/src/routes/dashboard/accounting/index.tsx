import { createFileRoute, Link } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import {
  BookOpen,
  FileText,
  BarChart3,
  Scale,
  PlusCircle,
  TrendingUp,
  Layers,
  Clock,
  Receipt,
  Warehouse,
  Users,
} from 'lucide-react';
import { accountingApi } from '@/lib/api';

export const Route = createFileRoute('/dashboard/accounting/')({
  component: AccountingDashboardPage,
});

function AccountingDashboardPage() {
  const [stats, setStats] = useState({
    totalAccounts: 0,
    activeAccounts: 0,
    draftEntries: 0,
    postedEntries: 0,
  });

  const [recentEntries, setRecentEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [accountsData, entriesData] = await Promise.all([
        accountingApi.accounts.getAll(),
        accountingApi.journalEntries.getAll({ limit: 5 }),
      ]);

      // Calculate stats
      const totalAccounts = accountsData.accounts.length;
      const activeAccounts = accountsData.accounts.filter(a => a.status === 'Active').length;
      const draftEntries = entriesData.journalEntries.filter(e => e.status === 'Draft').length;
      const postedEntries = entriesData.journalEntries.filter(e => e.status === 'Posted').length;

      setStats({
        totalAccounts,
        activeAccounts,
        draftEntries,
        postedEntries,
      });

      setRecentEntries(entriesData.journalEntries.slice(0, 5));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigationCards = [
    {
      title: 'Chart of Accounts',
      description: 'Manage your account structure with hierarchical organization',
      icon: Layers,
      href: '/dashboard/accounting/chart-of-accounts',
      color: 'blue',
    },
    {
      title: 'Journal Entry',
      description: 'Create and manage journal entries with balanced debits and credits',
      icon: FileText,
      href: '/dashboard/accounting/journal-entry',
      color: 'green',
    },
    {
      title: 'General Ledger',
      description: 'View detailed transaction history for each account',
      icon: BookOpen,
      href: '/dashboard/accounting/general-ledger',
      color: 'purple',
    },
    {
      title: 'Expenses',
      description: 'Track and manage business expenses',
      icon: Receipt,
      href: '/dashboard/accounting/expenses',
      color: 'red',
    },
    {
      title: 'Income Statement',
      description: 'View profit and loss report for any period',
      icon: TrendingUp,
      href: '/dashboard/accounting/income-statement',
      color: 'amber',
    },
    {
      title: 'Balance Sheet',
      description: 'View assets, liabilities, and equity at any point in time',
      icon: Scale,
      href: '/dashboard/accounting/balance-sheet',
      color: 'indigo',
    },
  ];

  const reportCards = [
    {
      title: 'Sales by Warehouse',
      description: 'Track sales performance by warehouse location',
      icon: Warehouse,
      href: '/dashboard/accounting/reports/sales-by-warehouse',
      color: 'blue',
    },
    {
      title: 'Sales by Person',
      description: 'Commission report showing sales by sales person and channel',
      icon: Users,
      href: '/dashboard/accounting/reports/sales-by-person',
      color: 'green',
    },
  ];

  const colorClasses = {
    blue: 'bg-muted/50 hover:bg-muted border-border hover:border-primary/50',
    green: 'bg-muted/50 hover:bg-muted border-border hover:border-primary/50',
    purple: 'bg-muted/50 hover:bg-muted border-border hover:border-primary/50',
    red: 'bg-muted/50 hover:bg-muted border-border hover:border-primary/50',
    amber: 'bg-muted/50 hover:bg-muted border-border hover:border-primary/50',
    indigo: 'bg-muted/50 hover:bg-muted border-border hover:border-primary/50',
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Accounting</h1>
        <p className="text-muted-foreground mt-1">
          Manage your financial records with double-entry bookkeeping
        </p>
      </div>

      {/* Quick Stats */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card rounded-lg shadow-sm border border-border p-6 animate-pulse">
              <div className="h-4 bg-muted rounded w-24 mb-2"></div>
              <div className="h-8 bg-muted rounded w-16"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Accounts</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.totalAccounts}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <Layers className="h-6 w-6 text-primary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats.activeAccounts} active
            </p>
          </div>

          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Posted Entries</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.postedEntries}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <FileText className="h-6 w-6 text-primary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Finalized transactions
            </p>
          </div>

          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Draft Entries</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.draftEntries}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <Clock className="h-6 w-6 text-primary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Pending review
            </p>
          </div>

          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Entries</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  {stats.postedEntries + stats.draftEntries}
                </p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              All transactions
            </p>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-card rounded-lg shadow-sm border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Link
            to="/dashboard/accounting/journal-entry"
            className="flex items-center gap-3 p-4 border-2 border-dashed border-border rounded-lg hover:border-primary hover:bg-muted/50 transition-colors group"
          >
            <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
              <PlusCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-medium text-foreground">New Journal Entry</div>
              <div className="text-xs text-muted-foreground">Create a new transaction</div>
            </div>
          </Link>

          <Link
            to="/dashboard/accounting/chart-of-accounts"
            className="flex items-center gap-3 p-4 border-2 border-dashed border-border rounded-lg hover:border-primary hover:bg-muted/50 transition-colors group"
          >
            <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-medium text-foreground">Manage Accounts</div>
              <div className="text-xs text-muted-foreground">View chart of accounts</div>
            </div>
          </Link>

          <Link
            to="/dashboard/accounting/income-statement"
            className="flex items-center gap-3 p-4 border-2 border-dashed border-border rounded-lg hover:border-primary hover:bg-muted/50 transition-colors group"
          >
            <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-medium text-foreground">View Reports</div>
              <div className="text-xs text-muted-foreground">Financial statements</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Navigation Cards */}
      <div className="bg-card rounded-lg shadow-sm border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Accounting Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {navigationCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                to={card.href}
                className={`p-5 border-2 rounded-lg transition-all ${
                  colorClasses[card.color as keyof typeof colorClasses]
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-card rounded-lg shadow-sm">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">{card.title}</h3>
                    <p className="text-sm text-muted-foreground">{card.description}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Sales Reports */}
      <div className="bg-card rounded-lg shadow-sm border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Sales Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reportCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                to={card.href}
                className={`p-5 border-2 rounded-lg transition-all ${
                  colorClasses[card.color as keyof typeof colorClasses]
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-card rounded-lg shadow-sm">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">{card.title}</h3>
                    <p className="text-sm text-muted-foreground">{card.description}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Journal Entries */}
      <div className="bg-card rounded-lg shadow-sm border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Recent Journal Entries</h2>
          <Link
            to="/dashboard/accounting/journal-entry"
            className="text-sm text-primary hover:text-primary/80"
          >
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse flex gap-4 p-4 border border-border rounded">
                <div className="h-4 bg-muted rounded w-24"></div>
                <div className="h-4 bg-muted rounded flex-1"></div>
                <div className="h-4 bg-muted rounded w-16"></div>
              </div>
            ))}
          </div>
        ) : recentEntries.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto text-muted mb-3" />
            <p>No journal entries yet</p>
            <Link
              to="/dashboard/accounting/journal-entry"
              className="text-primary hover:text-primary/80 text-sm mt-2 inline-block"
            >
              Create your first entry
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-4 p-4 border border-border rounded hover:bg-muted/50 transition-colors"
              >
                <div className="flex-shrink-0">
                  <span className="font-mono text-sm font-medium text-foreground">
                    {entry.entryNumber}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {entry.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.entryDate).toLocaleDateString()} • {entry.entryType}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      entry.status === 'Posted'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : entry.status === 'Draft'
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}
                  >
                    {entry.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
