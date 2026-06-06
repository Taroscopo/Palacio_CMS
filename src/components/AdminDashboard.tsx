'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Crown,
  Users,
  Activity,
  GitBranch,
  Plus,
  KeyRound,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  BarChart3,
  Shield,
  LogOut,
  Search,
  Loader2,
  Zap,
  UserPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================
// Tipos
// ============================================================

interface ClienteData {
  id: string;
  email: string;
  nombre: string;
  plan: string;
  repoOwner: string;
  repoName: string;
  repoBranch: string;
  totalCambios: number;
}

interface AdminDashboardProps {
  onLogout: () => void;
}

// ============================================================
// Logs de demostración
// ============================================================

const DEMO_LOGS = [
  { id: 'l1', usuario: 'Cliente Demo', sustrato: 'Landing Demo', tipo: 'Contenido', seccion: 'hero', campo: 'titulo', anterior: 'Bienvenido', nuevo: 'Bienvenido a Palacio', fecha: '15 ene, 10:30' },
  { id: 'l2', usuario: 'Cliente Demo', sustrato: 'Landing Demo', tipo: 'Contenido', seccion: 'hero', campo: 'subtitulo', anterior: 'CMS', nuevo: 'Gestión de Landing Pages', fecha: '15 ene, 10:35' },
  { id: 'l3', usuario: 'Cliente Premium', sustrato: 'Landing Premium', tipo: 'Contenido', seccion: 'hero', campo: 'titulo', anterior: 'Premium', nuevo: 'Experiencia Premium', fecha: '16 ene, 09:00' },
  { id: 'l4', usuario: 'Cliente Premium', sustrato: 'Landing Premium', tipo: 'Diseño', seccion: 'global', campo: 'color_primario', anterior: '#111111', nuevo: '#0e7490', fecha: '16 ene, 09:15' },
  { id: 'l5', usuario: 'María López', sustrato: 'Corp Site María', tipo: 'Sección', seccion: 'servicios', campo: 'visible', anterior: 'true', nuevo: 'false', fecha: '17 ene, 14:00' },
  { id: 'l6', usuario: 'María López', sustrato: 'Corp Site María', tipo: 'Banner', seccion: 'promo', campo: 'texto', anterior: '—', nuevo: '20% de descuento', fecha: '17 ene, 14:30' },
  { id: 'l7', usuario: 'Carlos Ramírez', sustrato: 'Startup Carlos', tipo: 'Contenido', seccion: 'contacto', campo: 'email', anterior: 'old@startup.io', nuevo: 'hello@startup.io', fecha: '18 ene, 11:00' },
  { id: 'l8', usuario: 'Carlos Ramírez', sustrato: 'Startup Carlos', tipo: 'Contenido', seccion: 'hero', campo: 'cta_texto', anterior: 'Empezar', nuevo: 'Comenzar Ahora', fecha: '18 ene, 11:05' },
];

// ============================================================
// Componente Principal
// ============================================================

