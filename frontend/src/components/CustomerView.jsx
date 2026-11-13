import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  Coffee,
  Plus,
  Minus,
  Trash2,
  Clock,
  CheckCircle2,
  Search,
  ShoppingBag,
  ArrowRight,
  Sparkles,
  History,
  AlertCircle
} from 'lucide-react';

export default function CustomerView({
  cart,
  setCart,
  isCartOpen,
  setIsCartOpen,
  activeOrder,
  setActiveOrder
}) {
  const { user } = useAuth();
  const { latestEvent } = useSocket();

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Cart order form
  const [orderType, setOrderType] = useState('en_local');
  const [tableNumber, setTableNumber] = useState('Mesa 4');
  const [customerName, setCustomerName] = useState(user?.name || 'Cliente');
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Order history modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [customerHistory, setCustomerHistory] = useState([]);

  useEffect(() => {
    if (user?.name) {
      setCustomerName(user.name);
    }
  }, [user]);

  // Load catalog
  useEffect(() => {
    async function loadCatalog() {
      try {
        setLoading(true);
        const [cats, prods] = await Promise.all([
          api.getCategories(),
          api.getProducts()
        ]);
        setCategories(cats);
        setProducts(prods);
      } catch (err) {
        console.error('Error al cargar catálogo:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCatalog();
  }, []);

  // Update active order when real-time socket event arrives
  useEffect(() => {
    if (latestEvent && activeOrder) {
      if (latestEvent.type === 'status_updated' && latestEvent.data.orderId === activeOrder.id) {
        setActiveOrder(prev => ({
          ...prev,
          status: latestEvent.data.newStatus
        }));
      }
      if (latestEvent.type === 'ready' && latestEvent.data.orderId === activeOrder.id) {
        setActiveOrder(prev => ({
          ...prev,
          status: 'listo'
        }));
      }
    }
  }, [latestEvent, activeOrder, setActiveOrder]);

  // Cart operations
  const addToCart = (product) => {
    if (!product.is_available) return;
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1, subtotal: Math.round((item.quantity + 1) * item.unit_price * 100) / 100 }
            : item
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          unit_price: product.price,
          quantity: 1,
          subtotal: product.price,
          image_url: product.image_url,
          notes: ''
        }
      ];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (productId, delta) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.product_id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0
              ? { ...item, quantity: newQty, subtotal: Math.round(newQty * item.unit_price * 100) / 100 }
              : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const updateItemNotes = (productId, notes) => {
    setCart(prev =>
      prev.map(item =>
        item.product_id === productId ? { ...item, notes } : item
      )
    );
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.product_id !== productId));
  };

  // Calculations
  const cartSubtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const cartTax = Math.round(cartSubtotal * 0.16 * 100) / 100;
  const cartTotal = Math.round((cartSubtotal + cartTax) * 100) / 100;

  // Submit order to API Gateway
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (!customerName.trim()) {
      setSubmitError('Por favor indica tu nombre para el pedido');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const orderPayload = {
        customer_id: user?.id || null,
        customer_name: customerName.trim(),
        order_type: orderType,
        table_number: orderType === 'en_local' ? tableNumber : null,
        items: cart,
        notes: orderNotes
      };

      const created = await api.createOrder(orderPayload);
      setActiveOrder(created);
      setCart([]);
      setIsCartOpen(false);
    } catch (err) {
      setSubmitError(err.message || 'Error al enviar pedido');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openHistory = async () => {
    if (!user) {
      alert('Inicia sesión para ver tu historial de pedidos.');
      return;
    }
    try {
      const orders = await api.getCustomerOrders(user.id);
      setCustomerHistory(orders);
      setShowHistoryModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory ? p.category_id === selectedCategory : true;
    const matchesSearch = searchQuery
      ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
      : true;
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#3b2a22] via-[#523b30] to-[#2b1e18] text-white p-8 sm:p-12 mb-10 shadow-xl border border-amber-900/40">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold mb-4 border border-amber-400/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Café de especialidad & Panadería artesanal</span>
          </div>
          <h1 className="font-serif-title text-3xl sm:text-5xl font-bold tracking-tight mb-4 text-amber-50">
            Ordena desde tu mesa o para llevar.
          </h1>
          <p className="text-stone-300 text-sm sm:text-base mb-6 leading-relaxed">
            Tu pedido llega directamente a la cola de la cocina en tiempo real sin esperas ni anotaciones en papel.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                const el = document.getElementById('catalog-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm shadow-lg shadow-amber-900/50 transition flex items-center space-x-2"
            >
              <span>Explorar Menú</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            {user && (
              <button
                onClick={openHistory}
                className="px-5 py-3 rounded-xl bg-stone-800/80 hover:bg-stone-800 text-stone-200 font-medium text-sm border border-stone-700 transition flex items-center space-x-2"
              >
                <History className="w-4 h-4 text-amber-400" />
                <span>Mis Pedidos Anteriores</span>
              </button>
            )}
          </div>
        </div>
        <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-20 pointer-events-none bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&auto=format&fit=crop&q=80')" }} />
      </div>

      {/* Active Order Live Tracker Banner (If user has an active order) */}
      {activeOrder && activeOrder.status !== 'entregado' && (
        <div className="mb-10 p-6 rounded-2xl bg-amber-50 border-2 border-amber-300 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 pb-4 border-b border-amber-200">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Tu Pedido en Curso</span>
              <h2 className="text-xl font-bold text-stone-900">
                Pedido #{activeOrder.order_number} · {activeOrder.order_type === 'en_local' ? `En Local (${activeOrder.table_number || 'Mesa'})` : 'Para Llevar'}
              </h2>
            </div>
            <div className="mt-2 sm:mt-0 text-sm font-semibold text-amber-900 bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-200 inline-block">
              Total: ${Number(activeOrder.total).toFixed(2)} ({activeOrder.payment_status === 'pagado' ? 'Pagado' : 'Pendiente de cobro en caja'})
            </div>
          </div>

          {/* Stepper */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs font-semibold">
            {[
              { id: 'recibido', label: '1. Recibido', icon: '📝' },
              { id: 'preparando', label: '2. En Cocina', icon: '👨‍🍳' },
              { id: 'listo', label: '3. ¡Listo para Entrega!', icon: '🎉' },
              { id: 'entregado', label: '4. Entregado', icon: '☕' }
            ].map((step, idx) => {
              const statusOrder = ['recibido', 'preparando', 'listo', 'entregado'];
              const currentIndex = statusOrder.indexOf(activeOrder.status);
              const stepIndex = statusOrder.indexOf(step.id);
              const isPast = stepIndex < currentIndex;
              const isCurrent = stepIndex === currentIndex;

              return (
                <div
                  key={step.id}
                  className={`p-3 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-amber-600 text-white border-amber-600 shadow-lg scale-105 animate-pulse-subtle'
                      : isPast
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-stone-100 text-stone-400 border-stone-200'
                  }`}
                >
                  <div className="text-xl mb-1">{step.icon}</div>
                  <div className="truncate">{step.label}</div>
                </div>
              );
            })}
          </div>

          {activeOrder.status === 'listo' && (
            <div className="mt-4 p-3 rounded-xl bg-emerald-500 text-white font-bold text-center text-sm shadow animate-bounce">
              ¡Tu pedido está listo! Por favor pasa al mostrador de entrega para disfrutarlo.
            </div>
          )}
        </div>
      )}

      {/* Catalog Search & Category Filter Section */}
      <div id="catalog-section" className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="font-serif-title text-2xl font-bold text-stone-900">Nuestro Menú</h2>
            <p className="text-stone-500 text-xs sm:text-sm">Selecciona tus bebidas y alimentos favoritos</p>
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
            />
          </div>
        </div>

        {/* Category filter pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              selectedCategory === null
                ? 'bg-stone-900 text-white shadow'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            Todos ({products.length})
          </button>
          {categories.map(cat => {
            const count = products.filter(p => p.category_id === cat.id).length;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-amber-600 text-white shadow'
                    : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                <span>{cat.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-amber-800 text-amber-200' : 'bg-stone-100 text-stone-500'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="text-center py-20 text-stone-500">
          <div className="animate-spin w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full mx-auto mb-3" />
          <p>Cargando menú delicioso...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-stone-200 p-8">
          <p className="text-stone-500 text-sm">No se encontraron productos con el filtro aplicado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map(product => {
            const inCartItem = cart.find(i => i.product_id === product.id);
            return (
              <div
                key={product.id}
                className="bg-white rounded-2xl overflow-hidden border border-stone-200 shadow-sm hover:shadow-md transition-all flex flex-col group"
              >
                {/* Image */}
                <div className="relative h-44 overflow-hidden bg-stone-100">
                  <img
                    src={product.image_url || 'https://images.unsplash.com/photo-1510707577719-eaef21005169?w=500'}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    loading="lazy"
                  />
                  {!product.is_available && (
                    <div className="absolute inset-0 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center">
                      <span className="px-3 py-1 rounded-full bg-rose-600 text-white font-bold text-xs uppercase tracking-wider">
                        Agotado
                      </span>
                    </div>
                  )}
                  {/* Preparation time badge */}
                  <div className="absolute top-2.5 right-2.5 px-2 py-1 rounded-lg bg-stone-900/80 backdrop-blur-xs text-white text-[10px] font-semibold flex items-center space-x-1 shadow">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>~{product.preparation_time} min</span>
                  </div>
                </div>

                {/* Details */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                      {product.category_name || 'Especialidad'}
                    </span>
                    <h3 className="font-bold text-stone-900 text-base leading-snug mt-0.5">
                      {product.name}
                    </h3>
                    <p className="text-stone-500 text-xs mt-1 line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-stone-400 block">Precio</span>
                      <span className="text-lg font-black text-stone-900">
                        ${Number(product.price).toFixed(2)}
                      </span>
                    </div>

                    {inCartItem ? (
                      <div className="flex items-center space-x-2 bg-amber-50 border border-amber-300 rounded-xl p-1">
                        <button
                          onClick={() => updateQuantity(product.id, -1)}
                          className="w-7 h-7 rounded-lg bg-white hover:bg-amber-100 text-stone-700 flex items-center justify-center shadow-xs"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-bold text-xs text-amber-900 px-1">
                          {inCartItem.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(product.id, 1)}
                          className="w-7 h-7 rounded-lg bg-amber-600 hover:bg-amber-500 text-white flex items-center justify-center shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(product)}
                        disabled={!product.is_available}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition ${
                          product.is_available
                            ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm'
                            : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Agregar</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cart Drawer / Slide-Over */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-stone-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsCartOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
              {/* Header */}
              <div className="p-5 bg-stone-900 text-white flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShoppingBag className="w-5 h-5 text-amber-400" />
                  <h2 className="font-bold text-base">Tu Pedido ({cart.length})</h2>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="text-stone-400 hover:text-white text-sm"
                >
                  Cerrar ✕
                </button>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {cart.length === 0 ? (
                  <div className="text-center py-16 text-stone-400">
                    <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Tu carrito está vacío.</p>
                    <p className="text-xs text-stone-400 mt-1">Agrega productos del catálogo para continuar.</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.product_id} className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-stone-900 text-sm">{item.product_name}</h4>
                          <span className="text-xs text-stone-500">${Number(item.unit_price).toFixed(2)} c/u</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => updateQuantity(item.product_id, -1)}
                            className="w-6 h-6 rounded bg-stone-200 hover:bg-stone-300 flex items-center justify-center text-xs"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-bold text-xs w-4 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product_id, 1)}
                            className="w-6 h-6 rounded bg-amber-600 text-white flex items-center justify-center text-xs"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => removeFromCart(item.product_id)}
                            className="text-rose-500 hover:text-rose-700 ml-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Custom note for this item */}
                      <input
                        type="text"
                        placeholder="Nota (ej. sin hielo, leche de almendra)..."
                        value={item.notes || ''}
                        onChange={(e) => updateItemNotes(item.product_id, e.target.value)}
                        className="w-full text-xs px-2.5 py-1 rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />

                      <div className="text-right text-xs font-bold text-stone-900">
                        Subtotal: ${Number(item.subtotal).toFixed(2)}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Order Form & Checkout Footer */}
              {cart.length > 0 && (
                <form onSubmit={handlePlaceOrder} className="p-5 border-t border-stone-200 bg-stone-50 space-y-3">
                  {submitError && (
                    <div className="p-2.5 rounded-lg bg-rose-100 text-rose-800 text-xs flex items-center space-x-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  {/* Order Type */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setOrderType('en_local')}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border text-center transition ${
                        orderType === 'en_local'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                          : 'bg-white text-stone-700 border-stone-300'
                      }`}
                    >
                      ☕ En Local (Mesa)
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderType('para_llevar')}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border text-center transition ${
                        orderType === 'para_llevar'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                          : 'bg-white text-stone-700 border-stone-300'
                      }`}
                    >
                      🛍️ Para Llevar
                    </button>
                  </div>

                  {/* Customer name and table */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-stone-600 uppercase">Nombre</label>
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    {orderType === 'en_local' && (
                      <div>
                        <label className="text-[10px] font-bold text-stone-600 uppercase">Mesa</label>
                        <input
                          type="text"
                          value={tableNumber}
                          onChange={(e) => setTableNumber(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* Totals */}
                  <div className="space-y-1 pt-2 border-t border-stone-200 text-xs">
                    <div className="flex justify-between text-stone-500">
                      <span>Subtotal</span>
                      <span>${cartSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-stone-500">
                      <span>IVA (16%)</span>
                      <span>${cartTax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-stone-900 font-black text-sm pt-1 border-t border-stone-200">
                      <span>Total</span>
                      <span className="text-amber-700">${cartTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm shadow-lg shadow-amber-900/30 transition flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <span>{isSubmitting ? 'Enviando a Cocina...' : 'Confirmar Pedido'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Customer Order History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-stone-200 flex items-center justify-between">
              <h3 className="font-bold text-stone-900 flex items-center space-x-2">
                <History className="w-5 h-5 text-amber-600" />
                <span>Historial de Pedidos</span>
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                ✕
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-3">
              {customerHistory.length === 0 ? (
                <p className="text-center text-stone-500 text-sm py-8">Aún no tienes pedidos registrados.</p>
              ) : (
                customerHistory.map(order => (
                  <div key={order.id} className="p-4 rounded-xl border border-stone-200 bg-stone-50 text-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-stone-900 text-sm">Pedido #{order.order_number}</span>
                      <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                        order.status === 'entregado' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="text-stone-500">
                      Fecha: {new Date(order.created_at).toLocaleString()} · {order.order_type === 'en_local' ? `En Local (${order.table_number || 'Mesa'})` : 'Para Llevar'}
                    </div>
                    <div className="font-semibold text-stone-800">
                      Total: ${Number(order.total).toFixed(2)} ({order.payment_status})
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
