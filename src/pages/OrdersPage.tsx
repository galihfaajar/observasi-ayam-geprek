import React, { useState, useMemo } from 'react';
import { OrderLog, ObservationSession } from '../types';
import { db, getNextOrderId, saveOrder } from '../services/db';
import { deleteOrderFromSupabase } from '../services/supabaseClient';
import {
  calculateDurationMinutes,
  computeOrderDurations,
  getCurrentTimeString,
  formatDuration
} from '../utils/timeUtils';
import { TimePickerInput } from '../components/common/TimePickerInput';
import { Modal } from '../components/common/Modal';
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Edit2,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Zap,
  Coffee,
  ShoppingBag
} from 'lucide-react';

interface OrdersPageProps {
  session: ObservationSession | null;
  orders: OrderLog[];
  onRefreshOrders: () => void;
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

const DEFAULT_ORDER_TYPES = [
  'Paket Geprek Original',
  'Paket Geprek Keju',
  'Paket Geprek Sambal Matah',
  'Ayam Geprek Aja (Tanpa Nasi)',
  'Paket Geprek Mozarella',
  'Paket Geprek Jumbo',
  'Lainnya'
];

export const OrdersPage: React.FC<OrdersPageProps> = ({
  session,
  orders,
  onRefreshOrders,
  showNotification
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLayanan, setFilterLayanan] = useState<'All' | 'Dine-in' | 'Takeaway'>('All');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [deleteCandidate, setDeleteCandidate] = useState<OrderLog | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<OrderLog>>({
    idPesanan: 'P001',
    waktuDatang: '',
    mulaiPesan: '',
    selesaiPesan: '',
    mulaiGoreng: '',
    selesaiGoreng: '',
    mulaiGeprek: '',
    selesaiGeprek: '',
    mulaiKemas: '',
    pesananSiap: '',
    jenisPesanan: 'Paket Geprek Original',
    jumlahPorsi: 1,
    jenisLayanan: 'Dine-in',
    catatan: ''
  });

  // Open Add Modal with next auto ID & current arrival time
  const handleOpenAdd = async () => {
    if (!session) {
      showNotification('error', 'Pilih sesi observasi terlebih dahulu.');
      return;
    }
    const nextId = await getNextOrderId(session.id);
    const now = getCurrentTimeString(true);
    setFormData({
      id: '',
      sessionId: session.id,
      idPesanan: nextId,
      waktuDatang: now,
      mulaiPesan: now,
      selesaiPesan: '',
      mulaiGoreng: '',
      selesaiGoreng: '',
      mulaiGeprek: '',
      selesaiGeprek: '',
      mulaiKemas: '',
      pesananSiap: '',
      jenisPesanan: 'Paket Geprek Original',
      jumlahPorsi: 1,
      jenisLayanan: 'Dine-in',
      catatan: ''
    });
    setModalMode('add');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (order: OrderLog) => {
    setFormData({ ...order });
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleFormChange = (field: keyof OrderLog, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    if (!formData.idPesanan?.trim()) {
      showNotification('error', 'ID Pesanan tidak boleh kosong.');
      return;
    }

    try {
      const isAdd = modalMode === 'add';
      const orderId = isAdd ? `${session.id}-ORD-${Date.now()}` : (formData.id as string);

      const completeOrder: OrderLog = {
        id: orderId,
        sessionId: session.id,
        idPesanan: formData.idPesanan.trim().toUpperCase(),
        waktuDatang: formData.waktuDatang || '',
        mulaiPesan: formData.mulaiPesan || '',
        selesaiPesan: formData.selesaiPesan || '',
        mulaiGoreng: formData.mulaiGoreng || '',
        selesaiGoreng: formData.selesaiGoreng || '',
        mulaiGeprek: formData.mulaiGeprek || '',
        selesaiGeprek: formData.selesaiGeprek || '',
        mulaiKemas: formData.mulaiKemas || '',
        pesananSiap: formData.pesananSiap || '',
        jenisPesanan: formData.jenisPesanan || 'Paket Geprek Original',
        jumlahPorsi: Number(formData.jumlahPorsi) || 1,
        jenisLayanan: formData.jenisLayanan || 'Dine-in',
        catatan: formData.catatan || ''
      };

      await saveOrder(completeOrder);
      onRefreshOrders();
      setIsModalOpen(false);
      showNotification('success', `Pesanan ${completeOrder.idPesanan} berhasil disimpan.`);
    } catch (err: any) {
      showNotification('error', 'Gagal menyimpan pesanan: ' + err.message);
    }
  };

  const confirmDelete = async () => {
    if (!deleteCandidate) return;
    try {
      await db.orders.delete(deleteCandidate.id);
      deleteOrderFromSupabase(deleteCandidate.id);
      onRefreshOrders();
      showNotification('success', `Pesanan ${deleteCandidate.idPesanan} berhasil dihapus.`);
      setDeleteCandidate(null);
    } catch (err: any) {
      showNotification('error', 'Gagal menghapus: ' + err.message);
    }
  };

  // Quick timestamp update directly from row (super handy in field!)
  const handleQuickTimestamp = async (order: OrderLog, field: keyof OrderLog) => {
    const now = getCurrentTimeString(true);
    const updated = { ...order, [field]: now };
    await saveOrder(updated);
    onRefreshOrders();
    showNotification('info', `${order.idPesanan}: ${field} diisi (${now})`);
  };

  // Filtered & Sorted orders
  const filteredOrders = useMemo(() => {
    return orders
      .filter((o) => {
        const matchSearch =
          o.idPesanan.toLowerCase().includes(searchTerm.toLowerCase()) ||
          o.jenisPesanan.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (o.catatan && o.catatan.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchLayanan = filterLayanan === 'All' || o.jenisLayanan === filterLayanan;
        return matchSearch && matchLayanan;
      })
      .sort((a, b) => {
        const timeA = a.waktuDatang || '';
        const timeB = b.waktuDatang || '';
        if (sortOrder === 'asc') return timeA.localeCompare(timeB);
        return timeB.localeCompare(timeA);
      });
  }, [orders, searchTerm, filterLayanan, sortOrder]);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-700" />
            <span>Log Pengamatan Pesanan ({orders.length})</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Pencatatan waktu aktual setiap tahapan pelayanan pelanggan sesuai template Excel
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-blue-700 hover:bg-blue-600 active:bg-blue-800 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-2 transition shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>+ Catat Pesanan Baru</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Search, Filters, Sorting */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-2 w-full md:w-auto flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari ID pesanan, menu, atau catatan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto justify-between md:justify-end">
          {/* Layanan Filter */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
            {(['All', 'Dine-in', 'Takeaway'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterLayanan(type)}
                className={`px-3 py-1 rounded-md transition ${
                  filterLayanan === type
                    ? 'bg-white text-blue-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {type === 'All' ? 'Semua' : type}
              </button>
            ))}
          </div>

          {/* Sort Button */}
          <button
            onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-700 flex items-center space-x-1 transition shrink-0"
            title="Urutkan berdasarkan waktu kedatangan"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <span>{sortOrder === 'asc' ? 'Waktu Terlama' : 'Waktu Terbaru'}</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-w-full">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white font-semibold tracking-wider uppercase text-[10px]">
                <th className="py-3 px-3 sticky left-0 bg-slate-900 z-10">ID</th>
                <th className="py-3 px-3">Menu & Porsi</th>
                <th className="py-3 px-2.5">Layanan</th>
                <th className="py-3 px-2.5">Datang</th>
                <th className="py-3 px-2.5">Mulai Pesan</th>
                <th className="py-3 px-2.5">Selesai Pesan</th>
                <th className="py-3 px-2.5">Mulai Goreng</th>
                <th className="py-3 px-2.5">Selesai Goreng</th>
                <th className="py-3 px-2.5">Mulai Geprek</th>
                <th className="py-3 px-2.5">Selesai Geprek</th>
                <th className="py-3 px-2.5">Mulai Kemas</th>
                <th className="py-3 px-2.5">Siap</th>
                {/* Durations */}
                <th className="py-3 px-2.5 bg-blue-950 text-blue-200">D. Pesan</th>
                <th className="py-3 px-2.5 bg-blue-950 text-blue-200">D. Goreng</th>
                <th className="py-3 px-2.5 bg-blue-950 text-blue-200">D. Geprek</th>
                <th className="py-3 px-2.5 bg-blue-950 text-blue-200">D. Kemas</th>
                <th className="py-3 px-2.5 bg-blue-900 text-amber-200 font-bold">Total Sistem</th>
                <th className="py-3 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={18} className="py-12 text-center text-slate-400 font-sans">
                    <ClipboardList className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-600">Belum ada data pesanan</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Klik tombol "+ Catat Pesanan Baru" untuk mulai pengamatan
                    </p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => {
                  const isDone = o.totalWaktuSistem !== null && o.totalWaktuSistem !== undefined;
                  return (
                    <tr
                      key={o.id}
                      className="hover:bg-blue-50/40 transition group font-sans text-slate-700"
                    >
                      {/* ID Pesanan */}
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-900 sticky left-0 bg-white group-hover:bg-blue-50/40 shadow-xs">
                        <div className="flex items-center space-x-1.5">
                          <span>{o.idPesanan}</span>
                          {isDone ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title="Proses berjalan" />
                          )}
                        </div>
                      </td>

                      {/* Menu & Porsi */}
                      <td className="py-2.5 px-3 max-w-[160px] truncate" title={o.jenisPesanan}>
                        <div className="font-medium text-slate-800 truncate">{o.jenisPesanan}</div>
                        <div className="text-[10px] text-slate-400">{o.jumlahPorsi} porsi</div>
                      </td>

                      {/* Layanan */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                            o.jenisLayanan === 'Dine-in'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {o.jenisLayanan}
                        </span>
                      </td>

                      {/* Timestamps */}
                      <td className="py-2.5 px-2.5 font-mono text-[11px] whitespace-nowrap text-slate-600">
                        {o.waktuDatang || '-'}
                      </td>

                      <td className="py-2.5 px-2.5 font-mono text-[11px] whitespace-nowrap text-slate-600">
                        {o.mulaiPesan || (
                          <button
                            onClick={() => handleQuickTimestamp(o, 'mulaiPesan')}
                            className="text-[10px] text-blue-600 hover:underline font-sans"
                          >
                            + Sekarang
                          </button>
                        )}
                      </td>

                      <td className="py-2.5 px-2.5 font-mono text-[11px] whitespace-nowrap text-slate-600">
                        {o.selesaiPesan || (
                          <button
                            onClick={() => handleQuickTimestamp(o, 'selesaiPesan')}
                            className="text-[10px] text-blue-600 hover:underline font-sans"
                          >
                            + Sekarang
                          </button>
                        )}
                      </td>

                      <td className="py-2.5 px-2.5 font-mono text-[11px] whitespace-nowrap text-slate-600">
                        {o.mulaiGoreng || (
                          <button
                            onClick={() => handleQuickTimestamp(o, 'mulaiGoreng')}
                            className="text-[10px] text-blue-600 hover:underline font-sans"
                          >
                            + Sekarang
                          </button>
                        )}
                      </td>

                      <td className="py-2.5 px-2.5 font-mono text-[11px] whitespace-nowrap text-slate-600">
                        {o.selesaiGoreng || (
                          <button
                            onClick={() => handleQuickTimestamp(o, 'selesaiGoreng')}
                            className="text-[10px] text-blue-600 hover:underline font-sans"
                          >
                            + Sekarang
                          </button>
                        )}
                      </td>

                      <td className="py-2.5 px-2.5 font-mono text-[11px] whitespace-nowrap text-slate-600">
                        {o.mulaiGeprek || (
                          <button
                            onClick={() => handleQuickTimestamp(o, 'mulaiGeprek')}
                            className="text-[10px] text-blue-600 hover:underline font-sans"
                          >
                            + Sekarang
                          </button>
                        )}
                      </td>

                      <td className="py-2.5 px-2.5 font-mono text-[11px] whitespace-nowrap text-slate-600">
                        {o.selesaiGeprek || (
                          <button
                            onClick={() => handleQuickTimestamp(o, 'selesaiGeprek')}
                            className="text-[10px] text-blue-600 hover:underline font-sans"
                          >
                            + Sekarang
                          </button>
                        )}
                      </td>

                      <td className="py-2.5 px-2.5 font-mono text-[11px] whitespace-nowrap text-slate-600">
                        {o.mulaiKemas || (
                          <button
                            onClick={() => handleQuickTimestamp(o, 'mulaiKemas')}
                            className="text-[10px] text-blue-600 hover:underline font-sans"
                          >
                            + Sekarang
                          </button>
                        )}
                      </td>

                      <td className="py-2.5 px-2.5 font-mono text-[11px] whitespace-nowrap text-slate-600">
                        {o.pesananSiap || (
                          <button
                            onClick={() => handleQuickTimestamp(o, 'pesananSiap')}
                            className="text-[10px] text-emerald-600 font-bold hover:underline font-sans"
                          >
                            + Siap
                          </button>
                        )}
                      </td>

                      {/* Durations */}
                      <td className="py-2.5 px-2.5 font-mono text-[11px] bg-blue-50/50 text-slate-700">
                        {formatDuration(o.durasiPesanBayar)}
                      </td>
                      <td className="py-2.5 px-2.5 font-mono text-[11px] bg-blue-50/50 text-slate-700">
                        {formatDuration(o.durasiGoreng)}
                      </td>
                      <td className="py-2.5 px-2.5 font-mono text-[11px] bg-blue-50/50 text-slate-700">
                        {formatDuration(o.durasiGeprek)}
                      </td>
                      <td className="py-2.5 px-2.5 font-mono text-[11px] bg-blue-50/50 text-slate-700">
                        {formatDuration(o.durasiKemas)}
                      </td>
                      <td className="py-2.5 px-2.5 font-mono text-[11px] bg-indigo-50 font-bold text-indigo-900">
                        {formatDuration(o.totalWaktuSistem)}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => handleOpenEdit(o)}
                            title="Edit pesanan"
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteCandidate(o)}
                            title="Hapus pesanan"
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit Order */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'add' ? 'Tambah Log Pesanan Baru' : `Edit Pesanan: ${formData.idPesanan}`}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSaveForm} className="space-y-5">
          {/* Top row: ID, Menu, Porsi, Layanan */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ID Pesanan <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.idPesanan}
                onChange={(e) => handleFormChange('idPesanan', e.target.value)}
                placeholder="P001"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 font-mono font-bold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jenis Pesanan / Menu
              </label>
              <input
                type="text"
                list="menu-suggestions"
                value={formData.jenisPesanan}
                onChange={(e) => handleFormChange('jenisPesanan', e.target.value)}
                placeholder="Paket Geprek Original..."
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
              />
              <datalist id="menu-suggestions">
                {DEFAULT_ORDER_TYPES.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Jumlah Porsi</label>
              <input
                type="number"
                min={1}
                value={formData.jumlahPorsi}
                onChange={(e) => handleFormChange('jumlahPorsi', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 font-mono"
              />
            </div>

            <div className="sm:col-span-4 flex items-center space-x-4 pt-1">
              <span className="text-xs font-semibold text-slate-700">Jenis Layanan:</span>
              <label className="inline-flex items-center space-x-2 text-xs font-medium cursor-pointer">
                <input
                  type="radio"
                  name="jenisLayanan"
                  value="Dine-in"
                  checked={formData.jenisLayanan === 'Dine-in'}
                  onChange={() => handleFormChange('jenisLayanan', 'Dine-in')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span>Dine-in (Makan di Tempat)</span>
              </label>
              <label className="inline-flex items-center space-x-2 text-xs font-medium cursor-pointer">
                <input
                  type="radio"
                  name="jenisLayanan"
                  value="Takeaway"
                  checked={formData.jenisLayanan === 'Takeaway'}
                  onChange={() => handleFormChange('jenisLayanan', 'Takeaway')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span>Takeaway (Bungkus / Bawa Pulang)</span>
              </label>
            </div>
          </div>

          {/* Time fields: Stage by stage */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Pencatatan Waktu Aktual Tahapan Pelayanan</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Tahap 1: Kedatangan & Pemesanan */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2.5">
                <span className="text-[11px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded">
                  1. Kedatangan & Pemesanan
                </span>
                <TimePickerInput
                  label="Waktu Datang"
                  value={formData.waktuDatang || ''}
                  onChange={(v) => handleFormChange('waktuDatang', v)}
                />
                <TimePickerInput
                  label="Mulai Pesan"
                  value={formData.mulaiPesan || ''}
                  onChange={(v) => handleFormChange('mulaiPesan', v)}
                />
                <TimePickerInput
                  label="Selesai Pesan/Bayar"
                  value={formData.selesaiPesan || ''}
                  onChange={(v) => handleFormChange('selesaiPesan', v)}
                />
              </div>

              {/* Tahap 2: Penggorengan */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2.5">
                <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
                  2. Persiapan & Penggorengan
                </span>
                <TimePickerInput
                  label="Mulai Persiapan/Goreng"
                  value={formData.mulaiGoreng || ''}
                  onChange={(v) => handleFormChange('mulaiGoreng', v)}
                />
                <TimePickerInput
                  label="Selesai Goreng"
                  value={formData.selesaiGoreng || ''}
                  onChange={(v) => handleFormChange('selesaiGoreng', v)}
                />
              </div>

              {/* Tahap 3: Geprek & Sajikan */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2.5">
                <span className="text-[11px] font-bold text-yellow-800 bg-yellow-50 px-2 py-0.5 rounded">
                  3. Pengulekan & Geprek
                </span>
                <TimePickerInput
                  label="Mulai Geprek/Sajikan"
                  value={formData.mulaiGeprek || ''}
                  onChange={(v) => handleFormChange('mulaiGeprek', v)}
                />
                <TimePickerInput
                  label="Selesai Geprek/Sajikan"
                  value={formData.selesaiGeprek || ''}
                  onChange={(v) => handleFormChange('selesaiGeprek', v)}
                />
              </div>

              {/* Tahap 4: Kemas & Pesanan Siap */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2.5">
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                  4. Pengemasan & Penyerahan
                </span>
                <TimePickerInput
                  label="Mulai Pengemasan"
                  value={formData.mulaiKemas || ''}
                  onChange={(v) => handleFormChange('mulaiKemas', v)}
                />
                <TimePickerInput
                  label="Pesanan Siap/Diterima"
                  value={formData.pesananSiap || ''}
                  onChange={(v) => handleFormChange('pesananSiap', v)}
                />
              </div>
            </div>
          </div>

          {/* Catatan / Kendala */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Catatan / Kendala
            </label>
            <input
              type="text"
              placeholder="Contoh: Sambal habis harus ulek ulang, cabe rawit langka, pelanggan minta cabai dipisah..."
              value={formData.catatan || ''}
              onChange={(e) => handleFormChange('catatan', e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Buttons */}
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
              {modalMode === 'add' ? 'Simpan Pesanan' : 'Perbarui Pesanan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteCandidate}
        onClose={() => setDeleteCandidate(null)}
        title="Konfirmasi Hapus Pesanan"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Apakah Anda yakin ingin menghapus data pesanan{' '}
            <strong className="text-slate-900 font-mono">{deleteCandidate?.idPesanan}</strong> (
            {deleteCandidate?.jenisPesanan})? Tindakan ini tidak dapat dibatalkan.
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

