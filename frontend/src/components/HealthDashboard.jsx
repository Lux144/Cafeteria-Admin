import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Server,
  Database,
  Radio,
  Network,
  RefreshCw,
  Cpu
} from 'lucide-react';

export default function HealthDashboard() {
  const [healthData, setHealthData] = useState(null);
  const [latency, setLatency] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState(null);

  const checkHealth = async () => {
    try {
      setLoading(true);
      const start = performance.now();
      const data = await api.getHealth();
      const end = performance.now();
      setLatency(Math.round(end - start));
      setHealthData(data);
      setLastCheck(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Error al consultar health:', err);
      setHealthData({ status: 'unreachable', error: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 8000);
    return () => clearInterval(interval);
  }, []);

  const services = [
    {
      name: 'API Gateway',
      port: 4000,
      protocol: 'REST / Reverse Proxy',
      desc: 'Centraliza enrutamiento, seguridad JWT y correlación de trazas (x-correlation-id)',
      status: healthData?.gateway === 'healthy' ? 'up' : 'down',
      db: null
    },
    {
      name: 'Auth & Users Service',
      port: 4001,
      protocol: 'REST Síncrono',
      desc: 'Gestión de roles (cliente, cocina, cajero, admin) y tokens JWT',
      status: healthData?.services?.auth?.status === 'healthy' ? 'up' : 'down',
      db: 'SQLite (auth.db)'
    },
    {
      name: 'Catalog Service',
      port: 4002,
      protocol: 'REST Síncrono',
      desc: 'CRUD de productos, categorías, precios y disponibilidad',
      status: healthData?.services?.catalog?.status === 'healthy' ? 'up' : 'down',
      db: 'SQLite (catalog.db)'
    },
    {
      name: 'Orders Service',
      port: 4003,
      protocol: 'REST + Eventos',
      desc: 'Ciclo de vida (recibido → preparando → listo → entregado), cobro y reportes',
      status: healthData?.services?.orders?.status === 'healthy' ? 'up' : 'down',
      db: 'SQLite (orders.db)'
    },
    {
      name: 'Notifications Service',
      port: 4004,
      protocol: 'WebSocket / Socket.IO',
      desc: 'Avisos en tiempo real a cocina y cliente tras eventos asíncronos',
      status: healthData?.services?.notifications?.status === 'healthy' ? 'up' : 'down',
      db: 'Event Bus Pub/Sub'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-amber-600 text-white shadow">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif-title text-2xl font-bold text-stone-900">
              Observabilidad & Arquitectura de Microservicios
            </h1>
            <p className="text-stone-500 text-xs">
              Monitoreo centralizado de salud, latencia y patrón Database-per-Service
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {latency !== null && (
            <div className="px-3 py-1.5 rounded-xl bg-white border border-stone-200 text-xs font-semibold text-stone-700 shadow-xs flex items-center space-x-1.5">
              <Cpu className="w-3.5 h-3.5 text-amber-500" />
              <span>Ping Gateway: {latency} ms</span>
            </div>
          )}

          <button
            onClick={checkHealth}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Verificar Ahora</span>
          </button>
        </div>
      </div>

      {/* Global Status Banner */}
      <div className="p-6 rounded-3xl bg-white border border-stone-200 shadow-xs mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className={`w-4 h-4 rounded-full ${
              healthData?.status === 'healthy' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`} />
            <div>
              <h2 className="text-base font-bold text-stone-900">
                Estado Global del Clúster: {healthData?.status === 'healthy' ? '100% Operativo (Healthy)' : 'Degradado / Conectando'}
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Último sondeo: {lastCheck || 'Iniciando...'} · Consulta agregada vía GET /health
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold">
              Database-Per-Service ✓
            </span>
            <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 font-bold">
              Event-Driven Bus ✓
            </span>
          </div>
        </div>
      </div>

      {/* Microservices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
        {services.map((svc, idx) => (
          <div
            key={idx}
            className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-stone-400">
                  Puerto :{svc.port}
                </span>
                <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  svc.status === 'up'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${svc.status === 'up' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <span>{svc.status === 'up' ? 'Online' : 'Inactivo'}</span>
                </span>
              </div>

              <h3 className="font-bold text-stone-900 text-base">{svc.name}</h3>
              <p className="text-stone-500 text-xs mt-1 leading-relaxed">{svc.desc}</p>
            </div>

            <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px]">
              <span className="text-stone-500 font-semibold">{svc.protocol}</span>
              {svc.db && (
                <span className="inline-flex items-center space-x-1 text-stone-700 font-mono bg-stone-100 px-2 py-0.5 rounded">
                  <Database className="w-3 h-3 text-amber-600" />
                  <span>{svc.db}</span>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Architecture diagram card */}
      <div className="bg-gradient-to-br from-stone-900 to-stone-800 text-white p-6 rounded-3xl border border-stone-700 shadow-xl">
        <h3 className="font-serif-title text-lg font-bold text-amber-200 mb-2">
          Diagrama de Comunicación en el Sistema
        </h3>
        <p className="text-stone-300 text-xs mb-4">
          Flujo síncrono para clientes y enrutamiento con API Gateway; flujo asíncrono para eventos de dominio entre servicios:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="bg-stone-800/80 p-4 rounded-xl border border-stone-700">
            <div className="text-amber-400 font-bold mb-1">1. Frontend React</div>
            <div className="text-stone-400 text-[11px]">
              Envía peticiones REST a /api/* hacia el API Gateway e interactúa vía WebSocket con Notifications.
            </div>
          </div>
          <div className="bg-stone-800/80 p-4 rounded-xl border border-stone-700">
            <div className="text-amber-400 font-bold mb-1">2. API Gateway (:4000)</div>
            <div className="text-stone-400 text-[11px]">
              Verifica JWT, inyecta correlation IDs y reenvía síncronamente por REST a Auth, Catálogo y Pedidos.
            </div>
          </div>
          <div className="bg-stone-800/80 p-4 rounded-xl border border-stone-700">
            <div className="text-amber-400 font-bold mb-1">3. Message Bus Asíncrono</div>
            <div className="text-stone-400 text-[11px]">
              Pedidos publica 'order:created' y 'order:ready'; Notifications lo consume y emite por WebSocket a cocina y clientes.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
