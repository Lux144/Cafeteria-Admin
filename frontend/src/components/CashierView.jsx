import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useSocket } from '../context/SocketContext';
import {
  Receipt,
  CreditCard,
  Banknote,
  QrCode,
  CheckCircle,
  Clock,
  Printer,
  Search,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

export default function CashierView() {
  const { latestEvent, playChime } = useSocket();
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('pendiente'); // 'pendiente' | 'pagado' | 'todos'
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Checkout modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [amountReceived, setAmountReceived] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [paidReceipt, setPaidReceipt] = useState(null);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await api.getOrders();
      setOrders(data);
    } catch (err) {
      console.error('Error al cargar pedidos en caja:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // Listen to real-time events
  useEffect(() => {
    if (!latestEvent) return;
    if (['new_order', 'status_updated', 'paid'].includes(latestEvent.type)) {
      loadOrders();
    }
  }, [latestEvent]);

  // Open checkout modal
  const handleOpenCheckout = (order) => {
    setSelectedOrder(order);
    setPaymentMethod('efectivo');
    setAmountReceived(String(Math.ceil(order.total / 50) * 50 || order.total));
    setPaymentError(null);
    setPaidReceipt(null);
  };

  // Process simulated payment
  const handleConfirmPayment = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;

    try {
      setIsProcessing(true);
      setPaymentError(null);

      const received = paymentMethod === 'efectivo'
        ? Number(amountReceived)
        : Number(selectedOrder.total);

      if (paymentMethod === 'efectivo' && received < selectedOrder.total) {
        setPaymentError(`El monto recibido ($${received}) es menor al total ($${selectedOrder.total})`);
        setIsProcessing(false);
        return;
      }

      const updated = await api.processPayment(selectedOrder.id, {
        payment_method: paymentMethod,
        amount_received: received
      });

      playChime('bell');
      setPaidReceipt(updated);
      loadOrders();
    } catch (err) {
      setPaymentError(err.message || 'Error al procesar el pago');
    } finally {
      setIsProcessing(false);
    }
  };

  // Close order / mark delivered
  const handleMarkDelivered = async (orderId) => {
    try {
      await api.updateOrderStatus(orderId, 'entregado');
      loadOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(null);
        setPaidReceipt(null);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Filter orders
  const filteredOrders = orders.filter(o => {
    const matchesFilter = filter === 'todos' ? true : o.payment_status === filter;
    const matchesSearch = search
      ? o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
        String(o.order_number).includes(search)
      : true;
    return matchesFilter && matchesSearch;
  });

  const changeDue = selectedOrder && paymentMethod === 'efectivo'
    ? Math.max(0, Math.round(((Number(amountReceived) || 0) - selectedOrder.total) * 100) / 100)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-emerald-600 text-white shadow">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif-title text-2xl font-bold text-stone-900">
              Punto de Venta & Caja
            </h1>
            <p className="text-stone-500 text-xs">
              Cobro simulado, emisión de tickets y cierre de pedidos
            </p>
          </div>
        </div>

        <button
          onClick={loadOrders}
          className="self-start sm:self-auto flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold border border-stone-200 shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 bg-white p-3 rounded-2xl border border-stone-200 shadow-xs">
        <div className="flex items-center space-x-2">
          {[
            { id: 'pendiente', label: 'Pendientes de Pago' },
            { id: 'pagado', label: 'Cobrados' },
            { id: 'todos', label: 'Todos los Pedidos' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                filter === tab.id
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Buscar pedido # o cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-100/70 text-stone-600 uppercase font-bold text-[10px] tracking-wider border-b border-stone-200">
              <tr>
                <th className="py-3 px-4">Pedido</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Modalidad</th>
                <th className="py-3 px-4">Productos</th>
                <th className="py-3 px-4">Estado Cocina</th>
                <th className="py-3 px-4">Pago</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-stone-400">
                    No hay pedidos en este filtro.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-stone-50/80 transition">
                    <td className="py-3 px-4 font-black text-stone-900 text-sm">
                      #{order.order_number}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-stone-900">{order.customer_name}</div>
                      <div className="text-[10px] text-stone-400">
                        {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                        order.order_type === 'en_local' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {order.order_type === 'en_local' ? `Mesa: ${order.table_number || 'Local'}` : 'Para Llevar'}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-stone-600">
                      {order.items ? order.items.map(i => `${i.quantity}x ${i.product_name}`).join(', ') : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${
                        order.status === 'recibido'
                          ? 'bg-amber-100 text-amber-900'
                          : order.status === 'preparando'
                          ? 'bg-blue-100 text-blue-900'
                          : order.status === 'listo'
                          ? 'bg-emerald-100 text-emerald-900 font-black animate-pulse'
                          : 'bg-stone-100 text-stone-600'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {order.payment_status === 'pagado' ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-700 font-bold">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span className="capitalize">{order.payment_method || 'Pagado'}</span>
                        </span>
                      ) : (
                        <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          Pendiente
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-stone-900 text-sm">
                      ${Number(order.total).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {order.payment_status === 'pendiente' ? (
                        <button
                          onClick={() => handleOpenCheckout(order)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition"
                        >
                          Cobrar
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenCheckout(order)}
                          className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium text-xs transition"
                        >
                          Ver Ticket
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Checkout / Receipt Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-5 bg-stone-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold block">
                  {paidReceipt || selectedOrder.payment_status === 'pagado' ? 'Comprobante de Pago' : 'Módulo de Cobro Simulado'}
                </span>
                <h3 className="font-bold text-lg">
                  Pedido #{selectedOrder.order_number} · {selectedOrder.customer_name}
                </h3>
              </div>
              <button
                onClick={() => {
                  setSelectedOrder(null);
                  setPaidReceipt(null);
                }}
                className="text-stone-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* If order is already paid, show Receipt */}
            {paidReceipt || selectedOrder.payment_status === 'pagado' ? (
              <div className="p-6 space-y-4">
                {/* Printable receipt card */}
                <div id="printable-ticket" className="bg-[#FAF8F5] p-6 rounded-2xl border border-stone-300 font-mono text-xs text-stone-800 space-y-3 shadow-inner">
                  <div className="text-center pb-2 border-b border-dashed border-stone-400">
                    <div className="font-black text-sm tracking-widest uppercase">Café Aroma & Sabor</div>
                    <div className="text-[10px] text-stone-500">RFC: CAS-20261110-XYZ</div>
                    <div className="text-[10px] text-stone-500">Av. Siempre Viva 742, Cafetería</div>
                  </div>

                  <div className="text-[11px] space-y-0.5">
                    <div><b>Folio:</b> #{selectedOrder.order_number}</div>
                    <div><b>Fecha:</b> {new Date().toLocaleString()}</div>
                    <div><b>Cliente:</b> {selectedOrder.customer_name}</div>
                    <div><b>Modalidad:</b> {selectedOrder.order_type === 'en_local' ? `En Local (${selectedOrder.table_number || 'Mesa'})` : 'Para Llevar'}</div>
                  </div>

                  <div className="border-t border-b border-dashed border-stone-400 py-2 space-y-1">
                    {selectedOrder.items && selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>{item.quantity}x {item.product_name}</span>
                        <span>${Number(item.subtotal).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1 pt-1 text-[11px]">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>${Number(selectedOrder.subtotal).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>IVA 16%</span>
                      <span>${Number(selectedOrder.tax).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm pt-1 border-t border-dashed border-stone-400">
                      <span>TOTAL PAGADO</span>
                      <span>${Number(selectedOrder.total).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-stone-600 text-[10px]">
                      <span>Método: {selectedOrder.payment_method?.toUpperCase()}</span>
                      {selectedOrder.payment?.amount_received && (
                        <span>Recibido: ${selectedOrder.payment.amount_received.toFixed(2)}</span>
                      )}
                    </div>
                    {selectedOrder.payment?.change_returned > 0 && (
                      <div className="flex justify-between text-stone-600 text-[10px]">
                        <span>Cambio entregado:</span>
                        <span>${selectedOrder.payment.change_returned.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-center pt-3 border-t border-dashed border-stone-400 text-[10px] text-stone-500">
                    ¡Gracias por tu compra! ☕<br />Que disfrutes tu café artesanal.
                  </div>
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <button
                    onClick={() => window.print()}
                    className="flex-1 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center justify-center space-x-2"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimir Ticket</span>
                  </button>

                  {selectedOrder.status !== 'entregado' && (
                    <button
                      onClick={() => handleMarkDelivered(selectedOrder.id)}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Cerrar Pedido (Entregar)</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Payment form */
              <form onSubmit={handleConfirmPayment} className="p-6 space-y-4">
                {paymentError && (
                  <div className="p-3 rounded-xl bg-rose-100 text-rose-800 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{paymentError}</span>
                  </div>
                )}

                {/* Amount to pay display */}
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-center">
                  <span className="text-xs uppercase font-bold text-amber-700 tracking-wider">Total a Cobrar</span>
                  <div className="text-3xl font-black text-stone-900 mt-1">
                    ${Number(selectedOrder.total).toFixed(2)}
                  </div>
                </div>

                {/* Method selector */}
                <div>
                  <label className="text-xs font-bold text-stone-700 uppercase tracking-wide block mb-2">
                    Método de Pago
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'efectivo', label: 'Efectivo', icon: Banknote },
                      { id: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
                      { id: 'transferencia', label: 'Transferencia / QR', icon: QrCode }
                    ].map(m => {
                      const Icon = m.icon;
                      const isSelected = paymentMethod === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPaymentMethod(m.id)}
                          className={`p-3 rounded-xl border text-center transition flex flex-col items-center space-y-1.5 ${
                            isSelected
                              ? 'bg-amber-600 text-white border-amber-600 shadow'
                              : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="text-xs font-bold">{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Cash Method Inputs */}
                {paymentMethod === 'efectivo' && (
                  <div className="space-y-3 bg-stone-50 p-4 rounded-2xl border border-stone-200">
                    <div>
                      <label className="text-xs font-bold text-stone-700 block mb-1">
                        Monto Recibido del Cliente ($)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        required
                        value={amountReceived}
                        onChange={(e) => setAmountReceived(e.target.value)}
                        className="w-full text-base font-bold px-3 py-2 rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    {/* Quick cash denomination buttons */}
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] text-stone-500 font-bold">Rápido:</span>
                      {[
                        Math.ceil(selectedOrder.total),
                        100,
                        200,
                        500
                      ].filter((v, i, a) => a.indexOf(v) === i && v >= selectedOrder.total).map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setAmountReceived(String(val))}
                          className="px-2.5 py-1 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-bold"
                        >
                          ${val}
                        </button>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-stone-200 flex justify-between items-center text-sm">
                      <span className="font-bold text-stone-600">Cambio / Vuelto:</span>
                      <span className="text-lg font-black text-emerald-700">
                        ${changeDue.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Card Method Inputs */}
                {paymentMethod === 'tarjeta' && (
                  <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-center space-y-2">
                    <CreditCard className="w-8 h-8 text-amber-600 mx-auto" />
                    <div className="text-xs text-stone-600 font-medium">
                      Terminal bancaria lista para cobro con chip / contactless (NFC).
                    </div>
                    <div className="text-[11px] text-stone-400">
                      Tarjeta: **** **** **** 4242 · Aprobación automática simulada
                    </div>
                  </div>
                )}

                {/* Transfer / QR Method */}
                {paymentMethod === 'transferencia' && (
                  <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-center space-y-2">
                    <QrCode className="w-10 h-10 text-stone-700 mx-auto" />
                    <div className="text-xs font-bold text-stone-800">
                      Escanear QR o Transferir a CLABE: 012180004567891234
                    </div>
                    <div className="text-[10px] text-stone-500">
                      Concepto: PEDIDO-{selectedOrder.order_number}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/20 transition flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{isProcessing ? 'Registrando Cobro...' : 'Completar Cobro y Emitir Ticket'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
