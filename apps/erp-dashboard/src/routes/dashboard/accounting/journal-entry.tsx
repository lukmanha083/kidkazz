import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle, CheckCircle2, Save } from 'lucide-react';
import { accountingApi, type ChartOfAccount, type JournalLine, type JournalEntry } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

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
        <h1 className="text-3xl font-bold tracking-tight">Journal Entry</h1>
      </div>

      {/* Journal Entry Form */}
      <Card className="bg-gradient-to-br from-white to-gray-50/50">
        <CardHeader>
          <CardTitle>New Journal Entry</CardTitle>
          <CardDescription>Create a new journal entry for your accounting records</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entryDate">Entry Date *</Label>
              <Input
                id="entryDate"
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="entryType">Entry Type</Label>
              <select
                id="entryType"
                value={entryType}
                onChange={(e) => setEntryType(e.target.value as any)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="Manual">Manual</option>
                <option value="System">System</option>
                <option value="Recurring">Recurring</option>
                <option value="Adjusting">Adjusting</option>
                <option value="Closing">Closing</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">Reference</Label>
              <Input
                id="reference"
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Invoice #, PO #, etc."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the transaction"
            />
          </div>

          {/* Journal Lines */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base">Journal Lines</Label>
              <Button onClick={addLine} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Line
              </Button>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead className="w-32">Type</TableHead>
                    <TableHead className="text-right w-40">Debit</TableHead>
                    <TableHead className="text-right w-40">Credit</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => {
                    const account = accounts.find(a => a.id === line.accountId);
                    return (
                      <TableRow key={line.tempId}>
                        <TableCell>
                          <select
                            value={line.accountId}
                            onChange={(e) => updateLine(line.tempId, 'accountId', e.target.value)}
                            className="w-full px-2 py-1.5 border border-input rounded text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            <option value="">Select account...</option>
                            {accounts.map(acc => (
                              <option key={acc.id} value={acc.id}>
                                {acc.code} - {acc.name}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell>
                          <select
                            value={line.direction}
                            onChange={(e) => updateLine(line.tempId, 'direction', e.target.value)}
                            className="w-full px-2 py-1.5 border border-input rounded text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            <option value="Debit">Debit</option>
                            <option value="Credit">Credit</option>
                          </select>
                        </TableCell>
                        <TableCell className="text-right">
                          {line.direction === 'Debit' ? (
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={line.amount || ''}
                              onChange={(e) => updateLine(line.tempId, 'amount', parseFloat(e.target.value) || 0)}
                              className="text-right h-8"
                            />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {line.direction === 'Credit' ? (
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={line.amount || ''}
                              onChange={(e) => updateLine(line.tempId, 'amount', parseFloat(e.target.value) || 0)}
                              className="text-right h-8"
                            />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLine(line.tempId)}
                            disabled={lines.length <= 2}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={2} className="text-right font-semibold">
                      Totals:
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ${totalDebits.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ${totalCredits.toFixed(2)}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={2} className="text-right">
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
                    </TableCell>
                    <TableCell colSpan={3}></TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Additional notes or explanation..."
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => handleSave('Draft')}>
              <Save className="h-4 w-4 mr-2" />
              Save as Draft
            </Button>
            <Button onClick={() => handleSave('Posted')} disabled={!isBalanced}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Post Entry
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Journal Entries */}
      <Card className="bg-gradient-to-br from-white to-gray-50/50">
        <CardHeader>
          <CardTitle>Recent Journal Entries</CardTitle>
          <CardDescription>View and manage your recent journal entries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entry Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {journalEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No journal entries yet. Create your first entry above.
                    </TableCell>
                  </TableRow>
                ) : (
                  journalEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {entry.entryNumber}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(entry.entryDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {entry.description}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {entry.entryType}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            entry.status === 'Posted'
                              ? 'default'
                              : entry.status === 'Draft'
                              ? 'secondary'
                              : 'destructive'
                          }
                          className={
                            entry.status === 'Posted'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500'
                              : ''
                          }
                        >
                          {entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.status === 'Draft' && (
                          <Button
                            variant="link"
                            onClick={() => handlePost(entry.id)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Post
                          </Button>
                        )}
                        {entry.status === 'Posted' && (
                          <Button
                            variant="link"
                            onClick={() => handleVoid(entry.id)}
                            className="text-destructive hover:text-destructive/90"
                          >
                            Void
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
