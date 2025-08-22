'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ViewProfile } from '@/components/ViewProfile';

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ViewProfile />
    </ProtectedRoute>
  );
}
