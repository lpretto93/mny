import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import type { Wallet } from '../types';

export default function Dashboard() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'wallets'),
      where('userId', '==', user.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const updatedWallets = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate(),
      })) as Wallet[];
      setWallets(updatedWallets);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <div className="section-container">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Wallets</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {wallets.map((wallet) => (
          <div
            key={wallet.id}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">{wallet.name}</h2>
              <span className="px-3 py-1 rounded-full text-sm capitalize bg-primary-100 text-primary-800">
                {wallet.type}
              </span>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-500">Current Balance</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Intl.NumberFormat('it-IT', {
                  style: 'currency',
                  currency: wallet.currency,
                }).format(wallet.balance)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {wallets.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No wallets found. Add one in the Setup page.</p>
        </div>
      )}
    </div>
  );
}