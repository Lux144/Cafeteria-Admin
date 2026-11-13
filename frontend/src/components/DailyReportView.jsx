import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  BarChart3,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Download,
  Calendar,
  CreditCard,
  Banknote,
  QrCode,
  Printer,
  RefreshCw
} from 'lucide-react';

export default function DailyReportView() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadReport = async () => {
    try {
      setLoading(true);
      const data = await api.getDailySalesReport(selectedDate);
      setReport(data);
    } catch (err) {
      console.error('Error al cargar reporte diario:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [selectedDate]);

  // Export report to CSV
  const exportToCSV = () => {
    if (!report) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += `Reporte Diario de Ventas - ${report.date}\n\n`;
    csvContent += `Total Ventas,$${report.summary.totalRevenue}\n`;
    csvContent += `Total Pedidos,${report.summary.totalOrders}\n`;
    csvContent += `Ticket Promedio,$${report.summary.averageTicket}\n`;
    csvContent += `Pedidos Entregados,${report.summary.completedOrders}\n\n`;

    csvContent += 'Top Productos Vendidos\n';
    csvContent += 'Producto,Unidades Vendidas,Ingresos ($)\n';
    report.topProducts.forEach(p => {
      csvContent += `"${p.name}",${p.quantity},${p.revenue}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reporte_ventas_${report.date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Title & Date Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-amber-600 text-white shadow">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif-title text-2xl font-bold text-stone-900">
              Reporte Diario de Ventas
            </h1>
            <p className="text-stone-500 text-xs">
              Métricas de rendimiento financiero, métodos de pago y productos más vendidos
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <div className="flex items-center space-x-1.5 bg-white px-3 py-1.5 rounded-xl border border-stone-200 shadow-xs">
            <Calendar className="w-4 h-4 text-stone-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-bold text-stone-800 bg-transparent focus:outline-none"
            />
          </div>

          <button
            onClick={exportToCSV}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={loadReport}
            className="p-2 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-600"
            title="Refrescar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-stone-400 text-sm">
          <div className="animate-spin w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full mx-auto mb-3" />
          Calculando métricas del día...
        </div>
      ) : !report ? (
        <div className="text-center py-12 text-stone-500">Error al cargar datos.</div>
      ) : (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Ventas Totales</span>
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-stone-900">
                ${Number(report.summary.totalRevenue).toFixed(2)}
              </div>
              <div className="text-[11px] text-stone-500 mt-1">
                De {report.summary.paidOrdersCount} pedidos pagados
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Pedidos Totales</span>
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-stone-900">
                {report.summary.totalOrders}
              </div>
              <div className="text-[11px] text-stone-500 mt-1">
                {report.summary.completedOrders} entregados · {report.summary.pendingOrders} en proceso
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Ticket Promedio</span>
                <div className="p-2 rounded-xl bg-blue-100 text-blue-800">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-stone-900">
                ${Number(report.summary.averageTicket).toFixed(2)}
              </div>
              <div className="text-[11px] text-stone-500 mt-1">
                Promedio por cliente
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Modalidad</span>
                <div className="p-2 rounded-xl bg-purple-100 text-purple-800">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline space-x-3">
                <span className="text-xl font-black text-stone-900">{report.orderTypes.en_local} Local</span>
                <span className="text-stone-400 font-bold">/</span>
                <span className="text-xl font-black text-stone-900">{report.orderTypes.para_llevar} Llevar</span>
              </div>
              <div className="text-[11px] text-stone-500 mt-1">
                Distribución de consumo
              </div>
            </div>
          </div>

          {/* Payment Methods & Hourly Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Methods Breakdown */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
              <h3 className="font-bold text-sm text-stone-900 mb-4">
                Ventas por Método de Pago
              </h3>
              <div className="space-y-4">
                {[
                  { key: 'efectivo', label: 'Efectivo', icon: Banknote, color: 'bg-emerald-500', data: report.paymentMethods.efectivo },
                  { key: 'tarjeta', label: 'Tarjeta (Débito/Crédito)', icon: CreditCard, color: 'bg-blue-500', data: report.paymentMethods.tarjeta },
                  { key: 'transferencia', label: 'Transferencia / SPEI', icon: QrCode, color: 'bg-purple-500', data: report.paymentMethods.transferencia }
                ].map(item => {
                  const Icon = item.icon;
                  const totalRev = report.summary.totalRevenue || 1;
                  const pct = Math.round((item.data.total / totalRev) * 100);
                  return (
                    <div key={item.key} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <Icon className="w-4 h-4 text-stone-500" />
                          <span className="font-semibold text-stone-800">{item.label}</span>
                          <span className="text-stone-400">({item.data.count} pedidos)</span>
                        </div>
                        <span className="font-black text-stone-900">${Number(item.data.total).toFixed(2)} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
                        <div
                          className={`h-full ${item.color} rounded-full transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Products Ranking */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
              <h3 className="font-bold text-sm text-stone-900 mb-4">
                Top Productos Más Vendidos
              </h3>
              {report.topProducts.length === 0 ? (
                <p className="text-center text-stone-400 text-xs py-10">No hay ventas registradas aún hoy.</p>
              ) : (
                <div className="space-y-2.5">
                  {report.topProducts.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-stone-50 text-xs">
                      <div className="flex items-center space-x-2.5">
                        <span className="w-5 h-5 rounded-full bg-amber-600 text-white font-bold text-[10px] flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-stone-800">{p.name}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-stone-500 font-semibold">{p.quantity} uds</span>
                        <span className="font-black text-stone-900 w-16 text-right">${Number(p.revenue).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
