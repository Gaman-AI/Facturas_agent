import { CFDITaskForm } from '@/components/CFDITaskForm';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function CFDITaskPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Automatización CFDI</h1>
            <p className="text-gray-600 mt-2">
              Automatice la solicitud de facturas CFDI en portales de proveedores de manera inteligente
            </p>
          </div>
          
          <CFDITaskForm />
        </div>
      </div>
    </ProtectedRoute>
  );
} 