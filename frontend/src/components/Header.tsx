'use client';

import React, { useEffect, useState } from 'react';
import { Flame, ShieldAlert, Activity, Wifi, WifiOff, Clock } from 'lucide-react';
import { ConnectionStatus } from '@/types';

interface HeaderProps {
  status: ConnectionStatus;
  totalSensors: number;
  criticalCount: number;
}

export const Header: React.FC<HeaderProps> = ({ status, totalSensors, criticalCount }) => {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString());
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="border-b border-cardBorder bg-card/90 backdrop-blur-md px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 shadow-lg shadow-black/30">
      {/* Brand & Title */}
      <div className="flex items-center gap-3">
        <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-red-500/20 border border-red-500/30 flex items-center justify-center">
          <Flame className="w-6 h-6 text-red-500 animate-pulse" />
          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-wider uppercase text-white font-mono flex items-center gap-1.5">
              Heat<span className="text-red-500">Guard</span>
            </h1>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
              v2.4 Core
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Realtime Matrix Surveillance System (1,000+ IoT Thermal Nodes)
          </p>
        </div>
      </div>

      {/* Metrics & Status Badges */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Critical Alerts Badge */}
        {criticalCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/40 text-red-400 text-xs font-mono animate-glow-danger">
            <ShieldAlert className="w-4 h-4 text-red-400 animate-bounce" />
            <span className="font-semibold">{criticalCount} CRITICAL ZONES</span>
          </div>
        )}

        {/* Live Clock */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-cardBorder text-slate-300 text-xs font-mono">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{time || '--:--:--'}</span>
        </div>

        {/* Total Nodes Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-cardBorder text-slate-300 text-xs font-mono">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span>{totalSensors.toLocaleString()} Nodes Monitored</span>
        </div>

        {/* Connection Status Badge */}
        <div
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-xs font-mono font-medium transition-all ${
            status === 'connected'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
              : status === 'connecting'
              ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
              : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
          }`}
        >
          {status === 'connected' ? (
            <>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <Wifi className="w-3.5 h-3.5" />
              <span>CONNECTED (Port 3001)</span>
            </>
          ) : status === 'connecting' ? (
            <>
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" />
              <span>CONNECTING...</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <span>DISCONNECTED</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
