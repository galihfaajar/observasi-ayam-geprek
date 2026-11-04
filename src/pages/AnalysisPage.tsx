import React from 'react';
import { ObservationSession, OrderLog, QueueSnapshot, ResourceLog } from '../types';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Clock,
  Layers,
  Flame,
  CheckCircle2,
  Info,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement } from 'chart.js';

ChartJS.register(ArcElement);

interface AnalysisPageProps {
  session: ObservationSession | null;
  orders: OrderLog[];
  snapshots: QueueSnapshot[];
  resources: ResourceLog[];
}

export const AnalysisPage: React.FC<AnalysisPageProps> = ({
  session,
  orders,
  snapshots,
  resources
}) => {
  // Calculations
  const totalOrders = orders.length;
  const totalPorsi = orders.reduce((sum, o) => sum + (Number(o.jumlahPorsi) || 1), 0);

  const validSystemTimes = orders
    .map((o) => o.totalWaktuSistem)
    .filter((v): v is number => typeof v === 'number' && !isNaN(v));

  const validPesanBayar = orders.map((o) => o.durasiPesanBayar).filter((v): v is number => typeof v === 'number');
  const validGoreng = orders.map((o) => o.durasiGoreng).filter((v): v is number => typeof v === 'number');
  const validGeprek = orders.map((o) => o.durasiGeprek).filter((v): v is number => typeof v === 'number');
  const validKemas = orders.map((o) => o.durasiKemas).filter((v): v is number => typeof v === 'number');

  const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  const max = (arr: number[]) => (arr.length > 0 ? Math.max(...arr) : 0);

  const avgSystemTime = avg(validSystemTimes);
  const maxSystemTime = max(validSystemTimes);

  const avgPesan = avg(validPesanBayar);
  const avgGoreng = avg(validGoreng);
  const avgGeprek = avg(validGeprek);
  const avgKemas = avg(validKemas);

  const waitingCounts = snapshots.map((s) => Number(s.jumlahMenunggu) || 0);
  const avgWaiting = waitingCounts.length > 0 ? avg(waitingCounts) : 0;
  const maxWaiting = waitingCounts.length > 0 ? Math.max(...waitingCounts) : 0;

  // Sufficiency test: needs at least 3 orders with completed system time to perform meaningful statistical modeling
  const isDataSufficient = validSystemTimes.length >= 3;

  // Stages array for bottleneck comparison
  const stages = [
    { name: 'Pesan & Bayar', avg: avgPesan, color: 'rgba(59, 130, 246, 0.85)' },
    { name: 'Penggorengan', avg: avgGoreng, color: 'rgba(249, 115, 22, 0.85)' },
    { name: 'Geprek & Sajikan', avg: avgGeprek, color: 'rgba(234, 179, 8, 0.85)' },
    { name: 'Pengemasan', avg: avgKemas, color: 'rgba(16, 185, 129, 0.85)' }
  ];

  // Identify bottleneck stage
  const bottleneck = [...stages].sort((a, b) => b.avg - a.avg)[0];

  // Stage distribution Chart Data
  const stagesChartData = {
    labels: stages.map((s) => s.name),
    datasets: [
      {
        label: 'Rata-rata Durasi (menit)',
        data: stages.map((s) => Number(s.avg.toFixed(1))),
        backgroundColor: stages.map((s) => s.color),
        borderRadius: 8
      }
    ]
  };

  // Service distribution (Dine-in vs Takeaway)
  const dineInOrders = orders.filter((o) => o.jenisLayanan === 'Dine-in');
  const takeawayOrders = orders.filter((o) => o.jenisLayanan === 'Takeaway');

  const dineInAvgTime = avg(dineInOrders.map((o) => o.totalWaktuSistem).filter((v): v is number => typeof v === 'number'));
  const takeawayAvgTime = avg(takeawayOrders.map((o) => o.totalWaktuSistem).filter((v): v is number => typeof v === 'number'));

  const serviceCompareData = {
    labels: ['Dine-in (Makan di Tempat)', 'Takeaway (Bungkus)'],
    datasets: [
      {
        label: 'Rata-rata Total Waktu Sistem (menit)',
        data: [Number(dineInAvgTime.toFixed(1)), Number(takeawayAvgTime.toFixed(1))],
        backgroundColor: ['rgba(16, 185, 129, 0.8)', 'rgba(249, 115, 22, 0.8)'],
        borderRadius: 8
      }
    ]
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-700" />
            <span>Ringkasan & Analisis Sistem Antrean</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kalkulasi parameter pemodelan sistem (waktu pelayanan, panjang antrean, dan bottleneck)
          </p>
        </div>
        <div>
          {isDataSufficient ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Data Mencukupi untuk Analisis ({validSystemTimes.length} pesanan lengkap)</span>
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Data Belum Mencukupi ({validSystemTimes.length}/3 pesanan lengkap)</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Table Summary (Identical to Sheet Ringkasan in Excel) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Tabel Ringkasan Parameter Pengamatan (Sesuai Sheet Excel)
          </h3>
          <span className="text-xs text-slate-500 font-mono">Formula Otomatis Terhubung</span>
        </div>
        <div className="divide-y divide-slate-100 text-xs sm:text-sm">
          <div className="flex items-center justify-between px-6 py-3 hover:bg-slate-50/60">
            <span className="text-slate-600 font-medium">Jumlah pesanan tercatat</span>
            <span className="font-mono font-bold text-slate-900">{totalOrders} pesanan</span>
          </div>
          <div className="flex items-center justify-between px-6 py-3 hover:bg-slate-50/60">
            <span className="text-slate-600 font-medium">Total porsi tercatat</span>
            <span className="font-mono font-bold text-slate-900">{totalPorsi} porsi</span>
          </div>
          <div className="flex items-center justify-between px-6 py-3 hover:bg-slate-50/60">
            <span className="text-slate-600 font-medium">Rata-rata waktu dalam sistem</span>
            <span className="font-mono font-bold text-blue-900">
              {validSystemTimes.length > 0 ? `${avgSystemTime.toFixed(1)} menit` : '-'}
            </span>
          </div>
          <div className="flex items-center justify-between px-6 py-3 hover:bg-slate-50/60">
            <span className="text-slate-600 font-medium">Waktu dalam sistem terlama</span>
            <span className="font-mono font-bold text-rose-900">
              {validSystemTimes.length > 0 ? `${maxSystemTime.toFixed(1)} menit` : '-'}
            </span>
          </div>
          <div className="flex items-center justify-between px-6 py-3 hover:bg-slate-50/60">
            <span className="text-slate-600 font-medium">Rata-rata durasi pemesanan dan pembayaran</span>
            <span className="font-mono font-bold text-slate-900">
              {validPesanBayar.length > 0 ? `${avgPesan.toFixed(1)} menit` : '-'}
            </span>
          </div>
          <div className="flex items-center justify-between px-6 py-3 hover:bg-slate-50/60">
            <span className="text-slate-600 font-medium">Rata-rata durasi penggorengan</span>
            <span className="font-mono font-bold text-slate-900">
              {validGoreng.length > 0 ? `${avgGoreng.toFixed(1)} menit` : '-'}
            </span>
          </div>
          <div className="flex items-center justify-between px-6 py-3 hover:bg-slate-50/60">
            <span className="text-slate-600 font-medium">Rata-rata durasi geprek dan penyajian</span>
            <span className="font-mono font-bold text-slate-900">
              {validGeprek.length > 0 ? `${avgGeprek.toFixed(1)} menit` : '-'}
            </span>
          </div>
          <div className="flex items-center justify-between px-6 py-3 hover:bg-slate-50/60">
            <span className="text-slate-600 font-medium">Rata-rata durasi pengemasan</span>
            <span className="font-mono font-bold text-slate-900">
              {validKemas.length > 0 ? `${avgKemas.toFixed(1)} menit` : '-'}
            </span>
          </div>
          <div className="flex items-center justify-between px-6 py-3 hover:bg-slate-50/60">
            <span className="text-slate-600 font-medium">Rata-rata pelanggan menunggu per snapshot</span>
            <span className="font-mono font-bold text-slate-900">
              {waitingCounts.length > 0 ? `${avgWaiting.toFixed(1)} orang` : '-'}
            </span>
          </div>
          <div className="flex items-center justify-between px-6 py-3 hover:bg-slate-50/60">
            <span className="text-slate-600 font-medium">Antrean maksimum tercatat</span>
            <span className="font-mono font-bold text-rose-700">
              {waitingCounts.length > 0 ? `${maxWaiting} orang` : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Bottleneck & Charts */}
      {isDataSufficient ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart Tahapan & Bottleneck */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Analisis Durasi Tiap Tahap Pelayanan</h3>
                <p className="text-xs text-slate-500">Mencari tahapan dengan waktu proses paling lama</p>
              </div>
              <span className="p-2 bg-amber-50 text-amber-700 rounded-lg">
                <Flame className="w-4 h-4" />
              </span>
            </div>

            <div className="h-60">
              <Bar
                data={stagesChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: { y: { beginAtZero: true } }
                }}
              />
            </div>

            {/* Bottleneck Insight Box */}
            <div className="bg-blue-50/80 border border-blue-200/70 rounded-xl p-4 text-xs text-slate-700 space-y-1">
              <div className="flex items-center space-x-1.5 font-bold text-blue-900 text-sm">
                <Info className="w-4 h-4 text-blue-700 shrink-0" />
                <span>Indikasi Bottleneck: {bottleneck.name}</span>
              </div>
              <p>
                Berdasarkan data observasi aktual, tahapan{' '}
                <strong className="text-slate-900">{bottleneck.name}</strong> membutuhkan waktu
                terlama dengan rata-rata{' '}
                <strong className="text-blue-900 font-mono">{bottleneck.avg.toFixed(1)} menit</strong>.
                Untuk pemodelan sistem antrean, titik ini merupakan kandidat utama hambatan laju
                layanan (&mu;).
              </p>
            </div>
          </div>

          {/* Dine-in vs Takeaway Comparison */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Perbandingan Dine-in vs Takeaway</h3>
                <p className="text-xs text-slate-500">
                  Total waktu pelanggan dalam sistem berdasarkan jenis pesanan
                </p>
              </div>
              <span className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                <TrendingUp className="w-4 h-4" />
              </span>
            </div>

            <div className="h-60">
              <Bar
                data={serviceCompareData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: { y: { beginAtZero: true } }
                }}
              />
            </div>

            <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-600 space-y-1 border border-slate-200">
              <p>
                • <strong>Dine-in:</strong> {dineInOrders.length} pesanan (Rerata{' '}
                {dineInAvgTime > 0 ? `${dineInAvgTime.toFixed(1)} min` : '-'})
              </p>
              <p>
                • <strong>Takeaway:</strong> {takeawayOrders.length} pesanan (Rerata{' '}
                {takeawayAvgTime > 0 ? `${takeawayAvgTime.toFixed(1)} min` : '-'})
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-12 rounded-2xl border border-amber-200 bg-amber-50/30 text-center space-y-3">
          <ShieldAlert className="w-12 h-12 mx-auto text-amber-500" />
          <h3 className="text-base font-bold text-slate-800">
            Data Belum Cukup untuk Analisis Simulasi
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
            Sistem membutuhkan minimal 3 data pesanan dengan catatan waktu lengkap (waktu datang s/d
            pesanan siap) untuk menghasilkan analisis bottleneck dan parameter antrean yang valid
            secara statistik tanpa asumsi buatan.
          </p>
        </div>
      )}
    </div>
  );
};

