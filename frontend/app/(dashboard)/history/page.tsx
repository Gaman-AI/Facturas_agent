import React from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { TicketHistory } from '@/components/TicketHistory';
import { ProfileDropdown } from '@/components/ProfileDropdown';

export default function HistoryPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">Facturas Agent</h1>
              </div>
              <div className="flex items-center space-x-4">
                <ProfileDropdown />
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <TicketHistory />
        </main>
      </div>
    </ProtectedRoute>
  );
}
