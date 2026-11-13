import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useSocket } from '../context/SocketContext';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowRight,
  RefreshCw,
  BellRing
} from 'lucide-react';

export default function KitchenView() {
  const { latestEvent, playChime } = useSocket();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  // Load orders
  const loadOrders = async () => {
    try {
      setLoading(true);
      const allOrders = await api.getOrders();
      // Filter out already delivered or cancelled from active kitchen view, or keep last few
      setOrders(allOrders);
    } catch (err) {
      console.error('Error al cargar pedidos de cocina:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // Real-time updates from WebSocket
  useEffect(() => {
    if (!latestEvent) return;

    if (latestEvent.type === 'new_order') {
      loadOrders();
    } else if (latestEvent.type === 'status_updated') {
      setOrders(prev =>
        prev.map(ord =>
          ord.id === latestEvent.data.orderId
            ? { ...ord, status: latestEvent.data.newStatus }
            : ord
        )
      );
    }
  }, [latestEvent]);

  // Transition status
  const handleTransition = async (orderId, targetStatus) => {
    try {
      setUpdatingId(orderId);
      const updated = await api.updateOrderStatus(orderId, targetStatus);
      setOrders(prev =>
        prev.map(ord => (ord.id === orderId ? { ...ord, status: updated.status } : ord))
      );
      if (targetStatus === 'listo') {
        playChime('ready');
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  // Helper: Elapsed minutes calculation
  const getElapsedMinutes = (dateString) => {
    const elapsedMs = Date.now() - new Date(dateString).getTime();
    return Math.max(0, Math.floor(elapsedMs / 60000));
  };

  // Group orders by status for Kanban columns
  const receivedOrders = orders.filter(o => o.status === 'recibido');
  const preparingOrders = orders.filter(o => o.status === 'preparando');
  const readyOrders = orders.filter(o => o.status === 'listo');
  const deliveredOrders = orders.filter(o => o.status === 'entregado').slice(0, 5); // recent 5

  const renderOrderCard = (order, actionButton) => {
    const elapsed = getElapsedMinutes(order.created_at);
    const isUrgent = elapsed >= 10;
    const isWarning = elapsed >= 5 && elapsed < 10;

    return (
      <div
        key={order.id}
        className={`bg-white rounded-2xl p-4 border shadow-sm transition-all hover:shadow-md ${
          isUrgent
            ? 'border-rose-400 bg-rose-50/30 ring-1 ring-rose-400'
            : isWarning
            ? 'border-amber-300 bg-amber-50/20'
            : 'border-stone-200'
        }`}
      >
        {/* Card Header */}
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-stone-100">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-black text-lg text-stone-900">#{order.order_number}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                order.order_type === 'en_local'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-purple-100 text-purple-800'
              }`}>
                {order.order_type === 'en_local' ? `Mesa: ${order.table_number || 'Barra'}` : 'Para Llevar'}
              </span>
            </div>
            <div className="text-xs font-semibold text-stone-600 mt-0.5">
              Cliente: {order.customer_name}
            </div>
          </div>

          {/* Timer pill */}
          <div
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
              isUrgent
                ? 'bg-rose-100 text-rose-700 animate-pulse'
                : isWarning
                ? 'bg-amber-100 text-amber-800'
                : 'bg-stone-100 text-stone-600'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{elapsed}m</span>
          </div>
        </div>

        {/* Order items */}
        <div className="space-y-1.5 my-3">
          {order.items && order.items.map(item => (
            <div key={item.id} className="flex items-start justify-between text-xs bg-stone-50 p-2 rounded-lg">
              <div>
                <span className="font-bold text-stone-900 mr-2">{item.quantity}x</span>
                <span className="font-medium text-stone-800">{item.product_name}</span>
                {item.notes && (
                  <div className="text-[11px] text-amber-800 font-semibold italic mt-0.5 ml-5">
                    ↳ Nota: {item.notes}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {order.notes && (
          <div className="p-2 mb-3 bg-amber-50 rounded-lg text-xs text-amber-900 border border-amber-200">
            <span className="font-bold">Nota general:</span> {order.notes}
          </div>
        )}

        {/* Action button */}
        {actionButton}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-600 text-white shadow">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-serif-title text-2xl font-bold text-stone-900">
                Display de Cocina (KDS)
              </h1>
              <p className="text-stone-500 text-xs">
                Cola de pedidos en tiempo real con WebSocket y cola de mensajes
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={loadOrders}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold border border-stone-200 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refrescar</span>
          </button>
          <div className="flex items-center space-x-2 bg-stone-900 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>En cola: {receivedOrders.length + preparingOrders.length} pedidos</span>
          </div>
        </div>
      </div>

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Column 1: Recibidos */}
        <div className="bg-stone-100/70 rounded-2xl p-4 border border-stone-200 flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-stone-300">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
              <h3 className="font-bold text-sm text-stone-900 uppercase tracking-wide">
                1. Recibidos
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold text-xs">
              {receivedOrders.length}
            </span>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto max-h-[75vh] pr-1">
            {receivedOrders.length === 0 ? (
              <div className="text-center py-16 text-stone-400 text-xs">
                Sin pedidos nuevos por el momento.
              </div>
            ) : (
              receivedOrders.map(order =>
                renderOrderCard(
                  order,
                  <button
                    onClick={() => handleTransition(order.id, 'preparando')}
                    disabled={updatingId === order.id}
                    className="w-full mt-2 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow transition flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <span>Empezar a Preparar</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )
              )
            )}
          </div>
        </div>

        {/* Column 2: En Preparación */}
        <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-200 flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-blue-300">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-blue-600" />
              <h3 className="font-bold text-sm text-blue-950 uppercase tracking-wide">
                2. En Preparación
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-blue-200 text-blue-900 font-bold text-xs">
              {preparingOrders.length}
            </span>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto max-h-[75vh] pr-1">
            {preparingOrders.length === 0 ? (
              <div className="text-center py-16 text-blue-400 text-xs">
                No hay pedidos en preparación actualmente.
              </div>
            ) : (
              preparingOrders.map(order =>
                renderOrderCard(
                  order,
                  <button
                    onClick={() => handleTransition(order.id, 'listo')}
                    disabled={updatingId === order.id}
                    className="w-full mt-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow transition flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <BellRing className="w-4 h-4" />
                    <span>¡Marcar Listo para Entrega!</span>
                  </button>
                )
              )
            )}
          </div>
        </div>

        {/* Column 3: Listos para Entrega */}
        <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-200 flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-emerald-300">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-emerald-600" />
              <h3 className="font-bold text-sm text-emerald-950 uppercase tracking-wide">
                3. Listos
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-bold text-xs">
              {readyOrders.length}
            </span>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto max-h-[75vh] pr-1">
            {readyOrders.length === 0 ? (
              <div className="text-center py-16 text-emerald-400 text-xs">
                No hay pedidos listos esperando ser entregados.
              </div>
            ) : (
              readyOrders.map(order =>
                renderOrderCard(
                  order,
                  <button
                    onClick={() => handleTransition(order.id, 'entregado')}
                    disabled={updatingId === order.id}
                    className="w-full mt-2 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow transition flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Marcar Entregado</span>
                  </button>
                )
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
