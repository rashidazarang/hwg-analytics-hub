
import React from 'react';
import Dashboard from '@/components/layout/Dashboard';
import AuthNav from '@/components/navigation/AuthNav';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b py-2 px-4 flex items-center justify-between shadow-sm">
        <h1 className="text-xl font-bold">Dealer Management System</h1>
        <AuthNav />
      </header>
      <main>
        <Dashboard />
      </main>
    </div>
  );
};

export default Index;
