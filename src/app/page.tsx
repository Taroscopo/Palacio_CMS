'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { LoginScreen } from '@/components/LoginScreen';
import { AdminDashboard } from '@/components/AdminDashboard';
import { VisualEditor } from '@/components/VisualEditor';

// ============================================================
// Tipos globales de la aplicación
// ============================================================

type AppView = 'login' | 'admin' | 'editor';

interface UserState {
  id: string;
  email: string;
  nombre: string;
  rol: 'admin' | 'cliente';
  estadoSuscripcion: 'gratis' | 'anual';
  cambiosEsteMes: number;
  sustratoNombre: string;
  sustratoId: string;
}

// ============================================================
// Componente Orquestador Principal — Palacio CMS
// ============================================================

export default function Home() {
  const [currentView, setCurrentView] = useState<AppView>('login');
  const [currentUser, setCurrentUser] = useState<UserState | null>(null);

  // ============================================================
  // Cargar sesión guardada desde localStorage al montar el componente
  // ============================================================
  useEffect(() => {
    const savedUser = localStorage.getItem('palacio_user');
    const savedView = localStorage.getItem('palacio_view');
    if (savedUser && savedView) {
      try {
        setCurrentUser(JSON.parse(savedUser));
        setCurrentView(savedView as AppView);
      } catch (error) {
        console.error('[Session Storage] Error cargando sesión previa:', error);
      }
    }
  }, []);

  // ============================================================
  // Manejo de Login (recibe datos de la API /auth/login)
  // ============================================================

  const handleLogin = useCallback((user: UserState) => {
    setCurrentUser(user);

    const nextView = user.rol === 'admin' ? 'admin' : 'editor';
    setCurrentView(nextView);

    // Persistir sesión en el navegador
    localStorage.setItem('palacio_user', JSON.stringify(user));
    localStorage.setItem('palacio_view', nextView);
  }, []);

  // ============================================================
  // Manejo de Logout
  // ============================================================

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    setCurrentView('login');

    // Limpiar sesión en el navegador
    localStorage.removeItem('palacio_user');
    localStorage.removeItem('palacio_view');
  }, []);

  // ============================================================
  // Render condicional según la vista
  // ============================================================

  if (currentView === 'login' || !currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (currentView === 'admin' && currentUser.rol === 'admin') {
    return <AdminDashboard onLogout={handleLogout} />;
  }

  if (currentView === 'editor' && currentUser.rol === 'cliente') {
    return (
      <VisualEditor
        email={currentUser.email}
        nombre={currentUser.nombre}
        estadoSuscripcion={currentUser.estadoSuscripcion}
        cambiosEsteMes={currentUser.cambiosEsteMes}
        sustratoNombre={currentUser.sustratoNombre}
        sustratoId={currentUser.sustratoId}
        onLogout={handleLogout}
      />
    );
  }

  // Fallback: si el estado es inconsistente, regresar al login
  return <LoginScreen onLogin={handleLogin} />;
}
