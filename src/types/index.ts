export interface User {
  id: string;
  email: string;
}

export interface Wallet {
  id: string;
  userId: string;
  name: string;
  type: 'bank' | 'card' | 'app';
  balance: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  walletId: string;
  type: 'income' | 'expense';
  amount: number;
  counterparty: string;
  date: Date;
  createdAt: Date;
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
}

export interface Investment {
  id: string;
  userId: string;
  name: string;
  type: string;
  amount: number;
  currentValue: number;
  startDate: Date;
  lastUpdate: Date;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}