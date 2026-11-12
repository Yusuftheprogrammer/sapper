'use client';

import React, { useState } from 'react';
import {
  Flame,
  PowerOff,
  RefreshCw,
  Sliders,
  RotateCcw,
  Terminal,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { getApiUrl } from '@/lib/socket';

interface ControlPanelProps {
  totalSensors: number;
  onCommandResult?: (msg: string) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  totalSensors,
  onCommandResult,
}) => {
  const [selectedZone, setSelectedZone] = useState<number>(3);
  const [deltaTemp, setDeltaTemp] = useState<number>(55);
  const [killCount, setKillCount] = useState<number>(100);
  const [scaleCount, setScaleCount] = useState<number>(10000);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [lastActionStatus, setLastActionStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const sendControl = async (payload: Record<string, any>, actionKey: string, desc: string) => {
    setLoadingAction(actionKey);
    setLastActionStatus(null);
    try {
      const res = await fetch(`${getApiUrl()}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        const msg = `${desc} successfully sent`;
        setLastActionStatus({ ok: true, msg });
        if (onCommandResult) onCommandResult(msg);
      } else {
        const msg = data.error || data.message || `Failed (${res.status})`;
        setLastActionStatus({ ok: false, msg });
      }
    } catch (err: any) {
      setLastActionStatus({ ok: false, msg: err.message || 'Server connection error' });
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="bg-card/70 border border-cardBorder rounded-xl p-4 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-cardBorder">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
            Backend Simulation Controls (/control)
          </h3>
        </div>
        {lastActionStatus && (
          <div
            className={`flex items-center gap-1.5 text-xs font-mono animate-fadeIn ${
              lastActionStatus.ok ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {lastActionStatus.ok ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            <span className="truncate max-w-[320px]">{lastActionStatus.msg}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* 1. Heatwave Command */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-red-400 text-xs font-mono font-bold mb-1">
              <Flame className="w-4 h-4" />
              <span>Induce Heatwave</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight mb-2.5">
              Rapid rise alerts in ~3s, overheat in ~15s.
            </p>
            <div className="space-y-1.5 mb-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>Zone (0-9):</span>
                <select
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(parseInt(e.target.value, 10))}
                  className="bg-slate-950 border border-slate-800 text-xs font-mono rounded px-2 py-0.5 text-slate-200 focus:outline-none"
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((z) => (
                    <option key={z} value={z}>
                      Zone {z}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>Delta:</span>
                <select
                  value={deltaTemp}
                  onChange={(e) => setDeltaTemp(parseInt(e.target.value, 10))}
                  className="bg-slate-950 border border-slate-800 text-xs font-mono rounded px-2 py-0.5 text-slate-200 focus:outline-none"
                >
                  <option value={35}>+35°C</option>
                  <option value={55}>+55°C</option>
                  <option value={75}>+75°C</option>
                </select>
              </div>
            </div>
          </div>
          <button
            disabled={loadingAction === 'heatwave'}
            onClick={() =>
              sendControl(
                { cmd: 'heatwave', zone: selectedZone, delta: deltaTemp },
                'heatwave',
                `Heatwave on Zone ${selectedZone} (+${deltaTemp}°C)`
              )
            }
            className="w-full py-1.5 px-3 rounded bg-red-600/30 hover:bg-red-600/50 border border-red-500/40 text-red-300 text-xs font-mono font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
          >
            {loadingAction === 'heatwave' ? 'Dispatching...' : 'Trigger Heatwave 🔥'}
          </button>
        </div>

        {/* 2. Kill Sensors */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-slate-300 text-xs font-mono font-bold mb-1">
              <PowerOff className="w-4 h-4 text-rose-400" />
              <span>Kill Sensors</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight mb-2.5">
              Silence N random sensors (offline in ~5s).
            </p>
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mb-2">
              <span>Count:</span>
              <select
                value={killCount}
                onChange={(e) => setKillCount(parseInt(e.target.value, 10))}
                className="bg-slate-950 border border-slate-800 text-xs font-mono rounded px-2 py-0.5 text-slate-200 focus:outline-none"
              >
                <option value={50}>50 Sensors</option>
                <option value={100}>100 Sensors</option>
                <option value={250}>250 Sensors</option>
                <option value={500}>500 Sensors</option>
              </select>
            </div>
          </div>
          <button
            disabled={loadingAction === 'kill'}
            onClick={() =>
              sendControl(
                { cmd: 'kill', count: killCount },
                'kill',
                `Kill ${killCount} sensors`
              )
            }
            className="w-full py-1.5 px-3 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-mono font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 mt-4"
          >
            {loadingAction === 'kill' ? 'Silencing...' : `Silence ${killCount} Nodes`}
          </button>
        </div>

        {/* 3. Revive All Sensors */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-mono font-bold mb-1">
              <RefreshCw className="w-4 h-4" />
              <span>Revive Sensors</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight mb-2.5">
              Bring all silenced sensors back online (&lt;1s).
            </p>
          </div>
          <button
            disabled={loadingAction === 'revive'}
            onClick={() => sendControl({ cmd: 'revive' }, 'revive', 'Revive all sensors')}
            className="w-full py-1.5 px-3 rounded bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 mt-4"
          >
            {loadingAction === 'revive' ? 'Reviving...' : 'Revive All Online ⚡'}
          </button>
        </div>

        {/* 4. Scale Grid (1000 or 10000) */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-mono font-bold mb-1">
              <Sliders className="w-4 h-4" />
              <span>Scale Grid</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight mb-2.5">
              Scale simulator up to 10,000 sensors.
            </p>
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mb-2">
              <span>Target:</span>
              <select
                value={scaleCount}
                onChange={(e) => setScaleCount(parseInt(e.target.value, 10))}
                className="bg-slate-950 border border-slate-800 text-xs font-mono rounded px-2 py-0.5 text-slate-200 focus:outline-none"
              >
                <option value={1000}>1,000 Sensors</option>
                <option value={2500}>2,500 Sensors</option>
                <option value={5000}>5,000 Sensors</option>
                <option value={10000}>10,000 Sensors (Stress)</option>
              </select>
            </div>
          </div>
          <button
            disabled={loadingAction === 'scale'}
            onClick={() =>
              sendControl(
                { cmd: 'scale', count: scaleCount },
                'scale',
                `Scale grid to ${scaleCount} sensors`
              )
            }
            className="w-full py-1.5 px-3 rounded bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 mt-4"
          >
            {loadingAction === 'scale' ? 'Scaling...' : `Scale to ${scaleCount.toLocaleString()}`}
          </button>
        </div>

        {/* 5. System Reset */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-mono font-bold mb-1">
              <RotateCcw className="w-4 h-4" />
              <span>Reset System</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight mb-2.5">
              Clear heatwaves, revive all sensors to calm state.
            </p>
          </div>
          <button
            disabled={loadingAction === 'reset'}
            onClick={() => sendControl({ cmd: 'reset' }, 'reset', 'Reset system')}
            className="w-full py-1.5 px-3 rounded bg-amber-600/20 hover:bg-amber-600/40 border border-amber-500/30 text-amber-300 text-xs font-mono font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 mt-4"
          >
            {loadingAction === 'reset' ? 'Resetting...' : 'Reset Simulation 🔄'}
          </button>
        </div>
      </div>
    </div>
  );
};
