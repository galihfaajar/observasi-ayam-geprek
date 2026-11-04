import React, { useState } from 'react';
import { QueueSnapshot, ObservationSession } from '../types';
import { db } from '../services/db';
import { pushSnapshotToSupabase } from '../services/supabaseClient';
import { getCurrentTimeString } from '../utils/timeUtils';
import { TimePickerInput } from '../components/common/TimePickerInput';
import { Modal } from '../components/common/Modal';
import {
  Users,
  Plus,
  Clock,
  TrendingUp,
  Trash2,
  Edit2,
  PlusCircle,
  MinusCircle,
  AlertCircle
} from 'lucide-react';
import { Line } from 'react-chartjs-2';

interface QueuePageProps {
  session: ObservationSession | null;
  snapshots: QueueSnapshot[];
  onRefreshSnapshots: () => void;
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const QueuePage: React.FC<QueuePageProps> = ({
  session,
  snapshots,
  onRefreshSnapshots,
  showNotification
}) => {
  // Quick Log form state
  const [waktuPengamatan, setWaktuPengamatan] = useState(getCurrentTimeString(true));
  const [jumlahMenunggu, setJumlahMenunggu] = useState(0);
  const [jumlahDilayani, setJumlahDilayani] = useState(1);
  const [jumlahMejaTerisi, setJumlahMejaTerisi] = useState<number | ''>('');
  const [kondisi, setKondisi] = useState('');

  // Edit / Delete modal
  const [editingSnapshot, setEditingSnapshot] = useState<QueueSnapshot | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<QueueSnapshot | null>(null);

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      showNotification('error', 'Pilih sesi observasi terlebih dahulu.');
      return;
    }

    try {
      const newSnapshot: QueueSnapshot = {
        id: `${session.id}-SNAP-${Date.now()}`,
        sessionId: session.id,
        waktuPengamatan: waktuPengamatan || getCurrentTimeString(true),
        jumlahMenunggu: Number(jumlahMenunggu) || 0,
        jumlahDilayani: Number(jumlahDilayani) || 0,
        jumlahMejaTerisi: jumlahMejaTerisi === '' ? null : Number(jumlahMejaTerisi),
        kondisi: kondisi.trim()
      };

      await db.snapshots.add(newSnapshot);
      pushSnapshotToSupabase(newSnapshot);
      onRefreshSnapshots();
      showNotification('success', 'Snapshot antrean berhasil dicatat.');

      // Reset form with new time
      setWaktuPengamatan(getCurrentTimeString(true));
      setKondisi('');
    } catch (err: any) {
      showNotification('error', 'Gagal mencatat snapshot: ' + err.message);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSnapshot) return;

    try {
      await db.snapshots.put(editingSnapshot);
      pushSnapshotToSupabase(editingSnapshot);
      onRefreshSnapshots();
      setEditingSnapshot(null);
      showNotification('success', 'Snapshot antrean berhasil diperbarui.');
    } catch (err: any) {
      showNotification('error', 'Gagal memperbarui: ' + err.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteCandidate) return;
    try {
      await db.snapshots.delete(deleteCandidate.id);
      onRefreshSnapshots();
      setDeleteCandidate(null);
      showNotification('success', 'Snapshot antrean berhasil dihapus.');
    } catch (err: any) {
      showNotification('error', 'Gagal menghapus: ' + err.message);
    }
  };

  // Sort snapshots chronological
  const sortedSnapshots = [...snapshots].sort((a, b) =>
    a.waktuPengamatan.localeCompare(b.waktuPengamatan)
  );

