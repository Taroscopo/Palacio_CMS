'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, User, Crown, Eye, EyeOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================
// Tipos
// ============================================================

interface LoginScreenProps {
  onLogin: (user: {
    id: string;
    email: string;
    nombre: string;
    rol: 'admin' | 'cliente';
    estadoSuscripcion: 'gratis' | 'anual';
    cambiosEsteMes: number;
    sustratoNombre: string;
    sustratoId: string;
  }) => void;
}

interface DemoAccount {
  role: 'admin' | 'cliente';
  label: string;
  email: string;
  password: string;
  description: string;
  icon: typeof Crown;
}

// ============================================================
// Cuentas de demostración
// ============================================================

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: 'admin',
    label: 'Administrador Maestro',
    email: 'admin@palacio.cms',
    password: 'admin123',
    description: 'Acceso completo al panel de control',
    icon: Crown,
  },
  {
    role: 'cliente',
    label: 'Cliente Demo (Gratis)',
    email: 'cliente@demo.com',
    password: 'demo123',
    description: 'Plan gratuito — 3 cambios/mes',
    icon: User,
  },
  {
    role: 'cliente',
    label: 'Cliente Premium (Anual)',
    email: 'premium@demo.com',
    password: 'premium123',
    description: 'Plan anual — Cambios ilimitados',
    icon: Shield,
  },
];

// ============================================================
// Componente
// ============================================================

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDemoLogin = (index: number) => {
    setSelectedAccount(index);
    setEmail(DEMO_ACCOUNTS[index].email);
    setPassword(DEMO_ACCOUNTS[index].password);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Por favor, introduce email y contraseña');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success && data.user) {
        onLogin(data.user);
      } else {
        setError(data.error || 'Credenciales inválidas.');
      }
    } catch {
      setError('Error de conexión con el servidor. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="palacio-bg flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo y título */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#0e7490] mb-5">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#111111]">
            Palacio CMS
          </h1>
          <p className="text-sm text-[#86868b] mt-1.5">
            Gestión de Landing Pages
          </p>
        </div>

        {/* Formulario de login */}
        <div className="palacio-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-[#111111]">
                Correo electrónico
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#c7c7cc]" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  className="pl-10 input-apple h-11"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-[#111111]">
                Contraseña
              </Label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#c7c7cc]" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  className="pl-10 pr-10 input-apple h-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#86868b] hover:text-[#111111] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-[#dc2626] bg-red-50 border border-red-100 rounded-lg px-3 py-2 animate-fade-in">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className={cn(
                'w-full h-11 btn-apple font-medium rounded-lg',
                isLoading && 'opacity-70 cursor-not-allowed'
              )}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Iniciar Sesión'
              )}
            </Button>
          </form>
        </div>

        {/* Cuentas de demostración */}
        <div className="mt-6">
          <div className="relative flex items-center justify-center mb-4">
            <div className="divider w-full" />
            <span className="absolute bg-white px-3 text-[10px] text-[#86868b] uppercase tracking-widest font-medium">
              Acceso rápido
            </span>
          </div>

          <div className="space-y-2">
            {DEMO_ACCOUNTS.map((account, index) => {
              const Icon = account.icon;
              return (
                <button
                  key={index}
                  onClick={() => handleDemoLogin(index)}
                  className={cn(
                    'w-full palacio-card p-3.5 flex items-center gap-4 text-left transition-all duration-200 hover:shadow-md',
                    selectedAccount === index && 'ring-1 ring-[#0e7490]/40 shadow-md'
                  )}
                >
                  <div className={cn(
                    'flex items-center justify-center w-9 h-9 rounded-xl shrink-0',
                    account.role === 'admin' ? 'bg-[#111111]' : account.role === 'cliente' && account.label.includes('Premium') ? 'bg-[#0e7490]' : 'bg-[#86868b]'
                  )}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-[#111111] truncate">{account.label}</div>
                    <div className="text-xs text-[#86868b] truncate">{account.description}</div>
                  </div>
                  <div className="text-[11px] text-[#86868b] shrink-0 font-mono">
                    {account.email}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-[11px] text-[#c7c7cc]">
          Palacio CMS v1.0 — Gestión de Landing Pages
        </div>
      </div>
    </div>
  );
}
