import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, serverTimestamp, Timestamp, runTransaction, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CalendarIcon, WalletIcon, FunnelIcon } from '@heroicons/react/24/outline';
import type { Transaction, DateRange, Wallet } from '../types';

export default function Movements() {
  const user = useAuthStore((state) => state.user);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date()
  });
  const [transactionType, setTransactionType] = useState<'all' | 'income' | 'expense'>('all');
  const [counterpartyFilter, setCounterpartyFilter] = useState('');
  const [selectedWallet, setSelectedWallet] = useState<string>('all');
  const [showNewTransactionForm, setShowNewTransactionForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New transaction form state
  const [newTransaction, setNewTransaction] = useState({
    type: 'expense' as 'income' | 'expense',
    amount: '',
    counterparty: '',
    date: new Date().toISOString().split('T')[0],
    walletId: ''
  });

  useEffect(() => {
    if (!user) return;

    // Fetch wallets
    const walletsQuery = query(
      collection(db, 'wallets'),
      where('userId', '==', user.id)
    );

    const unsubscribeWallets = onSnapshot(walletsQuery, (snapshot) => {
      const updatedWallets = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate(),
      })) as Wallet[];
      setWallets(updatedWallets);

      if (!newTransaction.walletId && updatedWallets.length > 0) {
        setNewTransaction(prev => ({ ...prev, walletId: updatedWallets[0].id }));
      }
    });

    // Fetch transactions with proper indexing
    const transactionsQuery = query(
      collection(db, 'transactions'),
      where('userId', '==', user.id),
      orderBy('date', 'desc')
    );

    const unsubscribeTransactions = onSnapshot(transactionsQuery, 
      (snapshot) => {
        const updatedTransactions = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date.toDate(),
          createdAt: doc.data().createdAt.toDate(),
        })) as Transaction[];
        setTransactions(updatedTransactions);
        setError(null);
      },
      (err) => {
        console.error('Error fetching transactions:', err);
        setError('Error loading transactions. Please try again later.');
      }
    );

    return () => {
      unsubscribeWallets();
      unsubscribeTransactions();
    };
  }, [user]);

  useEffect(() => {
    let filtered = [...transactions];

    filtered = filtered.filter(
      (t) => t.date >= dateRange.startDate && t.date <= dateRange.endDate
    );

    if (transactionType !== 'all') {
      filtered = filtered.filter((t) => t.type === transactionType);
    }

    if (selectedWallet !== 'all') {
      filtered = filtered.filter((t) => t.walletId === selectedWallet);
    }

    if (counterpartyFilter) {
      filtered = filtered.filter((t) =>
        t.counterparty.toLowerCase().includes(counterpartyFilter.toLowerCase())
      );
    }

    setFilteredTransactions(filtered);
  }, [transactions, dateRange, transactionType, selectedWallet, counterpartyFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTransaction.walletId || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const amount = parseFloat(newTransaction.amount);
      const walletRef = doc(db, 'wallets', newTransaction.walletId);

      await runTransaction(db, async (transaction) => {
        const walletDoc = await transaction.get(walletRef);
        if (!walletDoc.exists()) {
          throw new Error('Wallet does not exist!');
        }

        const walletData = walletDoc.data();
        const newBalance = newTransaction.type === 'income' 
          ? walletData.balance + amount
          : walletData.balance - amount;

        // Update wallet balance
        transaction.update(walletRef, { 
          balance: newBalance,
          updatedAt: serverTimestamp()
        });

        // Create new transaction
        const transactionRef = collection(db, 'transactions');
        transaction.set(doc(transactionRef), {
          userId: user.id,
          walletId: newTransaction.walletId,
          type: newTransaction.type,
          amount: amount,
          counterparty: newTransaction.counterparty,
          date: Timestamp.fromDate(new Date(newTransaction.date)),
          createdAt: serverTimestamp(),
        });
      });

      // Reset form
      setNewTransaction({
        type: 'expense',
        amount: '',
        counterparty: '',
        date: new Date().toISOString().split('T')[0],
        walletId: wallets[0]?.id || ''
      });
      setShowNewTransactionForm(false);
    } catch (error) {
      console.error('Error adding transaction:', error);
      setError('Failed to add transaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getChartData = () => {
    const data: any[] = [];
    const grouped = filteredTransactions.reduce((acc, curr) => {
      const date = curr.date.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { income: 0, expense: 0 };
      }
      if (curr.type === 'income') {
        acc[date].income += curr.amount;
      } else {
        acc[date].expense += curr.amount;
      }
      return acc;
    }, {} as Record<string, { income: number; expense: number }>);

    Object.entries(grouped).forEach(([date, values]) => {
      data.push({
        date,
        income: values.income,
        expense: values.expense
      });
    });

    return data.sort((a, b) => a.date.localeCompare(b.date));
  };

  const getWalletName = (walletId: string) => {
    const wallet = wallets.find(w => w.id === walletId);
    return wallet ? wallet.name : 'Unknown Wallet';
  };

  if (error) {
    return (
      <div className="section-container">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
          <p className="text-sm text-red-600 mt-2">
            If this error persists, please create the required index by clicking this link:{' '}
            <a 
              href="https://console.firebase.google.com/v1/r/project/mny-app-256af/firestore/indexes?create_composite=ClJwcm9qZWN0cy9tbnktYXBwLTI1NmFmL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy90cmFuc2FjdGlvbnMvaW5kZXhlcy9fEAEaCgoGdXNlcklkEAEaCAoEZGF0ZRACGgwKCF9fbmFtZV9fEAI"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 underline"
            >
              Create Index
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="section-container pb-24 lg:pb-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Movements</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-primary flex items-center gap-2"
          >
            <FunnelIcon className="w-5 h-5" />
            <span className="hidden lg:inline">Filters</span>
          </button>
          <button
            onClick={() => setShowNewTransactionForm(!showNewTransactionForm)}
            className="btn-primary"
          >
            + New
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="filter-grid">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dateRange.startDate.toISOString().split('T')[0]}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: new Date(e.target.value) }))}
                  className="input-field touch-target"
                />
                <input
                  type="date"
                  value={dateRange.endDate.toISOString().split('T')[0]}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: new Date(e.target.value) }))}
                  className="input-field touch-target"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value as 'all' | 'income' | 'expense')}
                className="input-field touch-target"
              >
                <option value="all">All</option>
                <option value="income">Income</option>
                <option value="expense">Expenses</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Wallet</label>
              <select
                value={selectedWallet}
                onChange={(e) => setSelectedWallet(e.target.value)}
                className="input-field touch-target"
              >
                <option value="all">All Wallets</option>
                {wallets.map((wallet) => (
                  <option key={wallet.id} value={wallet.id}>
                    {wallet.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                value={counterpartyFilter}
                onChange={(e) => setCounterpartyFilter(e.target.value)}
                placeholder="Search counterparty..."
                className="input-field touch-target"
              />
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <h2 className="text-xl font-semibold mb-4">Income vs Expenses</h2>
        <div className="h-64 lg:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={getChartData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="income" stroke="#2F7A4D" name="Income" />
              <Line type="monotone" dataKey="expense" stroke="#ef4444" name="Expense" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* New Transaction Form - Mobile Slide Up */}
      {showNewTransactionForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden">
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl p-4 pb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">New Transaction</h2>
              <button
                onClick={() => setShowNewTransactionForm(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={newTransaction.type}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, type: e.target.value as 'income' | 'expense' }))}
                  className="input-field touch-target"
                  disabled={isSubmitting}
                >
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Wallet</label>
                <select
                  value={newTransaction.walletId}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, walletId: e.target.value }))}
                  className="input-field touch-target"
                  required
                  disabled={isSubmitting}
                >
                  <option value="">Select a wallet</option>
                  {wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newTransaction.amount}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, amount: e.target.value }))}
                  className="input-field touch-target"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {newTransaction.type === 'income' ? 'From' : 'To'}
                </label>
                <input
                  type="text"
                  required
                  value={newTransaction.counterparty}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, counterparty: e.target.value }))}
                  className="input-field touch-target"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={newTransaction.date}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, date: e.target.value }))}
                  className="input-field touch-target"
                  disabled={isSubmitting}
                />
              </div>

              <button 
                type="submit" 
                className="btn-primary w-full touch-target"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Adding...' : 'Add Transaction'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Transactions List */}
      <div className="bg-white rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold p-4 border-b border-gray-200">Recent Transactions</h2>
        <div className="divide-y divide-gray-200">
          {filteredTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="p-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-base">{transaction.counterparty}</p>
                  <p className="text-sm text-gray-500 flex items-center mt-1">
                    <WalletIcon className="w-4 h-4 mr-1" />
                    {getWalletName(transaction.walletId)}
                  </p>
                  <p className="text-sm text-gray-500 flex items-center mt-1">
                    <CalendarIcon className="w-4 h-4 mr-1" />
                    {transaction.date.toLocaleDateString()}
                  </p>
                </div>
                <p className={`text-lg font-semibold ${
                  transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transaction.type === 'income' ? '+' : '-'}€{transaction.amount.toFixed(2)}
                </p>
              </div>
            </div>
          ))}

          {filteredTransactions.length === 0 && (
            <p className="text-center text-gray-500 py-8">No transactions found.</p>
          )}
        </div>
      </div>

      {/* Desktop New Transaction Form */}
      <div className="hidden lg:block bg-white rounded-lg shadow-sm p-6 mt-6">
        <h2 className="text-xl font-semibold mb-4">New Transaction</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={newTransaction.type}
              onChange={(e) => setNewTransaction(prev => ({ ...prev, type: e.target.value as 'income' | 'expense' }))}
              className="input-field"
              disabled={isSubmitting}
            >
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Wallet</label>
            <select
              value={newTransaction.walletId}
              onChange={(e) => setNewTransaction(prev => ({ ...prev, walletId: e.target.value }))}
              className="input-field"
              required
              disabled={isSubmitting}
            >
              <option value="">Select a wallet</option>
              {wallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
            <input
              type="number"
              step="0.01"
              required
              value={newTransaction.amount}
              onChange={(e) => setNewTransaction(prev => ({ ...prev, amount: e.target.value }))}
              className="input-field"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {newTransaction.type === 'income' ? 'From' : 'To'}
            </label>
            <input
              type="text"
              required
              value={newTransaction.counterparty}
              onChange={(e) => setNewTransaction(prev => ({ ...prev, counterparty: e.target.value }))}
              className="input-field"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              required
              value={newTransaction.date}
              onChange={(e) => setNewTransaction(prev => ({ ...prev, date: e.target.value }))}
              className="input-field"
              disabled={isSubmitting}
            />
          </div>

          <div className="col-span-2">
            <button 
              type="submit" 
              className="btn-primary w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}