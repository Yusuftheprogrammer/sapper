'use client';

import React from 'react';
import { SystemStats } from '@/types';
import {
  Zap,
  Gauge,
  Database,
  RadioTower,
  Activity,
  CheckCircle,
} from 'lucide-react';

interface StatsPanelProps {
  stats: SystemStats | null;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ stats }) => {
  const s = stats || {
    msgPerSec: 0,
    latencyMs: 0,
    dbWritesPerSec: 0,
    total: 1000,
    online: 1000,
    offline: 0,
  };

  const onlinePercent = s.total > 0 ? Math.round((s.online / s.total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {/* 1. msg/sec */}
      <div className="bg-card/75 border border-cardBorder rounded-xl p-3.5 backdrop-blur-sm relative overflow-hidden group hover:border-cyan-500/40 transition-all">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-mono uppercase tracking-wider">Messages</span>
          <Zap className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl sm:text-2xl font-bold font-mono text-cyan-300">
            {s.msgPerSec.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">msg/s</span>
        </div>
        <div className="mt-2 text-[10px] text-slate-400 font-mono flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          <span>Realtime Stream</span>
        </div>
      </div>

      {/* 2. latency */}
      <div className="bg-card/75 border border-cardBorder rounded-xl p-3.5 backdrop-blur-sm relative overflow-hidden group hover:border-emerald-500/40 transition-all">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-mono uppercase tracking-wider">Network Latency</span>
          <Gauge className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span
            className={`text-xl sm:text-2xl font-bold font-mono ${
              s.latencyMs < 50 ? 'text-emerald-400' : s.latencyMs < 100 ? 'text-amber-400' : 'text-red-400'
            }`}
          >
            {s.latencyMs}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">ms</span>
        </div>
        <div className="mt-2 text-[10px] text-slate-400 font-mono flex items-center justify-between">
          <span>Target &lt; 50ms</span>
          <span className="text-emerald-400 font-semibold font-mono">OPTIMAL</span>
        </div>
      </div>

      {/* 3. dbWritesPerSec (labeled stored / sec) */}
      <div className="bg-card/75 border border-cardBorder rounded-xl p-3.5 backdrop-blur-sm relative overflow-hidden group hover:border-purple-500/40 transition-all">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-mono uppercase tracking-wider">Database Storage</span>
          <Database className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl sm:text-2xl font-bold font-mono text-purple-300">
            {s.dbWritesPerSec.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">stored / sec</span>
        </div>
        <div className="mt-2 text-[10px] text-slate-500 font-mono">
          TimescaleDB (1 per 5s)
        </div>
      </div>

      {/* 4. Online vs Offline Nodes */}
      <div className="bg-card/75 border border-cardBorder rounded-xl p-3.5 backdrop-blur-sm relative overflow-hidden group hover:border-blue-500/40 transition-all">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-mono uppercase tracking-wider">Active Nodes</span>
          <RadioTower className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
        </div>
        <div className="flex items-baseline justify-between font-mono">
          <span className="text-xl sm:text-2xl font-bold text-slate-100">
            {s.online.toLocaleString()}
          </span>
          <span className="text-xs text-slate-500">
            / {s.total.toLocaleString()}
          </span>
        </div>
        {/* Progress Bar */}
        <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden flex">
          <div
            className="bg-emerald-500 h-1.5 transition-all duration-500"
            style={{ width: `${onlinePercent}%` }}
          />
          <div
            className="bg-slate-600 h-1.5 transition-all duration-500"
            style={{ width: `${100 - onlinePercent}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-mono mt-1 text-slate-400">
          <span className="text-emerald-400">{s.online} Online</span>
          <span className="text-slate-500">{s.offline} Offline</span>
        </div>
      </div>

      {/* 5. Health Status */}
      <div className="col-span-2 md:col-span-4 lg:col-span-1 bg-card/75 border border-cardBorder rounded-xl p-3.5 backdrop-blur-sm relative overflow-hidden">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-mono uppercase tracking-wider">Mesh Status</span>
          <Activity className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-lg font-bold font-mono text-emerald-400">OPERATIONAL</span>
        </div>
        <div className="mt-2 text-[10px] text-slate-400 font-mono">
          {s.total.toLocaleString()} total units synchronized
        </div>
      </div>
    </div>
  );
};
