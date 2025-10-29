// src/App.tsx - VERSÃO CORRIGIDA E LIMPA

import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Catalog from './components/Catalog';
import Login from './components/admin/Login';
import AdminPanel from './components/admin/AdminPanel';
import { supabase } from './lib/supabase'; // Importe o supabase

// A função ProtectedAdminRoute não precisa de nenhuma alteração.
function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsChecking(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isChecking) {
    return <div>Carregando...</div>;
  }

  if (!session) {
    return <Login onLoginSuccess={() => {}} />;
  }

  return <>{children}</>;
}

// A função App foi limpa para remover toda a lógica de verificação de idade.
function App() {
  return (
    <BrowserRouter>
      {/* O modal de verificação de idade foi removido daqui. */}
      <Routes>
        <Route path="/" element={<Catalog />} />
        <Route
          path="/admin"
          element={
            <ProtectedAdminRoute>
              <AdminPanel onLogout={() => supabase.auth.signOut()} />
            </ProtectedAdminRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
