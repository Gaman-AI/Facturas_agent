'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { EditProfile } from '@/components/EditProfile';

export default function EditProfilePage() {
  return (
    <ProtectedRoute>
      <EditProfile />
    </ProtectedRoute>
  );
}
