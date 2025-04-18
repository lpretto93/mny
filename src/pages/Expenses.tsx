import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CalendarIcon, MapPinIcon } from '@heroicons/react/24/outline';
import type { Transaction, DateRange } from '../types';

export default function Expenses() {
  const user = useAuthStore((state) => state.user);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date()
  });
  const [transactionType, setTransactionType] = useState<'all' | 'income' | 'expense'>('all');
  const [counterpartyFilter, setCounterpartyFilter] = useState('');

  // New transaction form state
  const [newTransaction, setNewTransaction] = useState({
    type: 'expense' as 'income' | 'expense',
    amount: '',
    counterparty: '',
    date: new Date().toISOString().split('T')[0],
    location: {
      lat: 0,
      lng: 0,
      address: ''
    }
  });

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', user.id),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const updatedTransactions = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate(),
        createdAt: doc.data().createdAt.toDate(),
      })) as Transaction[];
      setTransactions(updatedTransactions);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    let filtered = [...transactions];

    // Date range filter
    filtered = filtered.filter(
      (t) => t.date >= dateRange.startDate && t.date <= dateRange.endDate
    );

    // Transaction type filter
    if (transactionType !== 'all') {
      filtered = filtered.filter((t) => t.type === transactionType);
    }

    // Counterparty filter
    if (counterpartyFilter) {
      filtered = filtered.filter((t) =>
        t.counterparty.toLowerCase().includes(counterpartyFilter.toLowerCase())
      );
    }

    setFilteredTransactions(filtered);
  }, [transactions, dateRange, transactionType, counterpartyFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await addDoc(collection(db, 'transactions'), {
        userId: user.id,
        type: newTransaction.type,
        amount: parseFloat(newTransaction.amount),
        counterparty: newTransaction.counterparty,
        date: Timestamp.fromDate(new Date(newTransaction.date)),
        location: newTransaction.location,
        createdAt: serverTimestamp(),
      });

      // Reset form
      setNewTransaction({
        type: 'expense',
        amount: '',
        counterparty: '',
        date: new Date().toISOString().split('T')[0],
        location: {
          lat: 0,
          lng: 0,
          address: ''
        }
      });
    } catch (error) {
      console.error('Error adding transaction:', error);
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Expenses</h1>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={dateRange.startDate.toISOString().split('T')[0]}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: new Date(e.target.value) }))}
                className="input-field"
              />
              <input
                type="date"
                value={dateRange.endDate.toISOString().split('T')[0]}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: new Date(e.target.value) }))}
                className="input-field"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value as 'all' | 'income' | 'expense')}
              className="input-field"
            >
              <option value="all">All</option>
              <option value="income">Income</option>
              <option value="expense">Expenses</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Counterparty</label>
            <input
              type="text"
              value={counterpartyFilter}
              onChange={(e) => setCounterpartyFilter(e.target.value)}
              placeholder="Search..."
              className="input-field"
            />
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-8">
        <h2 className="text-xl font-semibold mb-4">Income vs Expenses</h2>
        <div className="h-80">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* New Transaction Form */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">New Transaction</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={newTransaction.type}
                onChange={(e) => setNewTransaction(prev => ({ ...prev, type: e.target.value as 'income' | 'expense' }))}
                className="input-field"
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
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
              />
            </div>

            <button type="submit" className="btn-primary w-full">
              Add Transaction
            </button>
          </form>
        </div>

        {/* Transactions List */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
          <div className="space-y-4">
            {filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="border-b border-gray-200 last:border-0 pb-4 last:pb-0"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">{transaction.counterparty}</p>
                    <p className="text-sm text-gray-500 flex items-center">
                      <CalendarIcon className="w-4 h-4 mr-1" />
                      {transaction.date.toLocaleDateString()}
                    </p>
                    {transaction.location?.address && (
                      <p className="text-sm text-gray-500 flex items-center">
                        <MapPinIcon className="w-4 h-4 mr-1" />
                        {transaction.location.address}
                      </p>
                    )}
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
              <p className="text-center text-gray-500 py-4">No transactions found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}