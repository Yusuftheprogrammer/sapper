'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { SnapshotData } from '@/types';
import { Layers, ZoomIn, Eye } from 'lucide-react';

interface HeatmapCanvasProps {
  snapshotRef: React.MutableRefObject<SnapshotData>;
  onSelectSensor: (sensorId: number) => void;
  selectedSensorId: number | null;
  totalSensors: number;
}

interface HoveredSensorInfo {
  x: number;
  y: number;
  sensorId: number;
  zone: number;
  temp: number;
  status: number;
}

export const HeatmapCanvas: React.FC<HeatmapCanvasProps> = ({
  snapshotRef,
  onSelectSensor,
  selectedSensorId,
  totalSensors,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredInfo, setHoveredInfo] = useState<HoveredSensorInfo | null>(null);
  const [viewFilter, setViewFilter] = useState<'all' | 'overheat' | 'warning' | 'offline'>('all');
  const [activeZoneFilter, setActiveZoneFilter] = useState<number | null>(null);

  // Layout metrics calculated dynamically
  const gridMetricsRef = useRef({
    cols: 50,
    rows: 20,
    cellW: 10,
    cellH: 10,
    gap: 1.5,
    width: 800,
    height: 400,
  });

  // Calculate optimal grid columns & rows based on sensor count and canvas aspect ratio
  const computeGrid = useCallback((count: number, width: number, height: number) => {
    if (count <= 0 || width <= 0 || height <= 0) return;
    const aspect = width / height;
    let cols = Math.ceil(Math.sqrt(count * aspect));
    cols = Math.max(10, Math.min(cols, 150));
    const rows = Math.ceil(count / cols);

    const gap = count > 5000 ? 0.5 : count > 2000 ? 1 : 1.5;
    const totalGapW = (cols - 1) * gap;
    const totalGapH = (rows - 1) * gap;

    const cellW = (width - totalGapW) / cols;
    const cellH = (height - totalGapH) / rows;

    gridMetricsRef.current = {
      cols,
      rows,
      cellW,
      cellH,
      gap,
      width,
      height,
    };
  }, []);

  // Set up resize observer to keep canvas sharp and responsive
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const handleResize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.floor(rect.width);
      const h = Math.max(380, Math.floor(rect.height || 420));

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }

      computeGrid(totalSensors, w, h);
    };

    handleResize();
    const observer = new ResizeObserver(handleResize);
    observer.observe(container);

    return () => observer.disconnect();
  }, [totalSensors, computeGrid]);

  // High performance 60FPS Render Loop via requestAnimationFrame
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const { cols, cellW, cellH, gap, width, height } = gridMetricsRef.current;
      const { temps, status } = snapshotRef.current;
      const count = temps.length;

      ctx.clearRect(0, 0, width, height);

      const now = performance.now();
      const pulseFactor = 0.65 + 0.35 * Math.sin(now * 0.008);

      for (let i = 0; i < count; i++) {
        const s = status[i] ?? 0;
        const temp = temps[i] ?? 22.0;
        const zone = i % 10;

        // Apply filters
        if (viewFilter === 'overheat' && s !== 2) continue;
        if (viewFilter === 'warning' && s !== 1) continue;
        if (viewFilter === 'offline' && s !== 3) continue;
        if (activeZoneFilter !== null && zone !== activeZoneFilter) continue;

        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = col * (cellW + gap);
        const y = row * (cellH + gap);

        // Status mapping:
        // 0: ok -> green / blue-green scale by temperature
        // 1: warning -> yellow / orange
        // 2: overheat -> red (pulsing)
        // 3: offline -> gray
        let fillStyle = '#10b981';

        if (s === 3) {
          fillStyle = '#475569'; // Muted offline gray
        } else if (s === 2) {
          fillStyle = `rgba(239, 68, 68, ${pulseFactor})`; // Pulsing Red Overheat
        } else if (s === 1) {
          fillStyle = '#f59e0b'; // Amber / Orange Warning
        } else {
          // Dynamic scale from cool blue-green (20°C) to vibrant emerald (50°C)
          const norm = Math.max(0, Math.min(1, (temp - 20) / 30));
          const r = Math.floor(16 + norm * 100);
          const g = Math.floor(185 - norm * 35);
          const b = Math.floor(145 - norm * 80);
          fillStyle = `rgb(${r}, ${g}, ${b})`;
        }

        ctx.fillStyle = fillStyle;
        ctx.fillRect(x, y, cellW, cellH);

        // Highlight selected sensor
        if (selectedSensorId === i) {
          ctx.strokeStyle = '#00f2fe';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(x - 1, y - 1, cellW + 2, cellH + 2);
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [snapshotRef, selectedSensorId, viewFilter, activeZoneFilter]);

  // Handle Mouse Hover with O(1) mathematical grid index resolution
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const { cols, rows, cellW, cellH, gap } = gridMetricsRef.current;
    const stepX = cellW + gap;
    const stepY = cellH + gap;

    const col = Math.floor(clientX / stepX);
    const row = Math.floor(clientY / stepY);

    if (col >= 0 && col < cols && row >= 0 && row < rows) {
      const idx = row * cols + col;
      const { temps, status } = snapshotRef.current;
      if (idx < temps.length) {
        setHoveredInfo({
          x: e.clientX,
          y: e.clientY,
          sensorId: idx,
          zone: idx % 10,
          temp: temps[idx],
          status: status[idx] ?? 0,
        });
        return;
      }
    }
    setHoveredInfo(null);
  };

  const handleMouseLeave = () => {
    setHoveredInfo(null);
  };

  // Handle Click selection
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const { cols, rows, cellW, cellH, gap } = gridMetricsRef.current;
    const col = Math.floor(clientX / (cellW + gap));
    const row = Math.floor(clientY / (cellH + gap));

    if (col >= 0 && col < cols && row >= 0 && row < rows) {
      const idx = row * cols + col;
      if (idx < snapshotRef.current.temps.length) {
        onSelectSensor(idx);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-card/70 border border-cardBorder rounded-xl overflow-hidden shadow-xl backdrop-blur-sm">
      {/* Heatmap Top Bar with Filters */}
      <div className="px-5 py-3 border-b border-cardBorder bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 font-mono">
            Sensor Matrix Heatmap ({totalSensors.toLocaleString()} Nodes)
          </h2>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center bg-slate-950/70 p-1 rounded-lg border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setViewFilter('all')}
              className={`px-2.5 py-1 rounded transition-colors ${
                viewFilter === 'all' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setViewFilter('overheat')}
              className={`px-2.5 py-1 rounded transition-colors ${
                viewFilter === 'overheat' ? 'bg-red-500/30 text-red-300 font-semibold' : 'text-slate-400 hover:text-red-400'
              }`}
            >
              Overheat
            </button>
            <button
              onClick={() => setViewFilter('warning')}
              className={`px-2.5 py-1 rounded transition-colors ${
                viewFilter === 'warning' ? 'bg-amber-500/30 text-amber-300 font-semibold' : 'text-slate-400 hover:text-amber-400'
              }`}
            >
              Warning
            </button>
            <button
              onClick={() => setViewFilter('offline')}
              className={`px-2.5 py-1 rounded transition-colors ${
                viewFilter === 'offline' ? 'bg-slate-700/50 text-slate-200 font-semibold' : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Offline
            </button>
          </div>

          {/* Zone Filter */}
          <div className="flex items-center gap-1 bg-slate-950/70 px-2 py-1 rounded-lg border border-slate-800 text-xs font-mono">
            <span className="text-slate-500 mr-1">Zone:</span>
            <select
              value={activeZoneFilter ?? ''}
              onChange={(e) => setActiveZoneFilter(e.target.value === '' ? null : parseInt(e.target.value, 10))}
              className="bg-transparent text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-slate-900 text-slate-200">All Zones (0-9)</option>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((z) => (
                <option key={z} value={z} className="bg-slate-900 text-slate-200">
                  Zone {z}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Canvas Container */}
      <div
        ref={containerRef}
        className="relative flex-1 min-h-[380px] w-full p-3 bg-slate-950/90 flex items-center justify-center overflow-hidden cursor-crosshair"
      >
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          className="rounded shadow-inner"
        />

        {/* Legend Overlay */}
        <div className="absolute bottom-4 left-5 bg-slate-900/85 backdrop-blur-md px-3.5 py-2 rounded-lg border border-slate-800/80 flex items-center gap-4 text-[11px] font-mono text-slate-300 pointer-events-none shadow-lg">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shadow-sm shadow-emerald-500/50" />
            <span>0 OK</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 shadow-sm shadow-amber-500/50" />
            <span>1 Warning</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-500 animate-pulse shadow-sm shadow-red-500/50" />
            <span>2 Overheat</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-500" />
            <span>3 Offline</span>
          </div>
        </div>

        {/* Instructions */}
        <div className="hidden sm:flex absolute bottom-4 right-5 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800/80 items-center gap-1.5 text-[11px] font-mono text-slate-400 pointer-events-none">
          <ZoomIn className="w-3.5 h-3.5 text-cyan-400" />
          <span>Click sensor to view 5-min history</span>
        </div>
      </div>

      {/* Floating Hover Tooltip */}
      {hoveredInfo && (
        <div
          style={{
            position: 'fixed',
            left: `${hoveredInfo.x + 14}px`,
            top: `${hoveredInfo.y + 14}px`,
            zIndex: 50,
          }}
          className="pointer-events-none bg-slate-900/95 border border-slate-700/80 rounded-lg p-3 shadow-2xl backdrop-blur-md font-mono text-xs text-slate-200 min-w-[190px] animate-fadeIn"
        >
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800">
            <span className="font-bold text-white flex items-center gap-1">
              <Eye className="w-3 h-3 text-cyan-400" /> Sensor #{hoveredInfo.sensorId}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
              Zone {hoveredInfo.zone}
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Temperature:</span>
              <span
                className={`font-bold ${
                  hoveredInfo.status === 2
                    ? 'text-red-400 text-sm'
                    : hoveredInfo.status === 1
                    ? 'text-amber-400'
                    : hoveredInfo.status === 3
                    ? 'text-slate-500'
                    : 'text-emerald-400'
                }`}
              >
                {hoveredInfo.status === 3 ? 'Offline' : `${hoveredInfo.temp.toFixed(1)} °C`}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Status:</span>
              <span
                className={`font-semibold ${
                  hoveredInfo.status === 2
                    ? 'text-red-400'
                    : hoveredInfo.status === 1
                    ? 'text-amber-400'
                    : hoveredInfo.status === 3
                    ? 'text-slate-500'
                    : 'text-emerald-400'
                }`}
              >
                {hoveredInfo.status === 0
                  ? '0 OK'
                  : hoveredInfo.status === 1
                  ? '1 Warning'
                  : hoveredInfo.status === 2
                  ? '2 Overheat'
                  : '3 Offline'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
