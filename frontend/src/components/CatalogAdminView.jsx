import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Settings,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  FolderPlus
} from 'lucide-react';

export default function CatalogAdminView() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal states
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    description: '',
    price: '',
    image_url: '',
    preparation_time: 5,
    is_available: 1
  });

  const [categoryName, setCategoryName] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [cats, prods] = await Promise.all([
        api.getCategories(),
        api.getProducts()
      ]);
      setCategories(cats);
      setProducts(prods);
      if (cats.length > 0 && !formData.category_id) {
        setFormData(prev => ({ ...prev, category_id: cats[0].id }));
      }
    } catch (err) {
      console.error('Error al cargar datos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      category_id: categories[0]?.id || '',
      description: '',
      price: '',
      image_url: '',
      preparation_time: 5,
      is_available: 1
    });
    setShowProductModal(true);
  };

  const handleOpenEdit = (prod) => {
    setEditingProduct(prod);
    setFormData({
      name: prod.name,
      category_id: prod.category_id,
      description: prod.description || '',
      price: prod.price,
      image_url: prod.image_url || '',
      preparation_time: prod.preparation_time || 5,
      is_available: prod.is_available
    });
    setShowProductModal(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, formData);
      } else {
        await api.createProduct(formData);
      }
      setShowProductModal(false);
      loadData();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleToggleAvailability = async (product) => {
    try {
      const nextVal = product.is_available ? 0 : 1;
      await api.toggleProductAvailability(product.id, nextVal);
      setProducts(prev =>
        prev.map(p => (p.id === product.id ? { ...p, is_available: nextVal } : p))
      );
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este producto del catálogo?')) return;
    try {
      await api.deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    try {
      await api.createProduct; // check
      const res = await fetch('/api/catalog/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: categoryName, description: categoryDesc })
      });
      if (!res.ok) throw new Error('Error al crear categoría');
      setShowCategoryModal(false);
      setCategoryName('');
      setCategoryDesc('');
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const filtered = products.filter(p =>
    search ? p.name.toLowerCase().includes(search.toLowerCase()) : true
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-amber-600 text-white shadow">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif-title text-2xl font-bold text-stone-900">
              Administración de Catálogo
            </h1>
            <p className="text-stone-500 text-xs">
              CRUD de productos, categorías, precios y disponibilidad en tiempo real
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold border border-stone-200 shadow-xs"
          >
            <FolderPlus className="w-4 h-4 text-amber-600" />
            <span>Nueva Categoría</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow transition"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Producto</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6 flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <button
          onClick={loadData}
          className="p-2 rounded-xl bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-100/70 text-stone-600 uppercase font-bold text-[10px] tracking-wider border-b border-stone-200">
              <tr>
                <th className="py-3 px-4">Producto</th>
                <th className="py-3 px-4">Categoría</th>
                <th className="py-3 px-4">Precio</th>
                <th className="py-3 px-4">Tiempo Prep.</th>
                <th className="py-3 px-4 text-center">Disponibilidad (Switch)</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map(prod => (
                <tr key={prod.id} className="hover:bg-stone-50/70 transition">
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-3">
                      <img
                        src={prod.image_url || 'https://images.unsplash.com/photo-1510707577719-eaef21005169?w=100'}
                        alt={prod.name}
                        className="w-10 h-10 rounded-lg object-cover bg-stone-100 shrink-0"
                      />
                      <div>
                        <div className="font-bold text-stone-900">{prod.name}</div>
                        <div className="text-[11px] text-stone-400 line-clamp-1">{prod.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-semibold text-stone-700">
                    {prod.category_name || prod.category_id}
                  </td>
                  <td className="py-3 px-4 font-black text-stone-900">
                    ${Number(prod.price).toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-stone-600">
                    ~{prod.preparation_time} min
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleToggleAvailability(prod)}
                      className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition ${
                        prod.is_available
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                      }`}
                      title="Clic para cambiar disponibilidad"
                    >
                      {prod.is_available ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Disponible</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Agotado</span>
                        </>
                      )}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center space-x-2">
                      <button
                        onClick={() => handleOpenEdit(prod)}
                        className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(prod.id)}
                        className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear / Editar Producto */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-stone-200">
              <h3 className="font-bold text-base text-stone-900">
                {editingProduct ? 'Editar Producto' : 'Crear Nuevo Producto'}
              </h3>
              <button onClick={() => setShowProductModal(false)} className="text-stone-400">✕</button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-stone-700 block mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Categoría</label>
                  <select
                    value={formData.category_id}
                    onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Precio ($ MXN)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Descripción</label>
                <textarea
                  rows="2"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">URL de Imagen</label>
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="https://images.unsplash.com/..."
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Tiempo Estimado (min)</label>
                  <input
                    type="number"
                    value={formData.preparation_time}
                    onChange={e => setFormData({ ...formData, preparation_time: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-stone-100 text-stone-700 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-500 shadow"
                >
                  Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Crear Categoría */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="font-bold text-base text-stone-900 mb-3">Crear Categoría</h3>
            <form onSubmit={handleCreateCategory} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-stone-700 block mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={categoryName}
                  onChange={e => setCategoryName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none"
                  placeholder="ej. Tés & Tisanas"
                />
              </div>
              <div>
                <label className="font-bold text-stone-700 block mb-1">Descripción</label>
                <input
                  type="text"
                  value={categoryDesc}
                  onChange={e => setCategoryDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none"
                />
              </div>
              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="flex-1 py-2 rounded-xl bg-stone-100 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-amber-600 text-white font-bold"
                >
                  Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
