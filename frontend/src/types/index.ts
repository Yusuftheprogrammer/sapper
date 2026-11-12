export type SensorStatus = 0 | 1 | 2 | 3;
// 0: ok (green / blue-green scale by temperature)
// 1: warning (yellow / orange)
// 2: overheat (red pulse)
// 3: offline (gray, temp value is meaningless)

export interface SnapshotData {
  ts: number;
  temps: number[];
  status: number[];
}

export type AlertType = 'overheat' | 'rapid_rise' | 'offline' | 'anomaly';

export interface AlertItem {
  id: string;
  sensorId: number;
  zone: number; // 0 to 9
  type: AlertType;
  value: number; // overheat/offline: temperature, rapid_rise: the rise in °C
  ts: number;
}

export interface SystemStats {
  msgPerSec: number;
  latencyMs: number;
  dbWritesPerSec: number; // Stored / sec
  total: number;
  online: number;
  offline: number;
}

export interface SensorHistoryPoint {
  ts: number;
  temp: number;
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';
