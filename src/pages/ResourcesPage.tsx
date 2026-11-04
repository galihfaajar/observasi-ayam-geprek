import React, { useState } from 'react';
import { ResourceLog, ObservationSession } from '../types';
import { db } from '../services/db';
import { Modal } from '../components/common/Modal';
import {
  UtensilsCrossed,
  Plus,
  Edit2,
  Trash2,
  Users,
  Flame,
  Clock,
  Layers,
  ChefHat
} from 'lucide-react';

interface ResourcesPageProps {
  session: ObservationSession | null;
  resources: ResourceLog[];
  onRefreshResources: () => void;
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const ResourcesPage: React.FC<ResourcesPageProps> = ({
  session,
  resources,
  onRefreshResources,
  showNotification
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [deleteCandidate, setDeleteCandidate] = useState<ResourceLog | null>(null);

  const [formData, setFormData] = useState<Partial<ResourceLog>>({
    waktuPeriode: '11:00 - 14:00',
    jumlahKasir: 1,
    jumlahKoki: 2,
    jumlahPegawaiLain: 1,
    jumlahKompor: 2,
    jumlahWajan: 2,
    kapasitasGoreng: 16,
    fasilitasLain: '',
    pembagianTugas: ''
  });

  const handleOpenAdd = () => {
    setFormData({
      id: '',
      sessionId: session?.id || '',
      waktuPeriode: '11:00 - 14:00',
      jumlahKasir: 1,
      jumlahKoki: 2,
      jumlahPegawaiLain: 1,
      jumlahKompor: 2,
      jumlahWajan: 2,
      kapasitasGoreng: 16,
      fasilitasLain: '',
      pembagianTugas: ''
    });
    setModalMode('add');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (res: ResourceLog) => {
    setFormData({ ...res });
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      showNotification('error', 'Pilih sesi observasi terlebih dahulu.');
      return;
    }

    try {
      const isAdd = modalMode === 'add';
      const id = isAdd ? `${session.id}-RES-${Date.now()}` : (formData.id as string);

      const item: ResourceLog = {
        id,
        sessionId: session.id,
        waktuPeriode: formData.waktuPeriode || 'Periode Observasi',
        jumlahKasir: Number(formData.jumlahKasir) || 1,
        jumlahKoki: Number(formData.jumlahKoki) || 1,
        jumlahPegawaiLain: Number(formData.jumlahPegawaiLain) || 0,
        jumlahKompor: Number(formData.jumlahKompor) || 1,
        jumlahWajan: Number(formData.jumlahWajan) || 1,
        kapasitasGoreng: Number(formData.kapasitasGoreng) || 16,
        fasilitasLain: formData.fasilitasLain || '',
        pembagianTugas: formData.pembagianTugas || ''
      };

      await db.resources.put(item);
      onRefreshResources();
      setIsModalOpen(false);
      showNotification('success', 'Data sumber daya berhasil disimpan.');
    } catch (err: any) {
      showNotification('error', 'Gagal menyimpan: ' + err.message);
    }
  };

  const confirmDelete = async () => {
    if (!deleteCandidate) return;
    try {
      await db.resources.delete(deleteCandidate.id);
      onRefreshResources();
      setDeleteCandidate(null);
      showNotification('success', 'Data sumber daya berhasil dihapus.');
    } catch (err: any) {
      showNotification('error', 'Gagal menghapus: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-blue-700" />
            <span>Pencatatan Sumber Daya & Fasilitas</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Mencatat jumlah karyawan aktif, peralatan kompor, wajan, dan kapasitas penggorengan
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-blue-700 hover:bg-blue-600 active:bg-blue-800 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-2 transition shadow-md shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Catat Sumber Daya</span>
        </button>
      </div>

      {/* Resource Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {resources.map((res) => (
          <div
            key={res.id}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4 hover:border-blue-300 transition"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <span className="p-2 bg-blue-50 text-blue-700 rounded-lg">
                  <Clock className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{res.waktuPeriode}</h4>
                  <p className="text-[11px] text-slate-500">Periode Observasi Sumber Daya</p>
                </div>
              </div>
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => handleOpenEdit(res)}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  title="Edit data"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteCandidate(res)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  title="Hapus data"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Metrics Chips */}
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-500 font-medium">Kasir Aktif</p>
                <p className="text-lg font-bold text-slate-800 mt-0.5">{res.jumlahKasir}</p>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-500 font-medium">Koki Aktif</p>
                <p className="text-lg font-bold text-slate-800 mt-0.5">{res.jumlahKoki}</p>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-500 font-medium">Pegawai Lain</p>
                <p className="text-lg font-bold text-slate-800 mt-0.5">{res.jumlahPegawaiLain}</p>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-500 font-medium">Kompor Aktif</p>
                <p className="text-lg font-bold text-slate-800 mt-0.5">{res.jumlahKompor}</p>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-500 font-medium">Wajan Aktif</p>
                <p className="text-lg font-bold text-slate-800 mt-0.5">{res.jumlahWajan}</p>
              </div>
              <div className="bg-blue-50/70 p-2.5 rounded-xl border border-blue-100">
                <p className="text-xs text-blue-700 font-medium">Kapasitas Goreng</p>
                <p className="text-lg font-bold text-blue-900 mt-0.5">
                  {res.kapasitasGoreng || 0} <span className="text-[10px] font-normal">ptg</span>
                </p>
              </div>
            </div>

            {/* Notes / Pembagian Tugas */}
            <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
              {res.pembagianTugas && (
                <div>
                  <strong className="text-slate-800">Pembagian Tugas: </strong>
                  <span>{res.pembagianTugas}</span>
                </div>
              )}
              {res.fasilitasLain && (
                <div>
                  <strong className="text-slate-800">Fasilitas Lainnya: </strong>
                  <span>{res.fasilitasLain}</span>
                </div>
              )}
              {!res.pembagianTugas && !res.fasilitasLain && (
                <span className="italic text-slate-400">Tidak ada catatan pembagian tugas khusus.</span>
              )}
            </div>
          </div>
        ))}

        {resources.length === 0 && (
          <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400">
            <UtensilsCrossed className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">Belum ada data sumber daya</p>
            <p className="text-xs text-slate-400 mt-1">
              Catat jumlah pekerja dan alat penggorengan aktif selama observasi
            </p>
            <button
              onClick={handleOpenAdd}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-500"
            >
              + Catat Sekarang
            </button>
          </div>
        )}
      </div>

      {/* Modal Add / Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'add' ? 'Tambah Catatan Sumber Daya' : 'Edit Sumber Daya'}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Waktu / Periode Observasi <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: 11:00 - 14:00 atau Jam Sibuk Siang"
              value={formData.waktuPeriode || ''}
              onChange={(e) => setFormData({ ...formData, waktuPeriode: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Jumlah Kasir</label>
              <input
                type="number"
                min={0}
                value={formData.jumlahKasir}
                onChange={(e) => setFormData({ ...formData, jumlahKasir: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Jumlah Koki</label>
              <input
                type="number"
                min={0}
                value={formData.jumlahKoki}
                onChange={(e) => setFormData({ ...formData, jumlahKoki: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Pegawai Lain</label>
              <input
                type="number"
                min={0}
                value={formData.jumlahPegawaiLain}
                onChange={(e) =>
                  setFormData({ ...formData, jumlahPegawaiLain: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kompor Aktif</label>
              <input
                type="number"
                min={0}
                value={formData.jumlahKompor}
                onChange={(e) => setFormData({ ...formData, jumlahKompor: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Wajan Aktif</label>
              <input
                type="number"
                min={0}
                value={formData.jumlahWajan}
                onChange={(e) => setFormData({ ...formData, jumlahWajan: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kapasitas Goreng</label>
              <input
                type="number"
                min={0}
                placeholder="ptg ayam"
                value={formData.kapasitasGoreng}
                onChange={(e) =>
                  setFormData({ ...formData, kapasitasGoreng: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Fasilitas atau Alat Lainnya
            </label>
            <input
              type="text"
              placeholder="Contoh: Meja kasir, etalase pemanas ayam, 2 cobek batu besar..."
              value={formData.fasilitasLain || ''}
              onChange={(e) => setFormData({ ...formData, fasilitasLain: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pembagian Tugas & Catatan
            </label>
            <textarea
              rows={2}
              placeholder="Contoh: Kasir melayani pembayaran dan pengemasan pesanan bawa pulang..."
              value={formData.pembagianTugas || ''}
              onChange={(e) => setFormData({ ...formData, pembagianTugas: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md transition"
            >
              Simpan Data
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteCandidate}
        onClose={() => setDeleteCandidate(null)}
        title="Konfirmasi Hapus Sumber Daya"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Yakin ingin menghapus catatan sumber daya periode{' '}
            <strong className="text-slate-900 font-mono">{deleteCandidate?.waktuPeriode}</strong>?
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
              onClick={confirmDelete}
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

