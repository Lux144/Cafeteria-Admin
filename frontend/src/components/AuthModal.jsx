import React, { useState } from 'react';
import { useAuth, DEMO_ACCOUNTS } from '../context/AuthContext';
import { User, Lock, Mail, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';

export default function AuthModal({ isOpen, onClose }) {
  const { login, register, switchDemoAccount } = useAuth();
  const [isRegister, setIsRegister] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('cliente');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        await register({ name, email, password, role });
      } else {
        await login(email, password);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Error al procesar solicitud');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoClick = async (demoRole) => {
    setError(null);
    setLoading(true);
    try {
      await switchDemoAccount(demoRole);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 text-stone-400 hover:text-stone-700 text-sm"
        >
          ✕
        </button>

        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center text-2xl mx-auto mb-2 shadow-md">
            ☕
          </div>
          <h2 className="font-serif-title text-2xl font-bold text-stone-900">
            {isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}
          </h2>
          <p className="text-stone-500 text-xs mt-1">
            Sistema de Pedidos · Aroma & Sabor Café
          </p>
        </div>

        {/* 1-Click Demo Accounts Quick-Login */}
        <div className="mb-6 p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-900 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Acceso Rápido con Cuentas Demo</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {DEMO_ACCOUNTS.map(acc => (
              <button
                key={acc.role}
                type="button"
                onClick={() => handleDemoClick(acc.role)}
                disabled={loading}
                className="p-2 rounded-xl bg-white hover:bg-amber-100/60 border border-amber-200 text-left transition flex items-center space-x-2 shadow-2xs disabled:opacity-50"
              >
                <span className="text-lg">{acc.icon}</span>
                <div className="truncate">
                  <div className="font-bold text-stone-900 capitalize">{acc.role}</div>
                  <div className="text-[10px] text-stone-500 truncate">{acc.email.split('@')[0]}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="relative flex py-2 items-center mb-4">
          <div className="flex-grow border-t border-stone-200"></div>
          <span className="shrink mx-4 text-[10px] text-stone-400 font-bold uppercase tracking-wider">
            O ingresa con tus datos
          </span>
          <div className="flex-grow border-t border-stone-200"></div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-100 text-rose-800 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          {isRegister && (
            <>
              <div>
                <label className="font-bold text-stone-700 block mb-1">Nombre Completo</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="ej. Mariana Torres"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Rol</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="cliente">Cliente (Web)</option>
                  <option value="cocina">Cocina (KDS)</option>
                  <option value="cajero">Cajero</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="font-bold text-stone-700 block mb-1">Correo Electrónico</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="usuario@cafeteria.com"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-stone-700 block mb-1">Contraseña</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm shadow-md transition flex items-center justify-center space-x-2 disabled:opacity-50 mt-4"
          >
            <span>{loading ? 'Procesando...' : isRegister ? 'Registrarse' : 'Ingresar'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="text-xs text-amber-700 hover:text-amber-800 font-semibold"
          >
            {isRegister
              ? '¿Ya tienes una cuenta? Inicia sesión aquí'
              : '¿No tienes cuenta aún? Regístrate aquí'}
          </button>
        </div>
      </div>
    </div>
  );
}
