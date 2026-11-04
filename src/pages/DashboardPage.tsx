import React from 'react';
import { ObservationSession, OrderLog, QueueSnapshot } from '../types';
import {
  Users,
  ShoppingBag,
  Clock,
  Flame,
  ArrowRight,
  TrendingUp,
  Activity,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { NavTab } from '../components/layout/Sidebar';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DashboardPageProps {
  session: ObservationSession | null;
  orders: OrderLog[];
  snapshots: QueueSnapshot[];
  onNavigate: (tab: NavTab) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  session,
  orders,
  snapshots,
  onNavigate
}) => {
  // Calculations
  const totalOrders = orders.length;
  const totalPortions = orders.reduce((sum, o) => sum + (Number(o.jumlahPorsi) || 1), 0);

  const validSystemTimes = orders
    .map((o) => o.totalWaktuSistem)
    .filter((v): v is number => typeof v === 'number' && !isNaN(v));
  const avgSystemTime =
    validSystemTimes.length > 0
      ? (validSystemTimes.reduce((a, b) => a + b, 0) / validSystemTimes.length).toFixed(1)
      : '-';

  const validPesanBayar = orders.map((o) => o.durasiPesanBayar).filter((v): v is number => typeof v === 'number');
  const validGoreng = orders.map((o) => o.durasiGoreng).filter((v): v is number => typeof v === 'number');
  const validGeprek = orders.map((o) => o.durasiGeprek).filter((v): v is number => typeof v === 'number');
  const validKemas = orders.map((o) => o.durasiKemas).filter((v): v is number => typeof v === 'number');

  const avgPesan = validPesanBayar.length > 0 ? validPesanBayar.reduce((a, b) => a + b, 0) / validPesanBayar.length : 0;
  const avgGoreng = validGoreng.length > 0 ? validGoreng.reduce((a, b) => a + b, 0) / validGoreng.length : 0;
  const avgGeprek = validGeprek.length > 0 ? validGeprek.reduce((a, b) => a + b, 0) / validGeprek.length : 0;
  const avgKemas = validKemas.length > 0 ? validKemas.reduce((a, b) => a + b, 0) / validKemas.length : 0;

  const totalAvgService = (avgPesan + avgGoreng + avgGeprek + avgKemas).toFixed(1);

  const waitingCounts = snapshots.map((s) => Number(s.jumlahMenunggu) || 0);
  const avgWaitingQueue =
    waitingCounts.length > 0
      ? (waitingCounts.reduce((a, b) => a + b, 0) / waitingCounts.length).toFixed(1)
      : '-';
  const maxQueue = waitingCounts.length > 0 ? Math.max(...waitingCounts) : '-';

  // 1. Chart: Customer Arrival by Hour
  const arrivalsByHour: { [hour: string]: number } = {};
  orders.forEach((o) => {
    if (o.waktuDatang) {
      const hour = o.waktuDatang.split(':')[0] + ':00';
      arrivalsByHour[hour] = (arrivalsByHour[hour] || 0) + 1;
    }
  });
  const arrivalHours = Object.keys(arrivalsByHour).sort();
  const arrivalCounts = arrivalHours.map((h) => arrivalsByHour[h]);

  const arrivalChartData = {
    labels: arrivalHours.length > 0 ? arrivalHours : ['Belum ada data'],
    datasets: [
      {
        label: 'Kedatangan Pelanggan (Pesanan)',
        data: arrivalCounts.length > 0 ? arrivalCounts : [0],
        backgroundColor: 'rgba(30, 58, 138, 0.75)',
        borderColor: '#1e3a8a',
        borderWidth: 1.5,
        borderRadius: 6
      }
    ]
  };

  // 2. Chart: Queue Length Over Time (Snapshots)
  const sortedSnapshots = [...snapshots].sort((a, b) => a.waktuPengamatan.localeCompare(b.waktuPengamatan));
  const queueChartData = {
    labels: sortedSnapshots.length > 0 ? sortedSnapshots.map((s) => s.waktuPengamatan) : ['00:00'],
    datasets: [
      {
        label: 'Pelanggan Menunggu (Antrean)',
        data: sortedSnapshots.length > 0 ? sortedSnapshots.map((s) => s.jumlahMenunggu) : [0],
        borderColor: '#dc2626',
        backgroundColor: 'rgba(220, 38, 38, 0.1)',
        fill: true,
        tension: 0.3,
        pointBackgroundColor: '#dc2626'
      },
      {
        label: 'Sedang Dilayani',
        data: sortedSnapshots.length > 0 ? sortedSnapshots.map((s) => s.jumlahDilayani) : [0],
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.05)',
        fill: false,
        tension: 0.3,
        pointBackgroundColor: '#2563eb'
      }
    ]
  };

  // 3. Chart: Service Stages Comparison
  const stagesChartData = {
    labels: ['Pesan & Bayar', 'Penggorengan', 'Geprek & Sajikan', 'Pengemasan'],
    datasets: [
      {
        label: 'Rata-rata Durasi (menit)',
        data: [
          Number(avgPesan.toFixed(1)),
          Number(avgGoreng.toFixed(1)),
          Number(avgGeprek.toFixed(1)),
          Number(avgKemas.toFixed(1))
        ],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(249, 115, 22, 0.8)',
          'rgba(234, 179, 8, 0.8)',
          'rgba(16, 185, 129, 0.8)'
        ],
        borderRadius: 6
      }
    ]
  };

  // 4. Chart: System Time per Order (First 15 orders)
  const recentOrders = [...orders].slice(0, 15);
  const durationChartData = {
    labels: recentOrders.map((o) => o.idPesanan),
    datasets: [
      {
        label: 'Total Waktu dlm Sistem (menit)',
        data: recentOrders.map((o) => o.totalWaktuSistem || 0),
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79, 70, 229, 0.15)',
        fill: true,
        tension: 0.35,
        pointRadius: 4
      }
    ]
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome / Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
              {session?.sessionName || 'Sesi Observasi'}
            </span>
            <span className="text-xs text-slate-300">|</span>
            <span className="text-xs text-slate-300">{session?.tanggal} ({session?.hari})</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Dashboard Observasi: {session?.namaUsaha || 'Ayam Geprek'}
          </h2>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            {session?.alamat || 'Lokasi observasi lapangan'} • Pengamat: {session?.pengamat1 || '-'}
            {session?.pengamat2 ? `, ${session.pengamat2}` : ''}
            {session?.pengamat3 ? `, ${session.pengamat3}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('orders')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-2 transition shadow-lg hover:shadow-blue-500/25"
          >
            <span>+ Catat Pesanan</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => onNavigate('queue')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-2 transition"
          >
            <Users className="w-4 h-4 text-rose-400" />
            <span>Snapshot Antrean</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 sm:gap-4">
        {/* Total Orders */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Total Pesanan</span>
            <ShoppingBag className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold text-slate-800">{totalOrders}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">pesanan tercatat</p>
          </div>
        </div>

        {/* Total Portions */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Total Porsi</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold text-slate-800">{totalPortions}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">porsi ayam geprek</p>
          </div>
        </div>

        {/* Avg System Time */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Rata2 Waktu Sistem</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold text-slate-800">
              {avgSystemTime} <span className="text-xs font-normal text-slate-500">m</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">datang s/d siap</p>
          </div>
        </div>

        {/* Avg Service Time */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Rata2 Pelayanan</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold text-slate-800">
              {Number(totalAvgService) > 0 ? totalAvgService : '-'} <span className="text-xs font-normal text-slate-500">m</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">akumulasi proses</p>
          </div>
        </div>

        {/* Avg Queue Length */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Rata2 Antrean</span>
            <Users className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold text-slate-800">
              {avgWaitingQueue} <span className="text-xs font-normal text-slate-500">org</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">per snapshot</p>
          </div>
        </div>

        {/* Max Queue */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Antrean Maksimum</span>
            <TrendingUp className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold text-slate-800">
              {maxQueue} <span className="text-xs font-normal text-slate-500">org</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">puncak antrean</p>
          </div>
        </div>

        {/* Total Customers Observed */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Pelanggan Diamati</span>
            <CheckCircle className="w-4 h-4 text-teal-600" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold text-slate-800">{totalOrders}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">pelanggan terdata</p>
          </div>
        </div>
      </div>

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Customer Arrival by Time */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Jumlah Kedatangan Berdasarkan Waktu</h3>
              <p className="text-xs text-slate-500">Frekuensi kedatangan pesanan per jam pengamatan</p>
            </div>
            <span className="p-2 bg-blue-50 text-blue-700 rounded-lg">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="h-64 flex items-center justify-center">
            {arrivalHours.length > 0 ? (
              <Bar
                data={arrivalChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                }}
              />
            ) : (
              <div className="text-center text-slate-400 py-12">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-medium">Belum ada data kedatangan</p>
                <button
                  onClick={() => onNavigate('orders')}
                  className="mt-2 text-xs text-blue-600 font-semibold hover:underline"
                >
                  Tambah pesanan pertama →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Queue Length Over Time */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Panjang Antrean Berdasarkan Waktu</h3>
              <p className="text-xs text-slate-500">Pergerakan antrean menunggu vs sedang dilayani</p>
            </div>
            <span className="p-2 bg-rose-50 text-rose-700 rounded-lg">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="h-64 flex items-center justify-center">
            {sortedSnapshots.length > 0 ? (
              <Line
                data={queueChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: 'top' as const } },
                  scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                }}
              />
            ) : (
              <div className="text-center text-slate-400 py-12">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-medium">Belum ada snapshot antrean</p>
                <button
                  onClick={() => onNavigate('queue')}
                  className="mt-2 text-xs text-blue-600 font-semibold hover:underline"
                >
                  Catat snapshot antrean →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Chart 3: Duration Comparison Across Stages */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Perbandingan Durasi Setiap Tahapan Pelayanan</h3>
              <p className="text-xs text-slate-500">Rata-rata menit per proses untuk identifikasi bottleneck</p>
            </div>
            <span className="p-2 bg-amber-50 text-amber-700 rounded-lg">
              <Activity className="w-4 h-4" />
            </span>
          </div>
          <div className="h-64 flex items-center justify-center">
            {orders.length > 0 ? (
              <Bar
                data={stagesChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: { y: { beginAtZero: true } }
                }}
              />
            ) : (
              <div className="text-center text-slate-400 py-12">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-medium">Belum ada durasi tercatat</p>
              </div>
            )}
          </div>
        </div>

        {/* Chart 4: System Time Trend */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Durasi Pelayanan per Pesanan (Waktu Sistem)</h3>
              <p className="text-xs text-slate-500">Total menit dari pelanggan datang sampai pesanan diterima</p>
            </div>
            <span className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="h-64 flex items-center justify-center">
            {recentOrders.length > 0 ? (
              <Line
                data={durationChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: { y: { beginAtZero: true } }
                }}
              />
            ) : (
              <div className="text-center text-slate-400 py-12">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-medium">Belum ada log pesanan</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

