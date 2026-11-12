'use client';

import React, { useState } from 'react';
import { AlertItem, AlertType } from '@/types';
import { ShieldAlert, TrendingUp, PowerOff, Bell, Trash2, ExternalLink } from 'lucide-react';

interface AlertsFeedProps {
  alerts: AlertItem[];
  onSelectSensor: (sensorId: number) => void;
  onClearAlerts: () => void;
}

export const AlertsFeed: React.FC<AlertsFeedProps> = ({
  alerts,
  onSelectSensor,
  onClearAlerts,
}) => {
  const [filter, setFilter] = useState<'all' | 'overheat' | 'rapid_rise' | 'offline'>('all');

  const filteredAlerts = alerts.filter((a) => {
    if (filter === 'all') return true;
    return a.type === filter;
  });

  const getAlertBadge = (type: AlertType) => {
    switch (type) {
      case 'overheat':
        return {
          icon: <ShieldAlert className="w-3.5 h-3.5 text-red-400" />,
          label: 'OVERHEAT',
          border: 'border-red-500/40',
          bg: 'bg-red-950/20 hover:bg-red-950/40',
          text: 'text-red-400',
          pulse: true,
        };
      case 'rapid_rise':
        return {
          icon: <TrendingUp className="w-3.5 h-3.5 text-amber-400 animate-bounce" />,
          label: 'RAPID RISE',
          border: 'border-amber-500/40',
          bg: 'bg-amber-950/20 hover:bg-amber-950/40',
          text: 'text-amber-400',
          pulse: false,
        };
      case 'offline':
        return {
          icon: <PowerOff className="w-3.5 h-3.5 text-slate-400" />,
          label: 'OFFLINE',
          border: 'border-slate-700',
          bg: 'bg-slate-900/40 hover:bg-slate-900/60',
          text: 'text-slate-400',
          pulse: false,
        };
      default:
        return {
          icon: <Bell className="w-3.5 h-3.5 text-cyan-400" />,
          label: 'ANOMALY',
          border: 'border-cyan-500/30',
          bg: 'bg-cyan-950/20 hover:bg-cyan-950/40',
          text: 'text-cyan-400',
          pulse: false,
        };
    }
  };

  return (
    <div className="flex flex-col h-full bg-card/70 border border-cardBorder rounded-xl overflow-hidden shadow-xl backdrop-blur-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-cardBorder bg-slate-900/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
            Incident Stream ({alerts.length})
          </h3>
        </div>

        {/* Filter & Clear Controls */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-slate-950/70 p-0.5 rounded border border-slate-800 text-[10px] font-mono">
            <button
              onClick={() => setFilter('all')}
              className={`px-2 py-0.5 rounded ${
                filter === 'all' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('overheat')}
              className={`px-1.5 py-0.5 rounded ${
                filter === 'overheat' ? 'bg-red-500/30 text-red-300 font-semibold' : 'text-slate-400'
              }`}
            >
              Heat
            </button>
            <button
              onClick={() => setFilter('rapid_rise')}
              className={`px-1.5 py-0.5 rounded ${
                filter === 'rapid_rise' ? 'bg-amber-500/30 text-amber-300 font-semibold' : 'text-slate-400'
              }`}
            >
              Rise
            </button>
            <button
              onClick={() => setFilter('offline')}
              className={`px-1.5 py-0.5 rounded ${
                filter === 'offline' ? 'bg-slate-700/50 text-slate-200 font-semibold' : 'text-slate-400'
              }`}
            >
              Off
            </button>
          </div>

          <button
            onClick={onClearAlerts}
            title="Clear list"
            className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Alerts Scrollable List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[460px] divide-y divide-slate-800/40">
        {filteredAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-slate-500 p-4">
            <ShieldAlert className="w-8 h-8 text-slate-600 mb-2 stroke-[1.5]" />
            <p className="text-xs font-mono">No active incidents.</p>
            <p className="text-[10px] text-slate-600 mt-0.5">Sensors are operating within baseline thresholds.</p>
          </div>
        ) : (
          filteredAlerts.slice(0, 50).map((alert, index) => {
            const badge = getAlertBadge(alert.type);
            const timeStr = new Date(alert.ts).toLocaleTimeString();

            return (
              <div
                key={`${alert.id}-${index}`}
                onClick={() => onSelectSensor(alert.sensorId)}
                className={`pt-2 first:pt-0 group cursor-pointer p-2 rounded-lg transition-all border ${badge.border} ${badge.bg}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="p-1 rounded bg-black/40">
                      {badge.icon}
                    </span>
                    <span className="text-xs font-bold font-mono text-slate-200">
                      Sensor #{alert.sensorId}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-slate-800 text-slate-300">
                      Zone {alert.zone}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold uppercase ${badge.text} bg-black/40`}>
                      {badge.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                    <span>{timeStr}</span>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-cyan-400" />
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between text-xs font-mono">
                  <span className={`${badge.text} font-bold`}>
                    {alert.type === 'rapid_rise'
                      ? `Surge: +${alert.value.toFixed(1)}°C rise`
                      : alert.type === 'overheat'
                      ? `Critical: ${alert.value.toFixed(1)}°C`
                      : `Signal lost (${alert.value.toFixed(1)}°C)`}
                  </span>
                  <span className="text-cyan-400/80 group-hover:underline text-[10px]">
                    Inspect node &rarr;
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
