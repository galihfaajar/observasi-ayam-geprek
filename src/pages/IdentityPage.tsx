import React, { useState, useEffect } from 'react';
import { ObservationSession } from '../types';
import { db } from '../services/db';
import { getDayName, getTodayDateString, getCurrentTimeString } from '../utils/timeUtils';
import { pushSessionToSupabase, getSupabaseClient } from '../services/supabaseClient';
import {
  Building2,
  Calendar,
  Clock,
  UserCheck,
  CloudSun,
  ShieldCheck,
  Save,
  Plus,
  Layers,
  Trash2,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

interface IdentityPageProps {
  session: ObservationSession | null;
  sessions: ObservationSession[];
  onSessionUpdated: (updated: ObservationSession) => void;
  onSessionCreated: (newSession: ObservationSession) => void;
  onSessionDeleted: (id: string) => void;
  onSelectSession: (id: string) => void;
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const IdentityPage: React.FC<IdentityPageProps> = ({
  session,
  sessions,
  onSessionUpdated,
  onSessionCreated,
  onSessionDeleted,
  onSelectSession,
  showNotification
}) => {
  const [formData, setFormData] = useState<ObservationSession>({
    id: '',
    sessionName: '',
    namaUsaha: '',
    alamat: '',
    tanggal: getTodayDateString(),
    hari: getDayName(getTodayDateString()),
    jamMulai: '11:00',
    jamSelesai: '14:00',
    pengamat1: '',
    pengamat2: '',
    pengamat3: '',
    cuacaKhusus: '',
    catatanIzin: '',
    createdAt: new Date().toISOString()
  });

  const [isCreatingNew, setIsCreatingNew] = useState(false);

  useEffect(() => {
    if (session) {
      setFormData(session);
      setIsCreatingNew(false);
    }
  }, [session]);

  const handleChange = (field: keyof ObservationSession, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'tanggal') {
        next.hari = getDayName(value);
      }
      return next;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.namaUsaha.trim() || !formData.sessionName.trim()) {
      showNotification('error', 'Nama Usaha dan Nama Sesi wajib diisi.');
      return;
    }

    try {
      if (isCreatingNew) {
        const newId = `SESI-${formData.tanggal.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;
        const newSession: ObservationSession = {
          ...formData,
          id: newId,
          createdAt: new Date().toISOString()
        };
        await db.sessions.add(newSession);
        // Sync ke Supabase di background
        pushSessionToSupabase(newSession);
        onSessionCreated(newSession);
        setIsCreatingNew(false);
        showNotification('success', 'Sesi observasi baru berhasil dibuat.');
      } else {
        await db.sessions.put(formData);
        // Sync ke Supabase di background
        pushSessionToSupabase(formData);
        onSessionUpdated(formData);
        showNotification('success', 'Informasi identitas observasi berhasil disimpan.');
      }
    } catch (err: any) {
      showNotification('error', 'Gagal menyimpan: ' + (err.message || 'Terjadi kesalahan.'));
    }
  };

  const startCreateNew = () => {
    const today = getTodayDateString();
    setFormData({
      id: '',
      sessionName: `Sesi ${sessions.length + 1} (${today})`,
      namaUsaha: session?.namaUsaha || 'Ayam Geprek',
      alamat: session?.alamat || '',
      tanggal: today,
      hari: getDayName(today),
      jamMulai: getCurrentTimeString(false),
      jamSelesai: '15:00',
      pengamat1: session?.pengamat1 || '',
      pengamat2: session?.pengamat2 || '',
      pengamat3: session?.pengamat3 || '',
      cuacaKhusus: '',
      catatanIzin: session?.catatanIzin || '',
      createdAt: new Date().toISOString()
    });
    setIsCreatingNew(true);
  };

  const handleDeleteSession = async (id: string, name: string) => {
    if (sessions.length <= 1) {
      showNotification('error', 'Minimal harus ada 1 sesi observasi dalam sistem.');
      return;
    }
    if (window.confirm(`Yakin ingin menghapus sesi "${name}" beserta data terkaitnya?`)) {
      try {
        await db.sessions.delete(id);
        await db.orders.where('sessionId').equals(id).delete();
        await db.snapshots.where('sessionId').equals(id).delete();
        await db.resources.where('sessionId').equals(id).delete();
        await db.interviews.where('sessionId').equals(id).delete();
        // Hapus juga dari Supabase di background
        const client = getSupabaseClient();
        if (client) {
          client.from('observation_sessions').delete().eq('id', id);
          client.from('order_logs').delete().eq('session_id', id);
          client.from('queue_snapshots').delete().eq('session_id', id);
          client.from('resource_logs').delete().eq('session_id', id);
          client.from('interview_items').delete().eq('session_id', id);
        }
        onSessionDeleted(id);
        showNotification('success', `Sesi "${name}" berhasil dihapus.`);
      } catch (err: any) {
        showNotification('error', 'Gagal menghapus: ' + err.message);
      }
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-700" />
            <span>Identitas & Sesi Observasi</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Informasi lokasi, waktu, jadwal pengamat, dan manajemen beberapa sesi pengamatan
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {!isCreatingNew && (
            <button
              type="button"
              onClick={startCreateNew}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-1.5 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>+ Buat Sesi Baru</span>
            </button>
          )}
          {isCreatingNew && (
            <button
              type="button"
              onClick={() => {
                setIsCreatingNew(false);
                if (session) setFormData(session);
              }}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition"
            >
              Batal
            </button>
          )}
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                isCreatingNew
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : 'bg-blue-100 text-blue-800 border border-blue-200'
              }`}
            >
              {isCreatingNew ? 'Mode: Membuat Sesi Baru' : `Mengedit Sesi: ${session?.sessionName}`}
            </span>
          </div>
          <button
            type="submit"
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-600 active:bg-blue-800 text-white rounded-xl text-sm font-semibold shadow-md transition"
          >
            <Save className="w-4 h-4" />
            <span>{isCreatingNew ? 'Simpan Sesi Baru' : 'Perbarui Identitas'}</span>
          </button>
        </div>

        {/* Section 1: Informasi Sesi & Lokasi */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-500" />
            <span>Informasi Usaha & Sesi</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Sesi Observasi <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Sesi Siang (Jam Makan Siang Mahasiswa)"
                value={formData.sessionName}
                onChange={(e) => handleChange('sessionName', e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Usaha Ayam Geprek <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Ayam Geprek Juara Kampus"
                value={formData.namaUsaha}
                onChange={(e) => handleChange('namaUsaha', e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alamat / Lokasi Usaha
              </label>
              <input
                type="text"
                placeholder="Contoh: Jl. Diponegoro No. 45, Dekat Gerbang Utama Kampus"
                value={formData.alamat}
                onChange={(e) => handleChange('alamat', e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Jadwal & Waktu */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span>Jadwal & Waktu Observasi</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Observasi
              </label>
              <input
                type="date"
                value={formData.tanggal}
                onChange={(e) => handleChange('tanggal', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Hari</label>
              <input
                type="text"
                value={formData.hari}
                onChange={(e) => handleChange('hari', e.target.value)}
                placeholder="Senin, Selasa, dll."
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jam Mulai Observasi
              </label>
              <input
                type="time"
                value={formData.jamMulai}
                onChange={(e) => handleChange('jamMulai', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jam Selesai Observasi
              </label>
              <input
                type="time"
                value={formData.jamSelesai}
                onChange={(e) => handleChange('jamSelesai', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Nama Tiga Pengamat */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-slate-500" />
            <span>Anggota Kelompok Pengamat Lapangan</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Pengamat 1
              </label>
              <input
                type="text"
                placeholder="Pengamat 1 (misal: Ramdhan)"
                value={formData.pengamat1}
                onChange={(e) => handleChange('pengamat1', e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Pengamat 2
              </label>
              <input
                type="text"
                placeholder="Pengamat 2 (misal: Arifin)"
                value={formData.pengamat2}
                onChange={(e) => handleChange('pengamat2', e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Pengamat 3
              </label>
              <input
                type="text"
                placeholder="Pengamat 3 (misal: Nadia)"
                value={formData.pengamat3}
                onChange={(e) => handleChange('pengamat3', e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Kondisi Cuaca & Catatan Izin */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <CloudSun className="w-4 h-4 text-slate-500" />
            <span>Kondisi Lapangan & Catatan Izin</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kondisi Cuaca / Kejadian Khusus
              </label>
              <textarea
                rows={3}
                placeholder="Contoh: Hujan lebat pukul 12:30 menyebabkan lonjakan pesanan takeaway dan ojol..."
                value={formData.cuacaKhusus}
                onChange={(e) => handleChange('cuacaKhusus', e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Catatan Izin & Dokumentasi
              </label>
              <textarea
                rows={3}
                placeholder="Contoh: Izin disetujui lisan oleh pemilik, dokumentasi foto kasir dan dapur diizinkan..."
                value={formData.catatanIzin}
                onChange={(e) => handleChange('catatanIzin', e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </form>

      {/* Daftar Semua Sesi Observasi */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-700" />
          <span>Daftar Sesi Observasi Tersimpan ({sessions.length})</span>
        </h3>
        <div className="divide-y divide-slate-100">
          {sessions.map((s) => {
            const isCurrent = s.id === session?.id;
            return (
              <div
                key={s.id}
                className={`py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isCurrent ? 'bg-blue-50/50 -mx-4 px-4 rounded-xl' : ''
                }`}
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-sm text-slate-800">{s.sessionName}</span>
                    {isCurrent && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-700 text-white">
                        Aktif Sekarang
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {s.namaUsaha} • {s.tanggal} ({s.hari}) • {s.jamMulai} - {s.jamSelesai}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {!isCurrent && (
                    <button
                      type="button"
                      onClick={() => onSelectSession(s.id)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-800 rounded-lg text-xs font-semibold transition"
                    >
                      Pilih Sesi Ini
                    </button>
                  )}
                  {sessions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteSession(s.id, s.sessionName)}
                      title="Hapus sesi"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

