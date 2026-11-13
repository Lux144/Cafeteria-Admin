import React, { useState } from 'react';
import { useAuth, DEMO_ACCOUNTS } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  Coffee,
  ChefHat,
  Receipt,
  BarChart3,
  Settings,
  Activity,
  ShoppingBag,
  Volume2,
  VolumeX,
  User,
  LogOut,
  ChevronDown
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, cartCount, onOpenCart, onOpenAuth }) {
  const { user, logout, switchDemoAccount } = useAuth();
  const { isConnected, soundEnabled, toggleSound } = useSocket();
  const [showDemoMenu, setShowDemoMenu] = useState(false);

  const navItems = [
    { id: 'customer', label: 'Menú & Pedir', icon: Coffee, badge: null },
    { id: 'kitchen', label: 'Cocina KDS', icon: ChefHat, badge: 'En Vivo' },
    { id: 'cashier', label: 'Caja & Cobros', icon: Receipt, badge: null },
    { id: 'reports', label: 'Reportes de Venta', icon: BarChart3, badge: null },
    { id: 'catalog', label: 'Admin Catálogo', icon: Settings, badge: null },
    { id: 'health', label: 'Microservicios', icon: Activity, badge: null }
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#241c18] text-[#f7f2ed] border-b border-[#3b302a] shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('customer')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-2xl shadow-md shadow-amber-900/40">
              ☕
            </div>
            <div>
              <span className="font-serif-title font-bold text-xl tracking-tight text-amber-100 block leading-tight">
                Aroma & Sabor
              </span>
              <span className="text-[10px] uppercase tracking-wider text-amber-400 font-semibold block">
                Café de Especialidad · Microservicios
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/30 text-amber-300 border border-amber-400/30 animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Real-time WebSocket connection indicator */}
            <div
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                isConnected
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
              }`}
              title={isConnected ? 'WebSocket conectado en tiempo real' : 'Reconectando WebSocket...'}
            >
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
              <span className="hidden sm:inline">{isConnected ? 'En tiempo real' : 'Desconectado'}</span>
            </div>

            {/* Sound chime toggle */}
            <button
              onClick={toggleSound}
              className="p-2 rounded-lg text-stone-300 hover:text-white hover:bg-stone-800 transition"
              title={soundEnabled ? 'Silenciar campanilla de pedidos' : 'Activar campanilla de pedidos'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-stone-500" />}
            </button>

            {/* Shopping Cart button */}
            <button
              onClick={onOpenCart}
              className="relative p-2.5 rounded-xl bg-amber-700/40 hover:bg-amber-700/60 text-amber-200 border border-amber-600/40 transition flex items-center"
              title="Ver Carrito de Pedido"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-stone-950 text-xs font-black w-5 h-5 rounded-full flex items-center justify-center shadow">
                  {cartCount}
                </span>
              )}
            </button>

            {/* User / Demo switcher */}
            <div className="relative">
              {user ? (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowDemoMenu(!showDemoMenu)}
                    className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs text-stone-200 border border-stone-700 transition"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="font-semibold capitalize">{user.role}</span>
                    <span className="text-stone-400 hidden lg:inline">({user.name})</span>
                    <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                  </button>

                  <button
                    onClick={logout}
                    className="p-2 text-stone-400 hover:text-rose-400 transition"
                    title="Cerrar sesión"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow transition"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Ingresar / Demo</span>
                </button>
              )}

              {/* Demo accounts selector dropdown */}
              {showDemoMenu && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl bg-stone-900 border border-stone-700 shadow-2xl py-2 z-50 text-xs">
                  <div className="px-3 py-1.5 text-stone-400 font-semibold uppercase tracking-wider text-[10px] border-b border-stone-800">
                    Cambio rápido de Rol (Demo)
                  </div>
                  {DEMO_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.role}
                      onClick={async () => {
                        await switchDemoAccount(acc.role);
                        setShowDemoMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 flex items-center space-x-2.5 hover:bg-stone-800 transition ${
                        user && user.role === acc.role ? 'bg-amber-950/50 text-amber-300 font-semibold' : 'text-stone-300'
                      }`}
                    >
                      <span className="text-base">{acc.icon}</span>
                      <div>
                        <div className="capitalize">{acc.role}</div>
                        <div className="text-[10px] text-stone-400">{acc.label}</div>
                      </div>
                    </button>
                  ))}
                  <div className="border-t border-stone-800 mt-1 pt-1 px-3 py-1.5">
                    <button
                      onClick={() => {
                        logout();
                        setShowDemoMenu(false);
                      }}
                      className="text-rose-400 hover:text-rose-300 flex items-center space-x-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-stone-800/80 overflow-x-auto text-xs">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center py-1 px-2 rounded ${
                  isActive ? 'text-amber-400 font-bold' : 'text-stone-400'
                }`}
              >
                <Icon className="w-4 h-4 mb-0.5" />
                <span className="text-[10px] whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
