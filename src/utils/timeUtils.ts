import { OrderLog } from '../types';

/**
 * Returns current local time string in HH:MM:SS or HH:MM format
 */
export function getCurrentTimeString(includeSeconds = true): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const h = pad(now.getHours());
  const m = pad(now.getMinutes());
  const s = pad(now.getSeconds());
  return includeSeconds ? `${h}:${m}:${s}` : `${h}:${m}`;
}

/**
 * Returns today's date in YYYY-MM-DD format
 */
export function getTodayDateString(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Returns Indonesian day name from date string YYYY-MM-DD
 */
export function getDayName(dateStr: string): string {
  if (!dateStr) return '';
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return days[d.getDay()];
}

/**
 * Calculates duration in minutes (1 decimal place) between two times.
 * Handles midnight rollover (e.g. 23:55 to 00:10).
 * Matches Excel MOD(end - start, 1) * 1440
 */
export function calculateDurationMinutes(startTime?: string, endTime?: string): number | null {
  if (!startTime || !endTime) return null;
  const parseSec = (t: string) => {
    const parts = t.trim().split(':').map(Number);
    if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
    return parts[0] * 3600 + parts[1] * 60 + (parts[2] || 0);
  };

  const startSec = parseSec(startTime);
  const endSec = parseSec(endTime);
  if (startSec === null || endSec === null) return null;

  let diffSec = endSec - startSec;
  if (diffSec < 0) {
    diffSec += 24 * 3600; // Rollover past midnight
  }

  const minutes = diffSec / 60;
  return Math.round(minutes * 10) / 10;
}

/**
 * Formats duration number to "X.X min" or "-" if null
 */
export function formatDuration(val?: number | null): string {
  if (val === undefined || val === null || isNaN(val)) return '-';
  return `${val.toFixed(1)} m`;
}

/**
 * Computes all durations for an order
 */
export function computeOrderDurations(order: Partial<OrderLog>): {
  durasiPesanBayar: number | null;
  durasiGoreng: number | null;
  durasiGeprek: number | null;
  durasiKemas: number | null;
  totalWaktuSistem: number | null;
} {
  const durasiPesanBayar = calculateDurationMinutes(order.mulaiPesan, order.selesaiPesan);
  const durasiGoreng = calculateDurationMinutes(order.mulaiGoreng, order.selesaiGoreng);
  const durasiGeprek = calculateDurationMinutes(order.mulaiGeprek, order.selesaiGeprek);
  
  // Durasi kemas: Mulai Kemas ke Pesanan Siap (atau jika mulaiKemas kosong, Selesai Geprek ke Pesanan Siap)
  const packingStart = order.mulaiKemas || order.selesaiGeprek;
  const durasiKemas = calculateDurationMinutes(packingStart, order.pesananSiap);

  // Total waktu dalam sistem: Waktu Datang ke Pesanan Siap
  const totalWaktuSistem = calculateDurationMinutes(order.waktuDatang, order.pesananSiap);

  return {
    durasiPesanBayar,
    durasiGoreng,
    durasiGeprek,
    durasiKemas,
    totalWaktuSistem,
  };
}

/**
 * Check completeness of order
 */
export function isOrderComplete(order: OrderLog): boolean {
  return !!(
    order.waktuDatang &&
    order.pesananSiap &&
    order.totalWaktuSistem !== null &&
    order.totalWaktuSistem !== undefined
  );
}

