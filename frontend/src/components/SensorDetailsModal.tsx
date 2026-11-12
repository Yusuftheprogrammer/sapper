'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { SensorHistoryPoint } from '@/types';
import {
  X,
  Thermometer,
  Activity,
  Flame,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { getApiUrl } from '@/lib/socket';

interface SensorDetailsModalProps {
  sensorId: number | null;
  currentTemp?: number;
  currentStatus?: number;
  onClose: () => void;
  onTriggerZoneHeatwave: (zone: number) => void;
}

export const SensorDetailsModal: React.FC<SensorDetailsModalProps> = ({
  sensorId,
  currentTemp,
  currentStatus,
  onClose,
  onTriggerZoneHeatwave,
}) => {
  const [history, setHistory] = useState<SensorHistoryPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [hoveredPoint, setHoveredPoint] = useState<SensorHistoryPoint | null>(null);

  const zone = sensorId !== null ? sensorId % 10 : 0;

  useEffect(() => {
    if (sensorId === null) return;
    setLoading(true);
    let isMounted = true;

    fetch(`${getApiUrl()}/sensors/${sensorId}/history?minutes=5`)
      .then((res) => res.json())
      .then((json: any) => {
        if (!isMounted) return;
        // Backend returns array of { ts, temp }
        if (Array.isArray(json)) {
          setHistory(json);
        } else if (json && Array.isArray(json.history)) {
          setHistory(json.history);
        } else {
          setHistory([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch sensor history:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [sensorId]);

  // Compute SVG Line Chart coordinates and stats
  const chartMetrics = useMemo(() => {
    if (!history || history.length === 0) {
      return null;
    }

    const temps = history.map((p) => p.temp);
    const minTemp = Math.floor(Math.min(...temps, 15) - 2);
    const maxTemp = Math.ceil(Math.max(...temps, 40) + 4);
    const tempRange = Math.max(1, maxTemp - minTemp);

    const width = 640;
    const height = 210;
    const padding = { top: 20, right: 25, bottom: 35, left: 45 };

    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const points = history.map((p, idx) => {
      const x = padding.left + (idx / Math.max(1, history.length - 1)) * chartW;
      const y = padding.top + chartH - ((p.temp - minTemp) / tempRange) * chartH;
      return { x, y, point: p };
    });

    const pathD = points.reduce((acc, curr, idx) => {
      return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
    }, '');

    const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${
      padding.top + chartH
    } Z`;

    const avg = temps.reduce((a, b) => a + b, 0) / temps.length;

    return {
      width,
      height,
      padding,
      points,
      pathD,
      areaD,
      minTemp,
      maxTemp,
      avg: avg.toFixed(1),
      max: Math.max(...temps).toFixed(1),
      min: Math.min(...temps).toFixed(1),
    };
  }, [history]);

  if (sensorId === null) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-card border border-cardBorder rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative">
        {/* Header */}
        <div className="px-6 py-4 border-b border-cardBorder bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <Thermometer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-mono">
                  Sensor #{sensorId} Telemetry
                </h3>
                <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
                  Zone {zone}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                5-Minute Historical Timeseries (1 point / 5s)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 font-mono gap-2">
              <Activity className="w-8 h-8 text-cyan-400 animate-spin" />
              <span className="text-sm">Fetching 5-minute historical buffers...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 font-mono">
              <AlertCircle className="w-8 h-8 text-rose-400 mb-2" />
              <span>No history data recorded yet for Sensor #{sensorId}</span>
            </div>
          ) : (
            <>
              {/* Telemetry Summary Cards */}
              <div className="grid grid-cols-4 gap-3 font-mono">
                <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-2.5">
                  <span className="text-[10px] text-slate-400 block uppercase">Current</span>
                  <span
                    className={`text-lg font-bold ${
                      currentStatus === 2
                        ? 'text-red-400'
                        : currentStatus === 1
                        ? 'text-amber-400'
                        : currentStatus === 3
                        ? 'text-slate-500'
                        : 'text-emerald-400'
                    }`}
                  >
                    {currentStatus === 3 ? 'OFF' : `${currentTemp?.toFixed(1) ?? '--'}°C`}
                  </span>
                </div>

                <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-2.5">
                  <span className="text-[10px] text-slate-400 block uppercase">Peak (5m)</span>
                  <span className="text-lg font-bold text-red-400">
                    {chartMetrics?.max || '--'}°C
                  </span>
                </div>

                <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-2.5">
                  <span className="text-[10px] text-slate-400 block uppercase">Min (5m)</span>
                  <span className="text-lg font-bold text-emerald-400">
                    {chartMetrics?.min || '--'}°C
                  </span>
                </div>

                <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-2.5">
                  <span className="text-[10px] text-slate-400 block uppercase">Average</span>
                  <span className="text-lg font-bold text-cyan-400">
                    {chartMetrics?.avg || '--'}°C
                  </span>
                </div>
              </div>

              {/* 5-Min Interactive SVG Line Chart */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 relative">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono px-2 mb-1">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Temperature Trendline (Last 5 Minutes)</span>
                  </div>
                  {hoveredPoint && (
                    <span className="text-cyan-300 font-semibold">
                      {hoveredPoint.temp.toFixed(2)}°C @{' '}
                      {new Date(hoveredPoint.ts).toLocaleTimeString()}
                    </span>
                  )}
                </div>

                {chartMetrics && (
                  <svg
                    viewBox={`0 0 ${chartMetrics.width} ${chartMetrics.height}`}
                    className="w-full h-auto overflow-visible"
                  >
                    <defs>
                      <linearGradient id="tempGradientV2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.45" />
                        <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="strokeGradientV2" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="60%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#ef4444" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                      const y =
                        chartMetrics.padding.top +
                        (chartMetrics.height -
                          chartMetrics.padding.top -
                          chartMetrics.padding.bottom) *
                          pct;
                      const val = (
                        chartMetrics.maxTemp -
                        pct * (chartMetrics.maxTemp - chartMetrics.minTemp)
                      ).toFixed(0);
                      return (
                        <g key={i}>
                          <line
                            x1={chartMetrics.padding.left}
                            y1={y}
                            x2={chartMetrics.width - chartMetrics.padding.right}
                            y2={y}
                            stroke="#1e293b"
                            strokeDasharray="3 3"
                          />
                          <text
                            x={chartMetrics.padding.left - 8}
                            y={y + 4}
                            textAnchor="end"
                            fontSize="10"
                            fill="#64748b"
                            fontFamily="monospace"
                          >
                            {val}°
                          </text>
                        </g>
                      );
                    })}

                    {/* Area under curve */}
                    <path d={chartMetrics.areaD} fill="url(#tempGradientV2)" />

                    {/* Line Stroke */}
                    <path
                      d={chartMetrics.pathD}
                      fill="none"
                      stroke="url(#strokeGradientV2)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />

                    {/* Data Points on Hover */}
                    {chartMetrics.points.map((pt, i) => (
                      <circle
                        key={i}
                        cx={pt.x}
                        cy={pt.y}
                        r={hoveredPoint === pt.point ? 5 : 2}
                        className="transition-all cursor-pointer"
                        fill={
                          pt.point.temp >= 70
                            ? '#ef4444'
                            : pt.point.temp >= 55
                            ? '#f59e0b'
                            : '#10b981'
                        }
                        stroke="#fff"
                        strokeWidth={hoveredPoint === pt.point ? 2 : 0}
                        onMouseEnter={() => setHoveredPoint(pt.point)}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                    ))}
                  </svg>
                )}

                <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1 px-4">
                  <span>-5 minutes</span>
                  <span>-2.5 min</span>
                  <span>Now</span>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => onTriggerZoneHeatwave(zone)}
                  className="px-3.5 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/35 border border-red-500/40 text-red-300 text-xs font-mono font-semibold transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <Flame className="w-4 h-4 text-red-400" />
                  <span>Induce Heatwave on Zone {zone}</span>
                </button>

                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors"
                >
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
