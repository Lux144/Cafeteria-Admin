import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const DEMO_ACCOUNTS = [
  { role: 'cliente', name: 'Cliente Demo', email: 'cliente@cafeteria.com', password: 'cliente123', label: 'Cliente (Pide desde web)', icon: '🥐' },
  { role: 'cocina', name: 'Chef Cocina', email: 'cocina@cafeteria.com', password: 'cocina123', label: 'Cocina (KDS en tiempo real)', icon: '👨‍🍳' },
  { role: 'cajero', name: 'Cajero Principal', email: 'cajero@cafeteria.com', password: 'cajero123', label: 'Cajero (Cobro y Reportes)', icon: '💵' },
  { role: 'admin', name: 'Administrador', email: 'admin@cafeteria.com', password: 'admin123', label: 'Admin (Control total & Catálogo)', icon: '👑' }
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('cafe_token');
    const storedUser = localStorage.getItem('cafe_user');
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('cafe_token');
        localStorage.removeItem('cafe_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const data = await api.login(email, password);
    localStorage.setItem('cafe_token', data.token);
    localStorage.setItem('cafe_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const register = async (userData) => {
    const data = await api.register(userData);
    localStorage.setItem('cafe_token', data.token);
    localStorage.setItem('cafe_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const switchDemoAccount = async (role) => {
    const demo = DEMO_ACCOUNTS.find(a => a.role === role);
    if (demo) {
      return await login(demo.email, demo.password);
    }
  };

  const logout = () => {
    localStorage.removeItem('cafe_token');
    localStorage.removeItem('cafe_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, switchDemoAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
