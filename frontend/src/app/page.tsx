'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Header } from '@/components/Header';
import { StatsPanel } from '@/components/StatsPanel';
import { HeatmapCanvas } from '@/components/HeatmapCanvas';
import { AlertsFeed } from '@/components/AlertsFeed';
import { ControlPanel } from '@/components/ControlPanel';
import { SensorDetailsModal } from '@/components/SensorDetailsModal';
import { getSocket, getApiUrl } from '@/lib/socket';
import { SnapshotData, AlertItem, SystemStats, ConnectionStatus } from '@/types';

export default function DashboardPage() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [selectedSensorId, setSelectedSensorId] = useState<number | null>(null);
  const [totalSensors, setTotalSensors] = useState<number>(1000);
  const [overheatPulse, setOverheatPulse] = useState<boolean>(false);

  // High-performance snapshot buffer stored in ref to decouple canvas 60fps loop from React re-render cycle
  const snapshotRef = useRef<SnapshotData>({
    ts: Date.now(),
    temps: Array.from({ length: 1000 }, (_, i) => 22 + (i % 10) * 0.5),
    status: new Array(1000).fill(0),
  });

  // Task 3: Load GET /alerts?limit=50 once on page load
  useEffect(() => {
    fetch(`${getApiUrl()}/alerts?limit=50`)
      .then((res) => res.json())
      .then((data: any) => {
        if (Array.isArray(data)) {
          setAlerts(data);
        }
      })
      .catch((err) => {
        console.warn('Initial alerts fetch pending or empty:', err);
      });
  }, []);

  // Connect to Socket.IO backend and register listeners for snapshot, alerts, and stats
  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => {
      console.log('[HeatGuard] Connected to backend on', getApiUrl());
      setConnectionStatus('connected');
    };

    const onDisconnect = () => {
      console.log('[HeatGuard] Disconnected from backend');
      setConnectionStatus('disconnected');
    };

    const onConnectError = (err: any) => {
      console.warn('[HeatGuard] Connection error:', err.message);
      setConnectionStatus('disconnected');
    };

    // 1. snapshot (once per second)
    const onSnapshot = (incomingSnapshot: SnapshotData) => {
      if (incomingSnapshot && Array.isArray(incomingSnapshot.temps)) {
        snapshotRef.current = incomingSnapshot;
        if (incomingSnapshot.temps.length !== totalSensors) {
          setTotalSensors(incomingSnapshot.temps.length);
        }
      }
    };

    // 2. alerts (batched array, at most once per second)
    const onAlerts = (incomingAlerts: AlertItem[]) => {
      if (Array.isArray(incomingAlerts) && incomingAlerts.length > 0) {
        console.log(`[HeatGuard] Received ${incomingAlerts.length} alert(s)`);
        // Check for overheat alerts to trigger UI pulse effect
        const hasOverheat = incomingAlerts.some((a) => a.type === 'overheat');
        if (hasOverheat) {
          setOverheatPulse(true);
          setTimeout(() => setOverheatPulse(false), 2500);
        }

        // Prepend new alerts and keep only newest ~50 in feed
        setAlerts((prev) => [...incomingAlerts, ...prev].slice(0, 50));
      }
    };

    // 3. stats (once per second)
    const onStats = (incomingStats: SystemStats) => {
      if (incomingStats) {
        setStats(incomingStats);
        if (incomingStats.total && incomingStats.total !== totalSensors) {
          setTotalSensors(incomingStats.total);
        }
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('snapshot', onSnapshot);
    socket.on('alerts', onAlerts);
    socket.on('stats', onStats);

    if (socket.connected) {
      setConnectionStatus('connected');
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('snapshot', onSnapshot);
      socket.off('alerts', onAlerts);
      socket.off('stats', onStats);
    };
  }, [totalSensors]);

  const handleSelectSensor = useCallback((id: number) => {
    setSelectedSensorId(id);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedSensorId(null);
  }, []);

  const handleClearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  const handleTriggerZoneHeatwave = useCallback(async (zone: number) => {
    try {
      await fetch(`${getApiUrl()}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cmd: 'heatwave', zone, delta: 55 }),
      });
    } catch (err) {
      console.error('Heatwave trigger error:', err);
    }
  }, []);

  // Compute active overheat count from current snapshot for header badge
  const activeOverheatCount = snapshotRef.current.status.filter((s) => s === 2).length;

  return (
    <div className={`flex flex-col min-h-screen transition-colors duration-700 ${overheatPulse ? 'ring-2 ring-red-500/50' : ''}`}>
      {/* Top Header */}
      <Header
        status={connectionStatus}
        totalSensors={totalSensors}
        criticalCount={activeOverheatCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 max-w-[1720px] mx-auto w-full space-y-5">
        {/* Row 1: System Telemetry Stats */}
        <StatsPanel stats={stats} />

        {/* Row 2: Heatmap Matrix (Left 75%) & Live Alerts Feed (Right 25%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 xl:col-span-9 h-[520px]">
            <HeatmapCanvas
              snapshotRef={snapshotRef}
              onSelectSensor={handleSelectSensor}
              selectedSensorId={selectedSensorId}
              totalSensors={totalSensors}
            />
          </div>

          <div className="lg:col-span-4 xl:col-span-3 h-[520px]">
            <AlertsFeed
              alerts={alerts}
              onSelectSensor={handleSelectSensor}
              onClearAlerts={handleClearAlerts}
            />
          </div>
        </div>

        {/* Row 3: Backend Simulation Controls */}
        <ControlPanel totalSensors={totalSensors} />
      </main>

      {/* Sensor 5-Min History Modal */}
      {selectedSensorId !== null && (
        <SensorDetailsModal
          sensorId={selectedSensorId}
          currentTemp={snapshotRef.current.temps[selectedSensorId]}
          currentStatus={snapshotRef.current.status[selectedSensorId]}
          onClose={handleCloseModal}
          onTriggerZoneHeatwave={handleTriggerZoneHeatwave}
        />
      )}

      {/* Footer */}
      <footer className="py-3 px-6 border-t border-cardBorder text-center text-xs text-slate-500 font-mono">
        HeatGuard v2 • NestJS &times; MQTT &times; TimescaleDB &times; Next.js Realtime Matrix
      </footer>
    </div>
  );
}
