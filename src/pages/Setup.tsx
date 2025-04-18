import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';

export default function Setup() {
  const user = useAuthStore((state) => state.user);
  const [name, setName] = useState('');
  const [type, setType] = useState<'bank' | 'card' | 'app'>('bank');
  const [balance, setBalance] = useState('');
  const [currency, setCurrency] = useState('EUR');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await addDoc(collection(db, 'wallets'), {
        userId: user.id,
        name,
        type,
        balance: parseFloat(balance),
        currency,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Reset form
      setName('');
      setType('bank');
      setBalance('');
      setCurrency('EUR');
    } catch (error) {
      console.error('Error adding wallet:', error);
    }
  };

  return (
    <div className="section-container">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Setup</h1>

      <div className="max-w-md">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Wallet Name
            </label>
            <input
              type="text"
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700">
              Type
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as 'bank' | 'card' | 'app')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="bank">Bank Account</option>
              <option value="card">Card</option>
              <option value="app">App</option>
            </select>
          </div>

          <div>
            <label htmlFor="balance" className="block text-sm font-medium text-gray-700">
              Current Balance
            </label>
            <input
              type="number"
              id="balance"
              required
              step="0.01"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>

          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700">
              Currency
            </label>
            <select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Add Wallet
          </button>
        </form>
      </div>
    </div>
  );
}