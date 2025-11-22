import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle, CheckCircle2, Save } from 'lucide-react';
import { accountingApi, type ChartOfAccount, type JournalLine, type JournalEntry } from '@/lib/api';

export const Route = createFileRoute('/dashboard/accounting/journal-entry')({
  component: JournalEntryPage,
});

interface JournalLineForm extends JournalLine {
  tempId: string; // Temporary ID for React keys
}

function JournalEntryPage() {
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [entryType, setEntryType] = useState<'Manual' | 'System' | 'Recurring' | 'Adjusting' | 'Closing'>('Manual');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<JournalLineForm[]>([
    { tempId: crypto.randomUUID(), accountId: '', direction: 'Debit', amount: 0 },
    { tempId: crypto.randomUUID(), accountId: '', direction: 'Credit', amount: 0 },
  ]);

  // Calculated values
  const totalDebits = lines
    .filter(l => l.direction === 'Debit')
    .reduce((sum, l) => sum + (l.amount || 0), 0);

  const totalCredits = lines
    .filter(l => l.direction === 'Credit')
    .reduce((sum, l) => sum + (l.amount || 0), 0);

  const difference = totalDebits - totalCredits;
  const isBalanced = Math.abs(difference) < 0.01 && totalDebits > 0;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [accountsData, entriesData] = await Promise.all([
        accountingApi.accounts.getActive(),
        accountingApi.journalEntries.getAll({ limit: 50 }),
      ]);

      setAccounts(accountsData.accounts.filter(a => a.isDetailAccount)); // Only detail accounts
      setJournalEntries(entriesData.journalEntries);
    } catch (error) {
      console.error('Failed to load data:', error);
      alert('Failed to load accounts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addLine = () => {
    setLines([
      ...lines,
      { tempId: crypto.randomUUID(), accountId: '', direction: 'Debit', amount: 0 },
    ]);
  };

  const removeLine = (tempId: string) => {
    if (lines.length > 2) {
      setLines(lines.filter(l => l.tempId !== tempId));
    }
  };

  const updateLine = (tempId: string, field: keyof JournalLineForm, value: any) => {
    setLines(lines.map(l => l.tempId === tempId ? { ...l, [field]: value } : l));
  };

  const handleSave = async (status: 'Draft' | 'Posted') => {
    // Validation
    if (!description.trim()) {
      alert('Please enter a description');
      return;
    }

    if (lines.some(l => !l.accountId)) {
      alert('Please select an account for all lines');
      return;
    }

    if (!isBalanced) {
      alert('Journal entry is not balanced. Debits must equal credits.');
      return;
    }

    try {
      // Remove tempId and prepare data
      const journalLines: JournalLine[] = lines.map(({ tempId, ...line }) => line);

      const data = {
        entryDate,
        description,
        reference: reference || undefined,
        entryType,
        status,
        lines: journalLines,
        notes: notes || undefined,
        createdBy: 'admin', // TODO: Get from auth context
      };

      const result = await accountingApi.journalEntries.create(data);

      alert(`Journal entry ${result.journalEntry.entryNumber} created successfully!`);

      // Reset form
      setDescription('');
      setReference('');
      setNotes('');
      setLines([
        { tempId: crypto.randomUUID(), accountId: '', direction: 'Debit', amount: 0 },
        { tempId: crypto.randomUUID(), accountId: '', direction: 'Credit', amount: 0 },
      ]);

      // Reload entries
      loadData();
    } catch (error: any) {
      console.error('Failed to create journal entry:', error);
      alert(`Failed to create journal entry: ${error.message}`);
    }
  };

  const handlePost = async (id: string) => {
    if (!confirm('Are you sure you want to post this entry? Posted entries cannot be edited.')) {
      return;
    }

    try {
      await accountingApi.journalEntries.post(id, 'admin');
      alert('Journal entry posted successfully!');
      loadData();
    } catch (error: any) {
      console.error('Failed to post entry:', error);
      alert(`Failed to post entry: ${error.message}`);
    }
  };

  const handleVoid = async (id: string) => {
    const reason = prompt('Enter reason for voiding this entry:');
    if (!reason) return;

    try {
      await accountingApi.journalEntries.void(id, 'admin', reason);
      alert('Journal entry voided successfully!');
      loadData();
    } catch (error: any) {
      console.error('Failed to void entry:', error);
      alert(`Failed to void entry: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Journal Entry</h1>
      </div>

      {/* Journal Entry Form */}
      <div className="bg-gradient-to-br from-white to-gray-50/50 rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">New Journal Entry</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Entry Date *
            </label>
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Entry Type
            </label>
            <select
              value={entryType}
              onChange={(e) => setEntryType(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Manual">Manual</option>
              <option value="System">System</option>
              <option value="Recurring">Recurring</option>
              <option value="Adjusting">Adjusting</option>
              <option value="Closing">Closing</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reference
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Invoice #, PO #, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description *
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the transaction"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Journal Lines */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-md font-semibold">Journal Lines</h3>
            <button
              onClick={addLine}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
            >
              <Plus className="h-4 w-4" />
              Add Line
            </button>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    Type
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                    Debit
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                    Credit
                  </th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {lines.map((line) => {
                  const account = accounts.find(a => a.id === line.accountId);
                  return (
                    <tr key={line.tempId}>
                      <td className="px-4 py-3">
                        <select
                          value={line.accountId}
                          onChange={(e) => updateLine(line.tempId, 'accountId', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select account...</option>
                          {accounts.map(acc => (
                            <option key={acc.id} value={acc.id}>
                              {acc.code} - {acc.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={line.direction}
                          onChange={(e) => updateLine(line.tempId, 'direction', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="Debit">Debit</option>
                          <option value="Credit">Credit</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {line.direction === 'Debit' ? (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.amount || ''}
                            onChange={(e) => updateLine(line.tempId, 'amount', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {line.direction === 'Credit' ? (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.amount || ''}
                            onChange={(e) => updateLine(line.tempId, 'amount', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => removeLine(line.tempId)}
                          disabled={lines.length <= 2}
                          className="text-red-600 hover:text-red-800 disabled:text-gray-300 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                <tr>
                  <td colSpan={2} className="px-4 py-3 text-right font-semibold">
                    Totals:
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    ${totalDebits.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    ${totalCredits.toFixed(2)}
                  </td>
                  <td></td>
                </tr>
                <tr>
                  <td colSpan={2} className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {isBalanced ? (
                        <>
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          <span className="text-green-700 font-medium">Balanced</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-5 w-5 text-amber-600" />
                          <span className="text-amber-700 font-medium">
                            Difference: ${Math.abs(difference).toFixed(2)}
                          </span>
                        </>
                      )}
                    </div>
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Notes */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Additional notes or explanation..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => handleSave('Draft')}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <Save className="h-4 w-4" />
            Save as Draft
          </button>
          <button
            onClick={() => handleSave('Posted')}
            disabled={!isBalanced}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="h-4 w-4" />
            Post Entry
          </button>
        </div>
      </div>

      {/* Recent Journal Entries */}
      <div className="bg-gradient-to-br from-white to-gray-50/50 rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Journal Entries</h2>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entry Number
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {journalEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No journal entries yet. Create your first entry above.
                  </td>
                </tr>
              ) : (
                journalEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {entry.entryNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(entry.entryDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {entry.description}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {entry.entryType}
                    </td>
                    <td className="px-4 py-3">
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
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {entry.status === 'Draft' && (
                        <button
                          onClick={() => handlePost(entry.id)}
                          className="text-blue-600 hover:text-blue-800 mr-3"
                        >
                          Post
                        </button>
                      )}
                      {entry.status === 'Posted' && (
                        <button
                          onClick={() => handleVoid(entry.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Void
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
