'use client';

import React, { useState, useCallback } from 'react';
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
  // Manejo de Login (recibe datos de la API /auth/login)
  // ============================================================

  const handleLogin = useCallback((user: UserState) => {
    setCurrentUser(user);

    if (user.rol === 'admin') {
      setCurrentView('admin');
    } else {
      setCurrentView('editor');
    }
  }, []);

  // ============================================================
  // Manejo de Logout
  // ============================================================

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    setCurrentView('login');
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