export function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [clientes, setClientes] = useState<ClienteData[]>([]);
  const [isLoadingClientes, setIsLoadingClientes] = useState(true);
  const [activeTab, setActiveTab] = useState<'monitor' | 'cuentas' | 'logs'>('monitor');
  const [searchQuery, setSearchQuery] = useState('');

  // Estado para nuevo cliente
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newClientRepoOwner, setNewClientRepoOwner] = useState('');
  const [newClientRepoName, setNewClientRepoName] = useState('');
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);

  // Estado para restablecer contraseña
  const [resetEmail, setResetEmail] = useState('');
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Estado para confirmar cambio de suscripción
  const [subscriptionChange, setSubscriptionChange] = useState<{ sustratoId: string; newStatus: 'gratis' | 'anual' } | null>(null);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);

  // ============================================================
  // Carga de clientes desde la API (Supabase real o fallback demo)
  // ============================================================

  const fetchClientes = useCallback(async () => {
    setIsLoadingClientes(true);
    try {
      const response = await fetch('/api/admin/clientes');
      const data = await response.json();

      if (data.success && data.clientes) {
        setClientes(data.clientes);
      }
    } catch (error) {
      console.error('[AdminDashboard] Error cargando clientes:', error);
    } finally {
      setIsLoadingClientes(false);
    }
  }, []);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  // ============================================================
  // Funciones de negocio
  // ============================================================

  const handleCreateClient = async () => {
    if (!newClientEmail || !newClientName || !newClientRepoOwner || !newClientRepoName) return;
    setIsCreatingClient(true);
    await new Promise((resolve) => setTimeout(resolve, 600));

    const newCliente: ClienteData = {
      id: `local-${Date.now()}`,
      email: newClientEmail,
      nombre: newClientName,
      plan: 'gratis',
      repoOwner: newClientRepoOwner,
      repoName: newClientRepoName,
      repoBranch: 'main',
      totalCambios: 0,
    };

    setClientes((prev) => [...prev, newCliente]);
    setNewClientEmail('');
    setNewClientName('');
    setNewClientRepoOwner('');
    setNewClientRepoName('');
    setIsCreatingClient(false);
    setShowNewClientDialog(false);
  };

  const handleResetPassword = async () => {
    if (!resetEmail) return;
    setIsResetting(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsResetting(false);
    setResetEmail('');
    setShowResetDialog(false);
  };

  const handleToggleSubscription = (clienteId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'gratis' ? 'anual' : 'gratis';
    setSubscriptionChange({ sustratoId: clienteId, newStatus });
    setShowSubscriptionDialog(true);
  };

  const confirmSubscriptionChange = async () => {
    if (!subscriptionChange) return;

    // Llamar a la API para persistir el cambio
    try {
      await fetch('/api/admin/sustratos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sustratoId: subscriptionChange.sustratoId,
          estadoSuscripcion: subscriptionChange.newStatus,
        }),
      });
    } catch (error) {
      console.error('[AdminDashboard] Error cambiando suscripción:', error);
    }

    // Actualizar estado local
    setClientes((prev) =>
      prev.map((c) =>
        c.id === subscriptionChange.sustratoId
          ? { ...c, plan: subscriptionChange.newStatus }
          : c
      )
    );

    setShowSubscriptionDialog(false);
    setSubscriptionChange(null);
  };

  // Filtrado de búsqueda
  const filteredClients = clientes.filter((c) => {
    const query = searchQuery.toLowerCase();
    return (
      c.nombre.toLowerCase().includes(query) ||
      c.email.toLowerCase().includes(query) ||
      c.repoName.toLowerCase().includes(query) ||
      c.repoOwner.toLowerCase().includes(query)
    );
  });

  // Estadísticas generales
  const totalClientes = clientes.length;
  const clientesGratis = clientes.filter((c) => c.plan === 'gratis').length;
  const clientesAnual = clientes.filter((c) => c.plan === 'anual').length;
  const totalCambiosMes = clientes.reduce((t, c) => t + c.totalCambios, 0);

  const getTipoColor = (tipo: string) => {
    const colors: Record<string, string> = {
      Contenido: 'bg-blue-50 text-blue-700',
      Sección: 'bg-gray-100 text-gray-700',
      Diseño: 'bg-cyan-50 text-cyan-700',
      Banner: 'bg-amber-50 text-amber-700',
    };
    return colors[tipo] ?? 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="palacio-bg min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#e5e5ea]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#0e7490] flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-[#111111] tracking-tight">
                  Palacio CMS
                </h1>
                <p className="text-[10px] text-[#86868b] -mt-0.5">Panel de Administración</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge className="bg-[#111111] text-white text-[10px] font-medium hover:bg-[#111111] border-0 rounded-md px-2.5 py-0.5">
                <Crown className="w-3 h-3 mr-1" />
                Admin
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={onLogout}
                className="text-[#86868b] hover:text-[#111111] hover:bg-[#f5f5f7] h-8"
              >
                <LogOut className="w-4 h-4 mr-1.5" />
                Salir
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1">
        {/* Estadísticas superiores */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { icon: Users, label: 'Clientes', value: totalClientes, color: 'text-[#111111]' },
            { icon: GitBranch, label: 'Repositorios', value: totalClientes, color: 'text-[#0e7490]' },
            { icon: Activity, label: 'Cambios/Mes', value: totalCambiosMes, color: 'text-[#111111]' },
            { icon: XCircle, label: 'Plan Gratis', value: clientesGratis, color: 'text-[#92400e]' },
            { icon: CheckCircle2, label: 'Plan Anual', value: clientesAnual, color: 'text-[#0e7490]' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="palacio-card p-4 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#f5f5f7] flex items-center justify-center shrink-0">
                  <Icon className={cn('w-4 h-4', color)} />
                </div>
                <div>
                  <div className="text-xl font-semibold text-[#111111]">{value}</div>
                  <div className="text-[11px] text-[#86868b]">{label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 bg-[#f5f5f7] rounded-lg p-0.5 w-fit">
          {[
            { key: 'monitor' as const, label: 'Monitoreo', icon: BarChart3 },
            { key: 'cuentas' as const, label: 'Cuentas', icon: UserPlus },
            { key: 'logs' as const, label: 'Logs de Cambios', icon: Activity },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium transition-all duration-200',
                activeTab === key
                  ? 'bg-white text-[#111111] shadow-sm'
                  : 'text-[#86868b] hover:text-[#111111]'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* ============================================================
            TAB: MONITOREO
            ============================================================ */}
        {activeTab === 'monitor' && (
          <div className="animate-fade-in">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#c7c7cc]" />
              <Input
                placeholder="Buscar por nombre, email o repositorio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 input-apple h-10"
              />
            </div>

            <div className="palacio-card overflow-hidden">
              {isLoadingClientes ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-[#86868b]" />
                  <span className="ml-3 text-sm text-[#86868b]">Cargando datos...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#e5e5ea] hover:bg-transparent">
                        <TableHead className="text-[#86868b] font-semibold text-xs">Cliente</TableHead>
                        <TableHead className="text-[#86868b] font-semibold text-xs">Email</TableHead>
                        <TableHead className="text-[#86868b] font-semibold text-xs">Repositorio</TableHead>
                        <TableHead className="text-[#86868b] font-semibold text-xs">Plan</TableHead>
                        <TableHead className="text-[#86868b] font-semibold text-xs text-center">Cambios/Mes</TableHead>
                        <TableHead className="text-[#86868b] font-semibold text-xs text-center">Suscripción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClients.map((cliente) => (
                        <TableRow key={cliente.id} className="border-[#e5e5ea] hover:bg-[#f5f5f7]/50 transition-colors">
                          <TableCell className="font-medium text-[#111111]">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-[#f5f5f7] flex items-center justify-center text-[11px] font-semibold text-[#111111]">
                                {cliente.nombre.charAt(0)}
                              </div>
                              <span className="text-sm">{cliente.nombre}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-[#86868b] text-sm font-mono">
                            {cliente.email}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-xs text-[#111111]">
                              <GitBranch className="w-3 h-3 text-[#86868b]" />
                              <span className="font-mono">{cliente.repoOwner}/{cliente.repoName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] font-medium border-0',
                                cliente.plan === 'anual' ? 'status-anual' : 'status-gratis'
                              )}
                            >
                              {cliente.plan === 'anual' ? 'Anual' : 'Gratis'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <div className="w-14 h-1.5 rounded-full bg-[#f5f5f7] overflow-hidden">
                                <div
                                  className={cn(
                                    'h-full rounded-full transition-all duration-500',
                                    cliente.totalCambios > 10
                                      ? 'bg-[#0e7490]'
                                      : cliente.totalCambios >= 3
                                      ? 'bg-[#92400e]'
                                      : 'bg-[#d1d1d6]'
                                  )}
                                  style={{ width: `${Math.min((cliente.totalCambios / 15) * 100, 100)}%` }}
                                />
                              </div>
                              <span className="text-sm font-mono text-[#111111] w-6 text-right">{cliente.totalCambios}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center">
                              <button
                                onClick={() => handleToggleSubscription(cliente.id, cliente.plan)}
                                className={cn(
                                  'toggle-apple',
                                  cliente.plan === 'anual' ? 'active' : 'inactive'
                                )}
                                title={cliente.plan === 'anual' ? 'Cambiar a Gratis' : 'Cambiar a Anual'}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredClients.length === 0 && !isLoadingClientes && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-[#86868b] py-8 text-sm">
                            No se encontraron clientes que coincidan con la búsqueda.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================
            TAB: CUENTAS
            ============================================================ */}
        {activeTab === 'cuentas' && (
          <div className="animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nuevo Cliente */}
            <div className="palacio-card">
              <div className="px-6 py-4 border-b border-[#e5e5ea]">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#111111]" />
                  <h3 className="font-semibold text-sm text-[#111111]">Alta de Nuevo Cliente</h3>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <Dialog open={showNewClientDialog} onOpenChange={setShowNewClientDialog}>
                  <DialogTrigger asChild>
                    <Button className="w-full btn-apple h-10 text-sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Crear Nuevo Cliente
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md bg-white border-[#e5e5ea]">
                    <DialogHeader>
                      <DialogTitle className="text-[#111111]">Nuevo Cliente</DialogTitle>
                      <DialogDescription className="text-[#86868b]">
                        Completa los datos para registrar un nuevo cliente y su sustrato.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-[#111111]">Nombre completo</Label>
                        <Input
                          placeholder="María López"
                          value={newClientName}
                          onChange={(e) => setNewClientName(e.target.value)}
                          className="input-apple"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-[#111111]">Correo electrónico</Label>
                        <Input
                          placeholder="maria@empresa.co"
                          type="email"
                          value={newClientEmail}
                          onChange={(e) => setNewClientEmail(e.target.value)}
                          className="input-apple"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-[#111111]">Repo Owner</Label>
                          <Input
                            placeholder="mi-org"
                            value={newClientRepoOwner}
                            onChange={(e) => setNewClientRepoOwner(e.target.value)}
                            className="input-apple"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-[#111111]">Repo Name</Label>
                          <Input
                            placeholder="landing-page"
                            value={newClientRepoName}
                            onChange={(e) => setNewClientRepoName(e.target.value)}
                            className="input-apple"
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter className="gap-2">
                      <Button variant="ghost" onClick={() => setShowNewClientDialog(false)} className="text-[#86868b]">
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleCreateClient}
                        disabled={isCreatingClient || !newClientName || !newClientEmail || !newClientRepoOwner || !newClientRepoName}
                        className="btn-apple"
                      >
                        {isCreatingClient ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                        Crear Cliente
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <div className="divider" />

                <div className="space-y-2.5">
                  <h4 className="text-xs font-semibold text-[#86868b] uppercase tracking-wider">Clientes Registrados</h4>
                  {clientes.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-[#e5e5ea] flex items-center justify-center text-[11px] font-semibold text-[#111111]">
                          {c.nombre.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-[#111111]">{c.nombre}</div>
                          <div className="text-[11px] text-[#86868b] font-mono">{c.email}</div>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] border-0 font-medium',
                          c.plan === 'anual' ? 'status-anual' : 'status-gratis'
                        )}
                      >
                        {c.plan === 'anual' ? 'Anual' : 'Gratis'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Restablecer Contraseña */}
            <div className="palacio-card">
              <div className="px-6 py-4 border-b border-[#e5e5ea]">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[#111111]" />
                  <h3 className="font-semibold text-sm text-[#111111]">Restablecer Contraseña</h3>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-[#86868b]">
                  Envía un enlace de restablecimiento de contraseña a un cliente. El enlace será válido por 24 horas.
                </p>

                <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full btn-apple-secondary h-10 text-sm">
                      <KeyRound className="w-4 h-4 mr-2" />
                      Forzar Restablecimiento
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-sm bg-white border-[#e5e5ea]">
                    <DialogHeader>
                      <DialogTitle className="text-[#111111]">Restablecer Contraseña</DialogTitle>
                      <DialogDescription className="text-[#86868b]">
                        Se enviará un email con un enlace seguro para restablecer la contraseña.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-[#111111]">Email del cliente</Label>
                        <Select onValueChange={setResetEmail} value={resetEmail}>
                          <SelectTrigger className="input-apple">
                            <SelectValue placeholder="Seleccionar cliente..." />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-[#e5e5ea]">
                            {clientes.map((c) => (
                              <SelectItem key={c.id} value={c.email}>
                                {c.nombre} — {c.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter className="gap-2">
                      <Button variant="ghost" onClick={() => setShowResetDialog(false)} className="text-[#86868b]">
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleResetPassword}
                        disabled={isResetting || !resetEmail}
                        className="btn-apple"
                      >
                        {isResetting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                        Enviar Enlace
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <div className="divider" />

                <div className="space-y-2.5">
                  <h4 className="text-xs font-semibold text-[#86868b] uppercase tracking-wider">Clientes Gratuitos</h4>
                  {clientes
                    .filter((c) => c.plan === 'gratis')
                    .map((c) => (
                      <div key={c.id} className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-[#111111]">{c.nombre}</div>
                            <div className="text-[11px] text-[#86868b] font-mono">{c.repoOwner}/{c.repoName}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-amber-700 font-medium">{c.totalCambios}/3</span>
                          <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            TAB: LOGS
            ============================================================ */}
        {activeTab === 'logs' && (
          <div className="animate-fade-in">
            <div className="palacio-card overflow-hidden">
              <div className="px-6 py-4 border-b border-[#e5e5ea] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#111111]" />
                  <h3 className="font-semibold text-sm text-[#111111]">Registro de Cambios</h3>
                </div>
                <Badge variant="outline" className="text-[10px] text-[#86868b] border-[#e5e5ea]">
                  {DEMO_LOGS.length} registros
                </Badge>
              </div>
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#e5e5ea] hover:bg-transparent">
                      <TableHead className="text-[#86868b] font-semibold text-xs">Fecha</TableHead>
                      <TableHead className="text-[#86868b] font-semibold text-xs">Usuario</TableHead>
                      <TableHead className="text-[#86868b] font-semibold text-xs">Sustrato</TableHead>
                      <TableHead className="text-[#86868b] font-semibold text-xs">Tipo</TableHead>
                      <TableHead className="text-[#86868b] font-semibold text-xs">Sección</TableHead>
                      <TableHead className="text-[#86868b] font-semibold text-xs">Campo</TableHead>
                      <TableHead className="text-[#86868b] font-semibold text-xs">Anterior</TableHead>
                      <TableHead className="text-[#86868b] font-semibold text-xs">Nuevo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {DEMO_LOGS.map((log) => (
                      <TableRow key={log.id} className="border-[#e5e5ea] hover:bg-[#f5f5f7]/50 transition-colors">
                        <TableCell className="text-[11px] text-[#86868b] font-mono whitespace-nowrap">{log.fecha}</TableCell>
                        <TableCell className="text-sm text-[#111111]">{log.usuario}</TableCell>
                        <TableCell className="text-sm text-[#111111] font-mono">{log.sustrato}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('text-[10px] border-0 font-medium', getTipoColor(log.tipo))}>
                            {log.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-[#111111]">{log.seccion}</TableCell>
                        <TableCell className="text-sm font-mono text-[#111111]">{log.campo}</TableCell>
                        <TableCell className="text-sm text-red-500/70 font-mono max-w-[120px] truncate">{log.anterior}</TableCell>
                        <TableCell className="text-sm text-[#0e7490] font-mono max-w-[120px] truncate">{log.nuevo}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Diálogo de confirmación de suscripción */}
      <Dialog open={showSubscriptionDialog} onOpenChange={setShowSubscriptionDialog}>
        <DialogContent className="sm:max-w-sm bg-white border-[#e5e5ea]">
          <DialogHeader>
            <DialogTitle className="text-[#111111] flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-600" />
              Cambio de Suscripción
            </DialogTitle>
            <DialogDescription className="text-[#86868b]">
              {subscriptionChange && (
                <>
                  ¿Confirmas cambiar el estado a{' '}
                  <span className={cn(
                    'font-semibold',
                    subscriptionChange.newStatus === 'anual' ? 'text-[#0e7490]' : 'text-amber-600'
                  )}>
                    {subscriptionChange.newStatus === 'anual' ? 'Plan Anual' : 'Plan Gratuito'}
                  </span>
                  ? Este cambio se reflejará inmediatamente.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowSubscriptionDialog(false)} className="text-[#86868b]">
              Cancelar
            </Button>
            <Button
              onClick={confirmSubscriptionChange}
              className="btn-apple"
            >
              Confirmar Cambio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="mt-auto py-4 text-center text-[11px] text-[#c7c7cc] border-t border-[#e5e5ea]">
        Palacio CMS v1.0 — Panel de Administración
      </footer>
    </div>
  );
}