  // Line Chart
  const chartData = {
    labels: sortedSnapshots.map((s) => s.waktuPengamatan),
    datasets: [
      {
        label: 'Pelanggan Menunggu (Antrean)',
        data: sortedSnapshots.map((s) => s.jumlahMenunggu),
        borderColor: '#dc2626',
        backgroundColor: 'rgba(220, 38, 38, 0.15)',
        tension: 0.3,
        fill: true,
        pointRadius: 4
      },
      {
        label: 'Sedang Dilayani',
        data: sortedSnapshots.map((s) => s.jumlahDilayani),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        tension: 0.3,
        pointRadius: 4
      }
    ]
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-700" />
            <span>Pencatatan Snapshot Antrean ({snapshots.length})</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Snapshot berkala (setiap 5-10 menit) jumlah pelanggan menunggu dan sedang dilayani
          </p>
        </div>
      </div>

      {/* Quick Input Bar (Optimized for Field Use) */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-950 p-5 rounded-2xl text-white shadow-lg">
        <div className="flex items-center justify-between mb-3 border-b border-blue-800/60 pb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Input Cepat Snapshot Lapangan</span>
          </span>
          <span className="text-[11px] text-slate-300">Gunakan tombol +/- untuk menghitung cepat</span>
        </div>

        <form onSubmit={handleQuickAdd} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 items-end">
          {/* Waktu Pengamatan */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-200">Waktu Pengamatan</label>
            <div className="flex items-center space-x-1">
              <input
                type="text"
                required
                value={waktuPengamatan}
                onChange={(e) => setWaktuPengamatan(e.target.value)}
                placeholder="HH:MM:SS"
                className="w-full px-3 py-2 text-sm bg-slate-800 text-white border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono"
              />
              <button
                type="button"
                onClick={() => setWaktuPengamatan(getCurrentTimeString(true))}
                title="Waktu saat ini"
                className="px-2.5 py-2 bg-blue-600 hover:bg-blue-500 text-xs rounded-lg font-medium shrink-0"
              >
                Now
              </button>
            </div>
          </div>

          {/* Jumlah Menunggu */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-rose-300">Menunggu (Antre)</label>
            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setJumlahMenunggu((prev) => Math.max(0, prev - 1))}
                className="p-1 hover:bg-slate-700 rounded text-slate-300"
              >
                <MinusCircle className="w-4 h-4" />
              </button>
              <input
                type="number"
                min={0}
                value={jumlahMenunggu}
                onChange={(e) => setJumlahMenunggu(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full text-center bg-transparent text-white font-bold font-mono text-base focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setJumlahMenunggu((prev) => prev + 1)}
                className="p-1 hover:bg-slate-700 rounded text-rose-400"
              >
                <PlusCircle className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Jumlah Sedang Dilayani */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-blue-300">Sedang Dilayani</label>
            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setJumlahDilayani((prev) => Math.max(0, prev - 1))}
                className="p-1 hover:bg-slate-700 rounded text-slate-300"
              >
                <MinusCircle className="w-4 h-4" />
              </button>
              <input
                type="number"
                min={0}
                value={jumlahDilayani}
                onChange={(e) => setJumlahDilayani(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full text-center bg-transparent text-white font-bold font-mono text-base focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setJumlahDilayani((prev) => prev + 1)}
                className="p-1 hover:bg-slate-700 rounded text-blue-400"
              >
                <PlusCircle className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Kondisi / Keterangan */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-200">Kondisi / Keterangan</label>
            <input
              type="text"
              placeholder="Antrean kasir padat..."
              value={kondisi}
              onChange={(e) => setKondisi(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-800 text-white border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-slate-500"
            />
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-md transition flex items-center justify-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>+ Simpan Snapshot</span>
            </button>
          </div>
        </form>
      </div>

      {/* Visual Chart of Queue Length */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Dinamika Panjang Antrean Berdasarkan Waktu</h3>
            <p className="text-xs text-slate-500">Pergerakan jumlah menunggu vs kapasitas pelayanan</p>
          </div>
          <span className="p-2 bg-rose-50 text-rose-700 rounded-lg">
            <TrendingUp className="w-4 h-4" />
          </span>
        </div>
        <div className="h-64 flex items-center justify-center">
          {sortedSnapshots.length > 0 ? (
            <Line
              data={chartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                  }
                }
              }}
            />
          ) : (
            <div className="text-center text-slate-400 py-12">
              <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-medium">Belum ada snapshot antrean untuk grafik</p>
            </div>
          )}
        </div>
      </div>

      {/* Table of Snapshots */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Riwayat Snapshot Antrean</h3>
          <span className="text-xs text-slate-500 font-medium">
            Total {snapshots.length} interval tercatat
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white font-semibold text-[10px] tracking-wider uppercase">
                <th className="py-3 px-4">Waktu Pengamatan</th>
                <th className="py-3 px-4">Menunggu (Antre)</th>
                <th className="py-3 px-4">Sedang Dilayani</th>
                <th className="py-3 px-4">Meja Terisi</th>
                <th className="py-3 px-4">Kondisi / Keterangan</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {sortedSnapshots.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    Belum ada data snapshot antrean.
                  </td>
                </tr>
              ) : (
                sortedSnapshots.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-blue-900">
                      {s.waktuPengamatan}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        {s.jumlahMenunggu} orang
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {s.jumlahDilayani} orang
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {s.jumlahMejaTerisi !== null && s.jumlahMejaTerisi !== undefined ? `${s.jumlahMejaTerisi} meja` : '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={s.kondisi}>
                      {s.kondisi || '-'}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => setEditingSnapshot(s)}
                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                          title="Edit snapshot"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteCandidate(s)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                          title="Hapus snapshot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingSnapshot}
        onClose={() => setEditingSnapshot(null)}
        title="Edit Snapshot Antrean"
        maxWidth="max-w-md"
      >
        {editingSnapshot && (
          <form onSubmit={handleUpdate} className="space-y-4">
            <TimePickerInput
              label="Waktu Pengamatan"
              value={editingSnapshot.waktuPengamatan}
              onChange={(v) =>
                setEditingSnapshot({ ...editingSnapshot, waktuPengamatan: v })
              }
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jumlah Pelanggan Menunggu
              </label>
              <input
                type="number"
                min={0}
                value={editingSnapshot.jumlahMenunggu}
                onChange={(e) =>
                  setEditingSnapshot({
                    ...editingSnapshot,
                    jumlahMenunggu: Number(e.target.value) || 0
                  })
                }
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jumlah Sedang Dilayani
              </label>
              <input
                type="number"
                min={0}
                value={editingSnapshot.jumlahDilayani}
                onChange={(e) =>
                  setEditingSnapshot({
                    ...editingSnapshot,
                    jumlahDilayani: Number(e.target.value) || 0
                  })
                }
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jumlah Meja Terisi (opsional)
              </label>
              <input
                type="number"
                min={0}
                value={editingSnapshot.jumlahMejaTerisi ?? ''}
                onChange={(e) =>
                  setEditingSnapshot({
                    ...editingSnapshot,
                    jumlahMejaTerisi: e.target.value === '' ? null : Number(e.target.value)
                  })
                }
                placeholder="Kosongkan bila tidak relevan"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kondisi / Keterangan
              </label>
              <textarea
                rows={2}
                value={editingSnapshot.kondisi}
                onChange={(e) =>
                  setEditingSnapshot({ ...editingSnapshot, kondisi: e.target.value })
                }
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingSnapshot(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md transition"
              >
                Perbarui Snapshot
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteCandidate}
        onClose={() => setDeleteCandidate(null)}
        title="Konfirmasi Hapus Snapshot"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Yakin ingin menghapus snapshot antrean pada jam{' '}
            <strong className="text-slate-900 font-mono">{deleteCandidate?.waktuPengamatan}</strong>?
          </p>
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setDeleteCandidate(null)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition"
            >
              Ya, Hapus Data
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

