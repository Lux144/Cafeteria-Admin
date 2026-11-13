import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [latestEvent, setLatestEvent] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioCtxRef = useRef(null);

  // Play pleasant coffee bell chime via Web Audio API (zero audio file dependencies)
  const playChime = (tone = 'bell') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      if (tone === 'ready') {
        // High double ding for "Listo"
        osc.frequency.setValueAtTime(880, now); // A5
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.15); // E6
      } else {
        // Classic pleasant bell (C6)
        osc.frequency.setValueAtTime(1046.5, now);
        osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.3);
      }

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.6);
    } catch (e) {
      console.warn('Audio chime note:', e);
    }
  };

  useEffect(() => {
    // Socket connects to port 4004 (or proxied via Vite / Gateway)
    const socketInstance = io(window.location.origin, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      console.log('[WebSocket] Conectado al servicio de notificaciones con ID:', socketInstance.id);

      // Join rooms according to user
      if (user) {
        socketInstance.emit('join', {
          role: user.role,
          customerId: user.id
        });
      }
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    // Listen to real-time events
    socketInstance.on('kitchen:new_order', (data) => {
      setLatestEvent({ type: 'new_order', data });
      playChime('bell');
    });

    socketInstance.on('order:status_updated', (data) => {
      setLatestEvent({ type: 'status_updated', data });
    });

    socketInstance.on('order:ready', (data) => {
      setLatestEvent({ type: 'ready', data });
      playChime('ready');
    });

    socketInstance.on('cashier:order_paid', (data) => {
      setLatestEvent({ type: 'paid', data });
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Re-emit join when user changes
  useEffect(() => {
    if (socket && isConnected && user) {
      socket.emit('join', {
        role: user.role,
        customerId: user.id
      });
    }
  }, [user, socket, isConnected]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        latestEvent,
        playChime,
        soundEnabled,
        toggleSound: () => setSoundEnabled(prev => !prev)
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
