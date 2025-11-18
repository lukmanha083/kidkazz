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

  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200',
    green: 'bg-green-50 text-green-600 hover:bg-green-100 border-green-200',
    purple: 'bg-purple-50 text-purple-600 hover:bg-purple-100 border-purple-200',
    amber: 'bg-amber-50 text-amber-600 hover:bg-amber-100 border-amber-200',
    indigo: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-indigo-200',
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Accounting</h1>
        <p className="text-gray-600 mt-1">
          Manage your financial records with double-entry bookkeeping
        </p>
      </div>

      {/* Quick Stats */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Accounts</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalAccounts}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Layers className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {stats.activeAccounts} active
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Posted Entries</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.postedEntries}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Finalized transactions
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Draft Entries</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.draftEntries}</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Pending review
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Entries</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {stats.postedEntries + stats.draftEntries}
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              All transactions
            </p>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Link
            to="/dashboard/accounting/journal-entry"
            className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group"
          >
            <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
              <PlusCircle className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">New Journal Entry</div>
              <div className="text-xs text-gray-500">Create a new transaction</div>
            </div>
          </Link>

          <Link
            to="/dashboard/accounting/chart-of-accounts"
            className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors group"
          >
            <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
              <Layers className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">Manage Accounts</div>
              <div className="text-xs text-gray-500">View chart of accounts</div>
            </div>
          </Link>

          <Link
            to="/dashboard/accounting/income-statement"
            className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors group"
          >
            <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
              <BarChart3 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">View Reports</div>
              <div className="text-xs text-gray-500">Financial statements</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Navigation Cards */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Accounting Modules</h2>
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
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{card.title}</h3>
                    <p className="text-sm text-gray-600">{card.description}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Journal Entries */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Journal Entries</h2>
          <Link
            to="/dashboard/accounting/journal-entry"
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse flex gap-4 p-4 border border-gray-200 rounded">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-4 bg-gray-200 rounded flex-1"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        ) : recentEntries.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p>No journal entries yet</p>
            <Link
              to="/dashboard/accounting/journal-entry"
              className="text-blue-600 hover:text-blue-800 text-sm mt-2 inline-block"
            >
              Create your first entry
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-4 p-4 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
              >
                <div className="flex-shrink-0">
                  <span className="font-mono text-sm font-medium text-gray-900">
                    {entry.entryNumber}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {entry.description}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(entry.entryDate).toLocaleDateString()} • {entry.entryType}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      entry.status === 'Posted'
                        ? 'bg-green-100 text-green-800'
                        : entry.status === 'Draft'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-red-100 text-red-800'
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
