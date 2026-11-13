import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import CustomerView from './components/CustomerView';
import KitchenView from './components/KitchenView';
import CashierView from './components/CashierView';
import DailyReportView from './components/DailyReportView';
import CatalogAdminView from './components/CatalogAdminView';
import HealthDashboard from './components/HealthDashboard';
import AuthModal from './components/AuthModal';
import { useAuth } from './context/AuthContext';
import { useSocket } from './context/SocketContext';
import { Bell, Sparkles } from 'lucide-react';

export default function App() {
  const { user } = useAuth();
  const { latestEvent } = useSocket();

  const [activeTab, setActiveTab] = useState('customer');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [toast, setToast] = useState(null);

  // Auto-switch tabs when user role changes or logs in as kitchen/cashier
  useEffect(() => {
    if (user?.role === 'cocina') {
      setActiveTab('kitchen');
    } else if (user?.role === 'cajero') {
      setActiveTab('cashier');
    }
  }, [user?.role]);

  // Toast banner for live events
  useEffect(() => {
    if (!latestEvent) return;

    if (latestEvent.type === 'new_order') {
      setToast({
        title: '🔔 ¡Nuevo Pedido Recibido!',
        message: `Pedido #${latestEvent.data.orderNumber} por ${latestEvent.data.customerName} ($${latestEvent.data.total})`,
        type: 'amber'
      });
    } else if (latestEvent.type === 'ready') {
      setToast({
        title: '🎉 ¡Pedido Listo!',
        message: latestEvent.data.message || `Pedido #${latestEvent.data.orderNumber} para ${latestEvent.data.customerName} listo para entrega`,
        type: 'emerald'
      });
    } else if (latestEvent.type === 'paid') {
      setToast({
        title: '💵 ¡Cobro Exitoso!',
        message: `Pedido #${latestEvent.data.orderNumber} pagado ($${latestEvent.data.amount})`,
        type: 'blue'
      });
    }

    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [latestEvent]);

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col">
      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        cartCount={cart.reduce((s, i) => s + i.quantity, 0)}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* Real-time Floating Toast Alert */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full animate-bounce">
          <div className={`p-4 rounded-2xl shadow-2xl border text-white flex items-start space-x-3 ${
            toast.type === 'emerald'
              ? 'bg-emerald-800 border-emerald-600'
              : toast.type === 'blue'
              ? 'bg-blue-800 border-blue-600'
              : 'bg-amber-800 border-amber-600'
          }`}>
            <Bell className="w-5 h-5 shrink-0 mt-0.5 text-amber-300" />
            <div className="flex-1">
              <div className="font-bold text-xs">{toast.title}</div>
              <div className="text-[11px] text-stone-200 mt-0.5">{toast.message}</div>
            </div>
            <button onClick={() => setToast(null)} className="text-stone-300 hover:text-white text-xs">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content View Switcher */}
      <main className="flex-1">
        {activeTab === 'customer' && (
          <CustomerView
            cart={cart}
            setCart={setCart}
            isCartOpen={isCartOpen}
            setIsCartOpen={setIsCartOpen}
            activeOrder={activeOrder}
            setActiveOrder={setActiveOrder}
          />
        )}

        {activeTab === 'kitchen' && <KitchenView />}

        {activeTab === 'cashier' && <CashierView />}

        {activeTab === 'reports' && <DailyReportView />}

        {activeTab === 'catalog' && <CatalogAdminView />}

        {activeTab === 'health' && <HealthDashboard />}
      </main>

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

      {/* Footer */}
      <footer className="bg-[#241c18] text-stone-400 text-xs py-8 border-t border-stone-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-lg">☕</span>
            <span className="font-serif-title font-bold text-stone-200">Café Aroma & Sabor</span>
            <span className="text-stone-600">·</span>
            <span>Sistema de Pedidos en Microservicios</span>
          </div>

          <div className="flex items-center space-x-4 text-[11px] text-stone-500">
            <span>REST API Gateway</span>
            <span>·</span>
            <span>Event-Driven (Redis PubSub)</span>
            <span>·</span>
            <span>Database-per-Service (SQLite / Postgres)</span>
            <span>·</span>
            <span>Socket.IO Real-Time</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
